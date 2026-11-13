// Approximate contrast audit per palette × mode. axe marks most text "incomplete" because it sits over the fixed
// starfield canvas, so here every visible text element's computed colour (incl. alpha and the opacity chain) is
// blended over its real backdrop: the nearest ancestor with an opaque background if there is one, otherwise the
// theme's page background (--bg) AND the lightest tint we put under text (--signal at 8% over --bg); worst ratio wins.
// Handles color(srgb …) values produced by color-mix(). Known exception: the v1.2 ORACLE title uses background-clip text.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/');
const OUT = process.env.CONTRAST_OUT || '/workspace/oracle-qa/contrast.json';
const PALETTES = (process.env.PALETTES || 'observatory,sodium,spectral').split(','), MODES = ['dark', 'light'];
const b = await chromium.launch({ executablePath: (process.env.CHROME || '/usr/bin/google-chrome'), args: ['--no-sandbox'] });
const out = {};
const run = (page, rootSel) => page.evaluate((rootSel) => {
  const parse = c => {
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
    m = c.match(/^color\(srgb ([^)]+)\)/);
    if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] ?? 1 }; }
    return null;
  };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg, a) => ({ r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) });
  const root = getComputedStyle(document.documentElement);
  const hex = h => { h = h.trim(); const v = parseInt(h.slice(1), 16); return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }; };
  const BG = hex(root.getPropertyValue('--bg')), SIG = hex(root.getPropertyValue('--signal'));
  const pageBgs = [BG, blend(SIG, BG, 0.08)];
  const res = [];
  const walker = document.createTreeWalker(document.querySelector(rootSel), NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement; if (!el || seen.has(el) || !walker.currentNode.textContent.trim()) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || el.closest('.vh,[hidden],details:not([open]) dd')) continue;
    const r0 = el.getBoundingClientRect(); if (!r0.width) continue;
    let op = 1, backdrop = null;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n); op *= +s.opacity;
      if (!backdrop) { const bc = parse(s.backgroundColor); if (bc && bc.a >= 0.9) backdrop = bc; }
    }
    const fg = parse(cs.color); if (!fg) continue;
    const bgs = backdrop ? [backdrop] : pageBgs;
    const worst = Math.min(...bgs.map(bg => { const c = blend(fg, bg, fg.a * op); const L1 = lum(c), L2 = lum(bg); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }));
    const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    res.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), ratio: +worst.toFixed(2), need: large ? 3 : 4.5, size: cs.fontSize, text: walker.currentNode.textContent.trim().slice(0, 30) });
  }
  return res;
}, rootSel);
for (const pal of PALETTES) for (const mode of MODES) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: mode });
  const page = await ctx.newPage();
  const B = `${BASE}?palette=${pal}`;
  const key = `${pal}-${mode}`; out[key] = {};
  for (const [label, url, clicks] of [['approach', B, []], ['offer', B + '#offer', []], ['extraction', B + '#extraction', []], ['machine', B + '#machine', []], ['loop', B + '#loop', []], ['revelation', B + '#revelation', []], ['sources', B + '#offer', ['#btn-sources']], ['harvest', B + '#sensors', []], ['identity', B + '#protocol', ['#btn-crypto']]]) {
    await page.goto(url); await page.waitForTimeout(label === 'approach' ? 1000 : 450);
    for (const c of clicks) { await page.click(c); await page.waitForTimeout(300); }
    if (clicks.length) { await page.mouse.move(0, 0); await page.waitForTimeout(700); } // no hover state, finished fade-in
    await page.evaluate(() => document.querySelectorAll('#app details').forEach(d => { d.open = true; })); await page.waitForTimeout(150); // measure text inside expanders too
    const r = await run(page, label === 'sources' ? '#sources-drawer' : '#app');
    const fails = r.filter(x => x.ratio < x.need);
    out[key][label] = { elements: r.length, min: Math.min(...r.map(x => x.ratio)), failing: fails.length, samples: fails.slice(0, 6) };
  }
  await ctx.close();
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const summary = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([s, x]) => [s, `${x.failing} fail / ${x.elements}, min ${x.min}`]))]));
console.log(JSON.stringify(summary, null, 1));
for (const [k, v] of Object.entries(out)) for (const [s, x] of Object.entries(v)) if (x.failing) console.log('FAIL', k, s, JSON.stringify(x.samples));
await b.close();

// Approximate contrast audit: axe marks most text "incomplete" because it sits over the fixed starfield canvas.
// Here every visible text element's computed colour (incl. opacity chain) is blended over the darkest page background
// #020408 and over the lightest panel tint we use (rgba(0,229,255,.08) over #020408) and the worse ratio is reported.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = (process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/');
const b = await chromium.launch({ executablePath: (process.env.CHROME || '/usr/bin/google-chrome'), args: ['--no-sandbox'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const out = {};
const run = () => page.evaluate(() => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg, a) => ({ r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) });
  const bgs = [{ r: 2, g: 4, b: 8 }, blend({ r: 0, g: 229, b: 255 }, { r: 2, g: 4, b: 8 }, 0.08)];
  const res = [];
  const walker = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement; if (!el || seen.has(el) || !walker.currentNode.textContent.trim()) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || el.closest('.vh,[hidden],details:not([open]) dd')) continue;
    const r0 = el.getBoundingClientRect(); if (!r0.width) continue;
    let op = 1; for (let n = el; n && n !== document.body; n = n.parentElement) op *= +getComputedStyle(n).opacity;
    const fg = parse(cs.color); if (!fg) continue;
    if (el.matches('button[aria-pressed=true], .cat-btn[aria-selected=true], .phase-pip.on, .seg button[aria-pressed=true]')) continue; // filled states: dark text on light fill
    const worst = Math.min(...bgs.map(bg => { const c = blend(fg, bg, fg.a * op); const L1 = lum(c), L2 = lum(bg); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }));
    const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    res.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), ratio: +worst.toFixed(2), need: large ? 3 : 4.5, size: cs.fontSize, text: walker.currentNode.textContent.trim().slice(0, 30) });
  }
  return res;
});
for (const [label, url, clicks] of [['approach', BASE, []], ['offer', BASE + '#offer', []], ['extraction', BASE + '#extraction', []], ['machine', BASE + '#machine', []], ['loop', BASE + '#loop', []], ['revelation', BASE + '#revelation', []], ['harvest', BASE + '#protocol', ['#btn-crypto', '#btn-next', '.perm-explain summary']]]) {
  await page.goto(url); await page.waitForTimeout(500);
  for (const c of clicks) { await page.click(c); await page.waitForTimeout(300); }
  const r = await run();
  const fails = r.filter(x => x.ratio < x.need);
  out[label] = { elements: r.length, min: Math.min(...r.map(x => x.ratio)), failing: fails.length, samples: fails.slice(0, 6) };
}
fs.writeFileSync('/workspace/oracle-qa/contrast.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();

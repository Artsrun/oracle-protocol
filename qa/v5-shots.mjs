// v5 screenshots: every Device state per fixture, Night/Day, 390/1280, plus Reveal ring card, Artwork share modes and Options.
// Usage: OUT=/workspace/oracle-qa/v5/shots node v5-shots.mjs [fixture...]
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const FX = createRequire(import.meta.url)('./fixtures/devices.cjs');
const BASE = 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/workspace/oracle-qa/v5/shots'; fs.mkdirSync(OUT, { recursive: true });
const FIXES = process.argv.slice(2).length ? process.argv.slice(2) : ['pixel', 'iphone', 'windows', 'macff', 'brave', 'missing'];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const W = (ms) => new Promise(r => setTimeout(r, ms));
const log = [];
for (const fx of FIXES) for (const scheme of ['dark', 'light']) for (const w of [390, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 800 }, colorScheme: scheme, acceptDownloads: true });
  await ctx.addInitScript(FX.install, FX.PROFILES[fx]);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const tag = `${fx}-${scheme === 'dark' ? 'night' : 'day'}-${w}`; let n = 0;
  const shot = async (name) => { n++; await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2, '0')}-${name}.png` }); };
  const has = (s) => page.$(s).then(Boolean);
  try {
    await page.goto(BASE); await W(900);
    await page.click('#btn-begin'); await page.click('label[for=offer-0]'); await page.click('[data-goto=extraction]'); await page.click('[data-goto=device]'); await W(400);
    await shot('device-ask');
    await page.click('#dev-show'); await page.waitForSelector('#dev-next'); await W(400); await shot('device-readout');
    await page.click('#dev-ident'); await W(400); await shot('device-ident'); await page.keyboard.press('Escape'); await W(300);
    if (await has('[data-dev-info]')) { await page.click('[data-dev-info]'); await W(400); await shot('device-detail'); await page.keyboard.press('Escape'); await W(300); }
    await page.click('#dev-next'); await W(400);
    for (const c of ['tilt', 'loc', 'mic']) {
      if (!(await has('#perm-allow')) && !(await has('#perm-skip'))) break;
      await shot(`card-${c}-ask`);
      if (await has('#perm-allow')) { await page.click('#perm-allow'); await page.waitForSelector('#perm-next', { timeout: 15000 }); await W(500); await shot(`card-${c}-result`); await page.click('#perm-next'); }
      else await page.click('#perm-skip');
      await W(350);
    }
    // machine → loop → reveal
    if (await has('#card-skip')) { await page.click('#card-skip'); await W(250); }
    await page.click('label.radio-card:has([value=foryou])'); await page.click('[data-goto=reveal]'); await W(400);
    for (let i = 0; i < 5; i++) { await page.click('#card-next'); await W(150); }
    await shot('reveal-ring-card');
    await page.click('#card-next'); await W(1000); await shot('artwork-choices-only');
    await page.click('#rv-options'); await W(400); await shot('options');
    await page.click('label.radio-card:has([value=pattern])'); await W(700); await shot('options-pattern');
    await page.keyboard.press('Escape'); await W(400); await shot('artwork-with-pattern');
  } catch (e) { errs.push('SCRIPT ' + e.message.split('\n')[0]); await shot('error'); }
  log.push({ tag, shots: n, errs }); console.log(tag, n, errs.length ? errs : 'ok');
  await ctx.close();
}
// Brave/Firefox notes + legacy + simulator states (pixel only, night 390)
fs.writeFileSync(`${OUT}/shots.json`, JSON.stringify(log, null, 1));
await b.close();

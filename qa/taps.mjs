// v8 WP0: the shortest tap path from Start to the artwork, measured by walking the real UI (no answers changed).
// On each screen it taps, in order of preference: Begin, Skip, Next, See your artwork. Prints the path and count.
//   BASE=http://127.0.0.1:8765/oracle-protocol/ node taps.mjs            (exit 1 if MAX is set and exceeded)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/', MAX = +process.env.MAX || 0;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })).newPage();
await p.goto(BASE); await p.waitForTimeout(800);
const order = ['Begin', 'Skip', 'Next', 'See your artwork'];
const path = []; let taps = 0;
for (let i = 0; i < 14; i++) {
  const stage = await p.evaluate(() => state.stage); path.push(stage);
  if (stage === 'revelation') break;
  let hit = null;
  for (const t of order) {
    const l = p.locator('#app button:visible', { hasText: new RegExp('^\\s*' + t + '\\s*$') }).first();
    if (await l.count()) { await l.click(); hit = t; break; }
  }
  if (!hit) break;
  taps++; path.push('[' + hit + ']'); await p.waitForTimeout(450);
}
await b.close();
const ok = path[path.length - 1] === 'revelation' && (!MAX || taps <= MAX);
console.log(path.join(' '));
console.log(`taps: ${taps} from Start to the artwork${MAX ? ` (target ≤${MAX}) ${ok ? 'PASS' : 'FAIL'}` : ''}`);
process.exit(ok ? 0 : 1);

// v6 WP11: render the app icons once from the reference seed (static PNGs; run by hand, needs qa/node_modules).
//   cd qa && node ../tools/make-icons.mjs   (with the local server on 127.0.0.1:8765 or BASE=...)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = new URL('../icons/', import.meta.url);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ colorScheme: 'dark' })).newPage();
await p.goto(BASE + '?nosw=1&theme=dark'); await p.waitForFunction(() => window.OracleArt && window.OracleLayers && window.OracleExport);
for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) {
  const data = await p.evaluate((size) => {
    const EXAMPLE = { s: 'ORACLE-7K3F-Q9ZD', o: 21, f: 77, e: 90, r: 30, t: 60, k: 80, a: 80, n: 4 }; // the Start screen's example
    const big = document.createElement('canvas'); big.width = big.height = 1024;
    OracleArt.render(big.getContext('2d'), OracleLayers.compose(EXAMPLE, 1), 1024, 1024, { ...OracleExport.renderOpts(OracleExport.lookNow()), overlay: null });
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    // small sizes: crop to the core so the triangle reads at 32 px
    const crop = size <= 32 ? 0.42 : size <= 192 ? 0.72 : 0.86, s = 1024 * crop, o = (1024 - s) / 2;
    x.drawImage(big, o, o, s, s, 0, 0, size, size);
    return c.toDataURL('image/png').split(',')[1];
  }, size);
  fs.writeFileSync(new URL(name, OUT), Buffer.from(data, 'base64')); console.log('wrote icons/' + name);
}
await b.close();

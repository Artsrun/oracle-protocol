// Before/after comparison sheet for the simplification pass: BEFORE=dir AFTER=dir OUT=file.png node simplify-sheet.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const BEFORE = process.env.BEFORE || '/workspace/oracle-qa/simplify/before-full', AFTER = process.env.AFTER || '/workspace/oracle-qa/simplify/after';
const OUT = process.env.OUT || '/workspace/oracle-qa/simplify/compare-before-after.png';
const wb = JSON.parse(fs.readFileSync(`${BEFORE}/words.json`)), wa = JSON.parse(fs.readFileSync(`${AFTER}/words.json`));
const names = Object.keys(wa);
const img = (dir, n) => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, `${n}-desktop.png`)).toString('base64');
const pct = (a, b) => Math.round(100 * (a - b) / a);
const cell = (dir, n, w) => `<td><img src="${img(dir, n)}"><div class="m">${w[n].words} words on screen · ${w[n].controls} controls · ${w[n].height}px tall</div></td>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:#0b0f14;color:#dfe7ee;font:13px/1.4 system-ui,sans-serif}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#9fb0bf}
table{border-collapse:separate;border-spacing:10px 6px}th{font-weight:600;text-align:left;font-size:13px}th.r{writing-mode:vertical-rl;transform:rotate(180deg);color:#7fd8ff}
td{vertical-align:top;width:250px}img{width:250px;display:block;border:1px solid #233}.m{color:#9fb0bf;font-size:11px;margin-top:4px}.d{color:#6ee7a8;font-weight:600}</style>
<h1>Oracle Protocol · simplification pass (v2.2) · before vs after</h1>
<p>Desktop 1280px, Night, reduced motion, full page. Word count = visible copy in the chapter with expanders closed. Totals: ${Object.values(wb).reduce((s, v) => s + v.words, 0)} → ${Object.values(wa).reduce((s, v) => s + v.words, 0)} words on screen.</p>
<table><tr><th></th>${names.map(n => `<th>${n.replace(/^\d+-/, '')} <span class="d">−${pct(wb[n].words, wa[n].words)}%</span></th>`).join('')}</tr>
<tr><th class="r">BEFORE (ff86a74)</th>${names.map(n => cell(BEFORE, n, wb)).join('')}</tr>
<tr><th class="r">AFTER (oracle-v2)</th>${names.map(n => cell(AFTER, n, wa)).join('')}</tr></table>`;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const page = await (await b.newContext({ viewport: { width: 1960, height: 900 } })).newPage();
await page.setContent(html); await page.waitForTimeout(300);
await page.screenshot({ path: OUT, fullPage: true });
await b.close(); console.log(OUT);

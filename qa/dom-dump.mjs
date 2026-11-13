// Dump the rendered DOM of every screen (expanders opened) to OUT/*.html for HTML validation.
// Usage: OUT=/tmp/dom node dom-dump.mjs && npx html-validate OUT/*.html
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/tmp/dom';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const page = await (await b.newContext({ reducedMotion: 'reduce' })).newPage();
const screens = [['approach', ''], ['offer', '#offer'], ['extraction', '#extraction'], ['machine', '#machine'], ['loop', '#loop'], ['revelation', '#revelation'], ['sensors', '#sensors'], ['identity', '#protocol'], ['sources', '#offer']];
for (const [name, hash] of screens) {
  await page.goto(BASE + hash); await page.waitForTimeout(600);
  if (name === 'sources') { await page.click('#btn-sources'); await page.waitForTimeout(300); }
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  const html = '<!doctype html>\n' + await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(`${OUT}/${name}.html`, html);
}
await page.goto(BASE + '#sensors'); await page.waitForTimeout(400); await page.click('#btn-portrait'); await page.waitForTimeout(500);
fs.writeFileSync(`${OUT}/portrait.html`, '<!doctype html>\n' + await page.evaluate(() => document.documentElement.outerHTML));
await b.close();
console.log('dumped', fs.readdirSync(OUT).length);

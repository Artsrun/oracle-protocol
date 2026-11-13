import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:8766/oracle-protocol/';
const out = '/workspace/oracle-qa/shots/baseline';
const browser = await chromium.launch({ executablePath: (process.env.CHROME || '/usr/bin/google-chrome'), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); // no permissions granted -> denied path
const page = await ctx.newPage();
const errors = [], reqs = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('request', r => reqs.push(r.url()));
await page.goto(base); await page.waitForTimeout(800);
await page.screenshot({ path: out + '/01-approach.png' });
await page.click('#btn-enter'); await page.click('#btn-crypto'); await page.waitForTimeout(400);
await page.screenshot({ path: out + '/02-handshake.png' });
await page.click('#btn-next'); await page.waitForTimeout(300);
for (const id of ['gpu','cpu','net','base','bt','geo']) { await page.click(`[data-perm="${id}"]`); await page.waitForTimeout(400); }
await page.screenshot({ path: out + '/03-harvest.png', fullPage: true });
await page.click('#btn-portrait'); await page.waitForTimeout(400);
await page.screenshot({ path: out + '/04-portrait.png', fullPage: true });
const hash = await page.textContent('.identity-hash');
console.log(JSON.stringify({ hash, errors, external: [...new Set(reqs.filter(u => !u.startsWith('http://127.0.0.1')))] }, null, 1));
await browser.close();

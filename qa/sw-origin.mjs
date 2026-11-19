// v6 WP12: the service worker only ever touches the site's own origin.
// Records every request the page AND the service worker make (Playwright context events include SW fetches),
// through a first visit, an offline reload and a walk to the Artwork; then lists the SW cache keys.
// Run: BASE=http://127.0.0.1:8765/oracle-protocol/ node sw-origin.mjs   (exit 1 on any other origin)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const ORIGIN = new URL(BASE).origin;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ serviceWorkers: 'allow' });
const reqs = [];
ctx.on('request', (r) => reqs.push({ url: r.url(), sw: !!r.serviceWorker(), method: r.method() }));
const p = await ctx.newPage();
await p.goto(BASE);
await p.evaluate(() => navigator.serviceWorker.ready);
await p.waitForTimeout(1500);
const swReqs = reqs.filter((r) => r.sw).length;
await ctx.setOffline(true);
await p.reload();
await p.locator('#btn-begin').waitFor({ state: 'visible', timeout: 10000 });
await p.goto(BASE + '#revelation?s=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4');
await p.waitForTimeout(1500);
const offlineOk = await p.evaluate(() => !!document.querySelector('canvas'));
const keys = await p.evaluate(async () => { const out = []; for (const n of await caches.keys()) for (const r of await (await caches.open(n)).keys()) out.push(r.url); return out; });
await b.close();
const foreign = reqs.filter((r) => !r.url.startsWith(ORIGIN + '/') && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
const foreignKeys = keys.filter((k) => !k.startsWith(ORIGIN + '/'));
const nonGet = reqs.filter((r) => r.method !== 'GET');
console.log(JSON.stringify({ requests: reqs.length, fromServiceWorker: swReqs, cacheKeys: keys.length, offlineOk, foreign, foreignKeys, nonGet }, null, 1));
const ok = !foreign.length && !foreignKeys.length && !nonGet.length && swReqs > 0 && offlineOk;
console.log(ok ? 'sw-origin: PASS (every request and cache entry is ' + ORIGIN + ')' : 'sw-origin: FAIL');
process.exit(ok ? 0 : 1);

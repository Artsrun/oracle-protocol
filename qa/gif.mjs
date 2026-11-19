// v7 WP3: "Save the build" GIF — byte-identical per link in the QA browser (Chromium), ≤ 1 MB, plays once,
// carries the link in a Comment extension, no raw reading, zero outbound requests, timing (incl. 4× CPU throttle).
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome node gif.mjs [--record]
import { chromium } from 'playwright-core';
import crypto from 'node:crypto';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
// Default Options: "Title on the image" is on, so layered builds end with one title frame. Hashes recorded at v7 WP3.
const FIXTURES = {
  'v1 legacy': { q: FIXED, frames: 8, expect: { dark: 'fbdcfca79b84', light: '327bca72cb36' } },
  'v4 layered': { q: FIXED + '&v=2', frames: 6, expect: { dark: '425c97031ee6', light: 'b010c7ad3a33' } },
  'v5 ring withheld': { q: FIXED + '&v=3', frames: 7, expect: { dark: '0eee6658f91a', light: 'ff1179f0d0d9' } },
  'v5 ring pattern': { q: FIXED + '&v=3&dg=1a2b3c4d&db=N2M', frames: 7, expect: { dark: '8f23ad6a304d', light: '12da15d90ce5' } }
};
const RECORD = process.argv.includes('--record'), SAVE = process.env.SAVE_GIF || '';
const origin = new URL(BASE).origin;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const out = [], rec = {};
const check = (ok, msg) => { if (!ok) fails++; out.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
async function gifOf(page, throttle) {
  let cdp; if (throttle) { cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  const r = await page.evaluate(async () => {
    const t0 = performance.now(), prog = [];
    const g = await window.OracleExport.exportGif(OracleArt.normalize(OracleChapters.artParams()), (d, n) => prog.push(d + '/' + n));
    const ms = performance.now() - t0, u = new Uint8Array(await g.blob.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return { b64: btoa(s), ms, prog, name: g.name, frames: g.frames, type: g.blob.type, comments: OracleGif.readComments(u), raw: OraclePrivacy.findRaw(OracleGif.readComments(u).join(' '), OracleDevice.snapshot()).length };
  });
  if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return { ...r, bytes: Buffer.from(r.b64, 'base64') };
}
for (const [name, F] of Object.entries(FIXTURES)) for (const scheme of ['dark', 'light']) {
  const hashes = [];
  for (const dpr of [1, 3]) {
    const ctx = await b.newContext({ colorScheme: scheme, deviceScaleFactor: dpr, viewport: dpr === 1 ? { width: 1280, height: 860 } : { width: 390, height: 844 } });
    const page = await ctx.newPage(), outbound = [];
    page.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) outbound.push(r.url()); });
    await page.goto(BASE + '#revelation?' + F.q); await page.waitForTimeout(900);
    const g = await gifOf(page);
    const h = crypto.createHash('sha256').update(g.bytes).digest('hex').slice(0, 12); hashes.push(h);
    const tag = `${name.padEnd(16)} ${scheme} DPR${dpr}`;
    if (dpr === 1) {
      if (RECORD) rec[name] = { ...(rec[name] || {}), [scheme]: h };
      else check(h === F.expect[scheme], `${tag} hash ${h}${h === F.expect[scheme] ? '' : ' (expected ' + F.expect[scheme] + ')'}`);
      check(g.bytes.length <= 1024 * 1024, `${tag} size ${(g.bytes.length / 1024).toFixed(0)} KB ≤ 1024 KB; ${g.frames} frames; ${g.ms.toFixed(0)} ms`);
      check(g.frames === F.frames && g.prog.length === F.frames && g.prog.at(-1) === `${F.frames}/${F.frames}`, `${tag} ${g.frames} frames, progress ${g.prog.join(' ')}`);
      check(!g.bytes.includes(Buffer.from('NETSCAPE2.0')) && g.type === 'image/gif' && g.name === 'oracle-7k3f-q9zd-build-540x675.gif', `${tag} plays once, image/gif, ${g.name}`);
      const c = g.comments.join(' ');
      check(g.comments.length === 1 && c.startsWith('oracle:s=ORACLE-7K3F-Q9ZD') && c.includes(F.q.split('&').at(-1)) && g.raw === 0, `${tag} comment carries the link, 0 raw readings: ${c.slice(0, 60)}…`);
      if (SAVE && name === 'v5 ring pattern' && scheme === 'dark') fs.writeFileSync(SAVE, g.bytes);
      if (name === 'v4 layered' && scheme === 'dark') { const t = await gifOf(page, 4); out.push(`INFO  ${tag} 4× CPU throttle: ${t.ms.toFixed(0)} ms (target ≤ 3000 ms on a mid phone, SIMULATED)`); check(t.ms <= 3000, `${tag} 4× throttle ≤ 3000 ms`); }
    }
    check(outbound.length === 0, `${tag} zero outbound requests${outbound.length ? ': ' + outbound.join(', ') : ''}`);
    await ctx.close();
  }
  check(hashes[0] === hashes[1], `${name.padEnd(16)} ${scheme} same bytes at DPR1 and DPR3 (${hashes.join(' ')})`);
}
await b.close();
console.log(out.join('\n'));
if (RECORD) console.log('RECORD ' + JSON.stringify(rec));
console.log(`gif: ${out.filter(l => l.startsWith('PASS')).length}/${out.filter(l => !l.startsWith('INFO')).length} checks pass`);
process.exit(fails ? 1 : 0);

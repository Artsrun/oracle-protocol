// Fixed-reference determinism. Every shared link must export a byte-identical PNG forever, in every format, in Night
// and Day, at DPR 1 and DPR 3:
//   v1  — ORACLE-7K3F-Q9ZD as a legacy (pre-v4) link: legacy engine. Hashes recorded in the handover WP0 baseline.
//   v4  — the same answers as a v4 link (&v=2): layered engine. Hashes recorded at v5 WP0 from oracle-v4 @ bfce77a.
// Expected SHA-256 prefixes are documented in docs/QA.md and must never change.
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome node determinism.mjs
import { chromium } from 'playwright-core';
import crypto from 'node:crypto';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const FIXTURES = {
  'v1 legacy': { q: FIXED, expect: {
    dark: { portrait: 'd17be765a17c', story: 'df332b679c8d', square: '60b9ade83a84', hires: 'e69f044a2595' },
    light: { portrait: 'fb15f9591701', story: 'ed1d0299297d', square: '714d95327a57', hires: 'b263c13cec22' } } },
  'v4 layered': { q: FIXED + '&v=2', expect: {
    dark: { portrait: 'a71362dcf4cc', story: 'e61d200d0787', square: 'ca47ddb882da', hires: '8d60906c6cd0' },
    light: { portrait: 'f60fbd13ae48', story: '8cff23afd905', square: '700cd1aecb52', hires: 'c1bbda452b15' } } }
  ,
  // v5 engine 3: the five v4 layers + the fingerprint ring (withheld style without a pattern; drawn from dg + db with one)
  'v5 ring withheld': { q: FIXED + '&v=3', expect: {
    dark: { portrait: '71c09e2d8498', story: '49ac54ab1890', square: '68267f567074', hires: '96c7fca175e0' },
    light: { portrait: '83e3b730e7a6', story: 'ebc72f4f8028', square: '4f7c3959e8c7', hires: 'a010a31acb5e' } } },
  'v5 ring pattern': { q: FIXED + '&v=3&dg=1a2b3c4d&db=N2M', expect: {
    dark: { portrait: '5b95d5f5bfe1', story: '776109f6ee74', square: '482773955eb6', hires: '2acbd2f2a97c' },
    light: { portrait: '0b311f2dba28', story: '86d359b5f9af', square: '03f333720ccc', hires: '1b124c3188b1' } } }
  // @@V5_FIXTURES@@
};
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const out = [];
for (const [name, F] of Object.entries(FIXTURES)) for (const scheme of ['dark', 'light']) for (const dpr of [1, 3]) {
  const ctx = await b.newContext({ colorScheme: scheme, deviceScaleFactor: dpr, viewport: dpr === 1 ? { width: 1280, height: 860 } : { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '#revelation?' + F.q); await page.waitForTimeout(900);
  for (const fmt of Object.keys(F.expect[scheme])) {
    const b64 = await page.evaluate(async ([fmt]) => {
      const { blob } = await window.OracleExport.exportBlob(OracleArt.normalize(OracleChapters.artParams()), fmt);
      const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s);
    }, [fmt]);
    const h = crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').slice(0, 12);
    const ok = h === F.expect[scheme][fmt]; if (!ok) fails++;
    out.push(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(16)} ${scheme} DPR${dpr} ${fmt.padEnd(8)} ${h}${ok ? '' : ' (expected ' + F.expect[scheme][fmt] + ')'}`);
  }
  await ctx.close();
}
await b.close();
console.log(out.join('\n'));
console.log(`determinism: ${out.length - fails}/${out.length} byte-identical to the recorded reference`);
process.exit(fails ? 1 : 0);

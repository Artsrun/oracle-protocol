// Fixed-reference determinism: ORACLE-7K3F-Q9ZD (a legacy, pre-v4 link) must export byte-identical PNGs on the
// legacy engine in every format, in Night and Day, at DPR 1 and DPR 3. Expected SHA-256 prefixes were recorded in
// docs/QA.md (WP0 baseline of the handover pass) and must never change.
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome node determinism.mjs
import { chromium } from 'playwright-core';
import crypto from 'node:crypto';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const EXPECT = {
  dark: { portrait: 'd17be765a17c', story: 'df332b679c8d', square: '60b9ade83a84', hires: 'e69f044a2595' },
  light: { portrait: 'fb15f9591701', story: 'ed1d0299297d', square: '714d95327a57', hires: 'b263c13cec22' }
};
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const out = [];
for (const scheme of ['dark', 'light']) for (const dpr of [1, 3]) {
  const ctx = await b.newContext({ colorScheme: scheme, deviceScaleFactor: dpr, viewport: dpr === 1 ? { width: 1280, height: 860 } : { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '#revelation?' + FIXED); await page.waitForTimeout(900);
  for (const fmt of Object.keys(EXPECT[scheme])) {
    const b64 = await page.evaluate(async ([q, fmt]) => {
      const { blob } = await window.OracleExport.exportBlob(OracleArt.decode(q), fmt);
      const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s);
    }, [FIXED, fmt]);
    const h = crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').slice(0, 12);
    const ok = h === EXPECT[scheme][fmt]; if (!ok) fails++;
    out.push(`${ok ? 'PASS' : 'FAIL'}  ${scheme} DPR${dpr} ${fmt.padEnd(8)} ${h}${ok ? '' : ' (expected ' + EXPECT[scheme][fmt] + ')'}`);
  }
  await ctx.close();
}
await b.close();
console.log(out.join('\n'));
console.log(`determinism: ${out.length - fails}/${out.length} byte-identical to the recorded reference`);
process.exit(fails ? 1 : 0);

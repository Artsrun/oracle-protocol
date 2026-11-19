// v8 WP0: first-load bundle size — every same-origin file index.html references (scripts, styles, preloaded fonts,
// icons, manifest), raw and gzip, plus fonts.css font files. Node only; no browser.  node qa/bundle.mjs [--json]
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const refs = new Set(['index.html']);
for (const m of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) refs.add(m[1]);
const groups = { html: 0, js: 0, css: 0, font: 0, other: 0 }, gz = { ...groups };
for (const r of refs) {
  const f = path.join(ROOT, r); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) continue;
  const b = fs.readFileSync(f), g = zlib.gzipSync(b, { level: 9 }).length;
  const k = /\.js$/.test(r) ? 'js' : /\.css$/.test(r) ? 'css' : /\.woff2$/.test(r) ? 'font' : /\.html$/.test(r) ? 'html' : 'other';
  groups[k] += b.length; gz[k] += k === 'font' ? b.length : g;
}
const total = Object.values(groups).reduce((a, b) => a + b, 0), totalGz = Object.values(gz).reduce((a, b) => a + b, 0);
const out = { files: refs.size, raw: groups, gzip: gz, total, totalGz };
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else console.log(`bundle: ${refs.size} files, ${(total / 1024).toFixed(1)} KB raw, ${(totalGz / 1024).toFixed(1)} KB gzip (js ${(groups.js / 1024).toFixed(1)} KB / ${(gz.js / 1024).toFixed(1)} KB gz, css ${(groups.css / 1024).toFixed(1)} KB / ${(gz.css / 1024).toFixed(1)} KB gz)`);

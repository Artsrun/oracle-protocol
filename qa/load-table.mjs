// Prints load.json (from load.mjs) as a markdown table; with two files, prints before → after per cell.
//   node load-table.mjs /tmp/oracle-load/before/load.json [/tmp/oracle-load/after/load.json] [mobile|desktop]
import fs from 'node:fs';
const [a, b, view] = process.argv.slice(2).filter(x => x).reduce((acc, x) => (/^(mobile|desktop)$/.test(x) ? acc[2] = x : acc[acc[0] ? 1 : 0] = x, acc), [null, null, null]);
const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = b ? JSON.parse(fs.readFileSync(b, 'utf8')) : null;
const cols = [['words', 'Words'], ['controls', 'Controls'], ['chromeControls', 'App-bar controls'], ['disclosures', 'Disclosures'], ['under44', 'Targets < 44 px'],
  ['fontSizes', 'Font sizes (px)'], ['smallestPx', 'Smallest px'], ['caps', 'Uppercase labels'], ['appbarPx', 'App bar px'], ['viewports', 'Page length (viewports)']];
console.log('| Screen | ' + cols.map(c => c[1]).join(' | ') + ' |');
console.log('|---|' + cols.map(() => '---').join('|') + '|');
for (const k of Object.keys(A)) {
  if (view && !k.endsWith(view)) continue;
  const cell = (c) => { const x = A[k][c]; if (!B || !B[k]) return x; const y = B[k][c]; return String(x) === String(y) ? String(x) : `${x} → **${y}**`; };
  console.log(`| ${k} | ` + cols.map(([c]) => cell(c)).join(' | ') + ' |');
}

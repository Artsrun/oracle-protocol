// v4 core: state reducer, link parsing, router, components. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../art/oracle-art.js');
const C = require('../data/content.js');
const S = require('../core/state.js');
const R = require('../core/router.js');
const UI = require('../ui/components.js');

const deps = { deriveEx: C.deriveEx, prefill: S.prefillFootprint };
const store = () => S.create(S.initial(), deps);

test('initial state is the new engine (v5: engine 3) with nothing chosen', () => {
  const s = S.initial();
  assert.equal(s.engine, 3); assert.equal(s.offers, 0); assert.equal(s.footprint, 0); assert.equal(s.feed, null);
});

test('trade toggle flips one bit and re-derives the abstract dials', () => {
  const st = store();
  st.dispatch({ type: 'trade/toggle', i: 0 });
  assert.equal(st.get().offers, 1);
  assert.deepEqual(st.get().ex, C.deriveEx(1));
  st.dispatch({ type: 'trade/toggle', i: 0 });
  assert.equal(st.get().offers, 0);
});

test('footprint is pre-filled from trades until the visitor edits it', () => {
  const st = store();
  st.dispatch({ type: 'trade/toggle', i: 0 });          // social apps
  st.dispatch({ type: 'footprint/prefill' });
  const pre = st.get().footprint;
  assert.ok(pre > 0, 'prefill sets bits');
  assert.equal(pre, S.prefillFootprint(1));
  st.dispatch({ type: 'footprint/toggle', i: 7 });
  assert.equal(st.get().footprintEdited, true);
  st.dispatch({ type: 'trade/toggle', i: 2 });
  st.dispatch({ type: 'footprint/prefill' });
  assert.equal(st.get().footprint, pre ^ (1 << 7), 'an edited footprint is never overwritten');
});

test('trade→footprint ids match data/content.js', () => {
  assert.deepEqual(S.OFFER_IDS, C.OFFERS.map(o => o.id));
  assert.deepEqual(S.FOOTPRINT_IDS, C.FOOTPRINT.map(f => f.id));
});

test('every trade maps to at least one footprint kind (labelled as our assumption)', () => {
  for (let i = 0; i < C.OFFERS.length; i++) assert.ok(S.prefillFootprint(1 << i) > 0, C.OFFERS[i].id);
  assert.equal(S.prefillFootprint(0), 0);
});

test('feed pick applies the preset; tuning away from it clears the pick', () => {
  const st = store();
  st.dispatch({ type: 'feed/pick', id: 'engaging' });
  assert.equal(st.get().feed, 'engaging');
  assert.equal(st.get().lab.e, S.PRESETS.engaging.e);
  st.dispatch({ type: 'tune/set', key: 'e', value: 10 });
  assert.equal(st.get().feed, null);
  st.dispatch({ type: 'tune/set', key: 'e', value: S.PRESETS.engaging.e });
  assert.equal(st.get().feed, 'engaging');
});

test('rounds clamp to 0..12', () => {
  const st = store();
  for (let i = 0; i < 20; i++) st.dispatch({ type: 'rounds/run', k: 1 });
  assert.equal(st.get().lab.n, 12);
  st.dispatch({ type: 'rounds/reset' });
  assert.equal(st.get().lab.n, 0);
});

test('subscribers are called on change only', () => {
  const st = store(); let calls = 0;
  st.subscribe(() => calls++);
  st.dispatch({ type: 'format/set', format: 'story' });
  st.dispatch({ type: 'format/set', format: 'story' });
  assert.equal(calls, 1);
});

test('links: v=2 selects the new engine; links without it stay on the legacy engine', () => {
  const p = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
  const old = S.parseHash('#revelation?' + p, A.decode, {});
  assert.equal(old.engine, 1);
  const neu = S.parseHash('#revelation?' + p + '&v=2', A.decode, {});
  assert.equal(neu.engine, 2);
  assert.equal(neu.params.s, 'ORACLE-7K3F-Q9ZD');
  assert.deepEqual(S.parseHash('#offer', A.decode, {}), { route: 'offer' });
});

test('toParams round-trips through the link encoding', () => {
  const st = store();
  st.dispatch({ type: 'seed/set', seed: 'ORACLE-ABCD-EFGH' });
  st.dispatch({ type: 'trade/toggle', i: 3 });
  const p = S.toParams(st.get());
  assert.deepEqual(A.decode(A.encode(p)), A.normalize(p));
});

test('router: one ordered list drives the flow and the 6-step progress (v5: Device is step 3)', () => {
  assert.deepEqual(R.FLOW.slice(0, 6), ['approach', 'offer', 'extraction', 'device', 'machine', 'loop']);
  assert.equal(R.next('extraction'), 'device'); assert.equal(R.prev('machine'), 'device'); assert.equal(R.progress('device').step, 3);
  assert.equal(R.next('offer'), 'extraction');
  assert.equal(R.prev('offer'), 'approach');
  assert.equal(R.progress('loop').step, 5);
  assert.equal(R.progress('loop').total, 6);
  assert.equal(R.byRoute('sensors').id, 'device'); assert.equal(R.byRoute('protocol').id, 'device'); assert.equal(R.byRoute('portrait').id, 'device');
  const ids = R.SCREENS.map(s => s.id); assert.equal(new Set(ids).size, ids.length, 'unique ids');
});

test('components: native controls, labelled, no inline handlers', () => {
  const html = UI.checkList({ name: 'offer', legend: 'Q', items: [{ title: 'A', sub: 'b', on: true, info: true }, { title: 'C' }] }) +
    UI.radioCards({ name: 'feed', legend: 'Q', items: [{ id: 'x', title: 'X' }], value: 'x' }) + UI.progress(2, 5, 'Footprint');
  assert.match(html, /<fieldset/); assert.match(html, /<legend/);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 2);
  assert.equal((html.match(/<label for="offer-\d"/g) || []).length, 2);
  assert.match(html, /type="radio"[^>]*checked/);
  assert.match(html, /aria-valuenow="2"/);
  assert.doesNotMatch(html, /\son[a-z]+=/i, 'no inline handlers (CSP)');
  assert.equal(UI.esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

test('toy ranker reproduces the handover values (top-3 share, round 0 → 4)', () => {
  const K = require('../core/ranker.js');
  const pct = (L, n) => Math.round(K.after({ ...L, n }).top3 * 100);
  const want = { newest: [46, 46], foryou: [42, 48], engaging: [69, 92] };
  for (const [id, [a, b]] of Object.entries(want)) {
    assert.equal(pct(S.PRESETS[id], 0), a, id + ' round 0');
    assert.equal(pct(S.PRESETS[id], 4), b, id + ' round 4');
  }
});

test('v5: parseHash reads v=3 and a valid device pattern only; v=2 and plain links unchanged', () => {
  const S = require('../core/state.js'), dec = require('../art/oracle-art.js').decode;
  const q = 's=ORACLE-7K3F-Q9ZD&o=21&f=77';
  assert.equal(S.parseHash('#revelation?' + q, dec).engine, 1);
  assert.equal(S.parseHash('#revelation?' + q + '&v=2', dec).engine, 2);
  assert.equal(S.parseHash('#revelation?' + q + '&v=2', dec).device, undefined);
  const r = S.parseHash('#art?' + q + '&v=3&dg=1a2b3c4d&db=N2M&fmt=square', dec);
  assert.equal(r.engine, 3); assert.deepEqual(r.device, { dg: '1a2b3c4d', db: 'N2M' }); assert.equal(r.fmt, 'square');
  assert.equal(S.parseHash('#art?' + q + '&v=3&dg=1a2b3c4d&db=N2', dec).device, null);
  assert.equal(S.parseHash('#art?' + q + '&v=3', dec).device, null);
});

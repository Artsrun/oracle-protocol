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

test('initial state is the new engine with nothing chosen', () => {
  const s = S.initial();
  assert.equal(s.engine, 2); assert.equal(s.offers, 0); assert.equal(s.footprint, 0); assert.equal(s.feed, null);
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

test('router: one ordered list drives the flow and the 5-step progress', () => {
  assert.deepEqual(R.FLOW.slice(0, 5), ['approach', 'offer', 'extraction', 'machine', 'loop']);
  assert.equal(R.next('offer'), 'extraction');
  assert.equal(R.prev('offer'), 'approach');
  assert.equal(R.progress('loop').step, 4);
  assert.equal(R.progress('loop').total, 5);
  assert.equal(R.byRoute('sensors').id, 'permissions');
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

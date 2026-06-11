'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const dd = require(path.resolve(__dirname, '..', 'lib', 'index.js'));
const clean = () => { for (const k of ['polluted','pp2']) delete Object.prototype[k]; };

test('CVE-2021-25944: __proto__ payload must not pollute', () => {
  clean();
  dd({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'));
  assert.strictEqual(({}).polluted, undefined);
  clean();
});
test('constructor.prototype payload must not pollute', () => {
  clean();
  dd({}, JSON.parse('{"constructor":{"prototype":{"pp2":"yes"}}}'));
  assert.strictEqual(({}).pp2, undefined);
  clean();
});
test('legitimate deep defaults preserved', () => {
  const out = dd({ a: 1, n: { x: 1 } }, { a: 9, b: 2, n: { x: 9, y: 3 } });
  assert.deepStrictEqual(out, { a: 1, b: 2, n: { x: 1, y: 3 } });
});

// Behavior preservation — ported from the upstream mocha suite (which no longer
// runs on modern Node). Confirms the patch changes nothing for legitimate input.
test('upstream behavior cases preserved', () => {
  const cases = [
    [{}, {}, {}], [{}, { a: 1 }, { a: 1 }], [{ a: 1 }, { a: 1 }, { a: 1 }],
    [{ a: 2 }, { a: 1 }, { a: 2 }], [{ a: 2 }, { a: null }, { a: 2 }],
    [{ a: {} }, { a: 1 }, { a: {} }],
    [{ a: { b: 1 } }, { a: { b: 2, c: 3 } }, { a: { b: 1, c: 3 } }],
    [{ a: 1, b: 2 }, { b: 3, c: 4 }, { a: 1, b: 2, c: 4 }],
  ];
  for (const [d, s, e] of cases) {
    assert.deepStrictEqual(dd(JSON.parse(JSON.stringify(d)), s), e);
  }
});

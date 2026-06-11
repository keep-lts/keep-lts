'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const u = require(path.resolve(__dirname, '..', 'index.js'));
const clean = () => { for (const k of ['p1','p2']) delete Object.prototype[k]; };

test('CVE-2024-57077: extend __proto__ payload must not pollute', () => {
  clean(); u.extend({}, JSON.parse('{"__proto__":{"p1":"yes"}}'));
  assert.strictEqual(({}).p1, undefined); clean();
});
test('extend constructor.prototype payload must not pollute', () => {
  clean(); u.extend({}, JSON.parse('{"constructor":{"prototype":{"p2":"yes"}}}'));
  assert.strictEqual(({}).p2, undefined); clean();
});
// behavior preservation
test('legitimate deep extend still merges', () => {
  const out = u.extend({ a: { k1: 'v1' } }, { a: { k2: 'v2' }, b: 2 });
  assert.deepStrictEqual(out, { a: { k1: 'v1', k2: 'v2' }, b: 2 });
});
test('legitimate array extend still works', () => {
  const out = u.extend({ arr: [] }, { arr: [1, 2] });
  assert.deepStrictEqual(out.arr, [1, 2]);
});
test('multi-source extend wrapper still works', () => {
  const out = u.extend({}, { a: 1 }, { b: 2 });
  assert.deepStrictEqual(out, { a: 1, b: 2 });
});

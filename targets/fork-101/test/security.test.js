'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const base = path.resolve(__dirname, '..');
const set = require(base + '/set.js');
const put = require(base + '/put.js');
const clean = () => { for (const k of ['p1','p2','p3','p4','p5']) delete Object.prototype[k]; };

test('CVE-2021-25943: set(obj, "__proto__.x", v) must not pollute', () => {
  clean(); set({}, '__proto__.p1', 'x'); assert.strictEqual(({}).p1, undefined); clean();
});
test('set(obj, "constructor.prototype.x", v) must not pollute', () => {
  clean(); set({}, 'constructor.prototype.p2', 'x'); assert.strictEqual(({}).p2, undefined); clean();
});
test('set(key, val) 2-arg partial form must not pollute on build', () => {
  clean(); const fn = set('__proto__.p3', 'x'); fn({}); assert.strictEqual(({}).p3, undefined); clean();
});
test('put(obj, "__proto__.x", v) must not pollute', () => {
  clean(); put({}, '__proto__.p4', 'x'); assert.strictEqual(({}).p4, undefined); clean();
});
test('bracket-notation __proto__ must not pollute', () => {
  clean(); set({}, "a['__proto__'].p5", 'x'); assert.strictEqual(({}).p5, undefined); clean();
});

// behavior preservation
test('legitimate set: flat key', () => {
  assert.deepStrictEqual(set({}, 'a', 1), { a: 1 });
});
test('legitimate set: nested keypath', () => {
  assert.deepStrictEqual(set({}, 'a.b.c', 5), { a: { b: { c: 5 } } });
});
test('legitimate set: keys named like-but-not prototype slots still work', () => {
  assert.deepStrictEqual(set({}, 'constructorName', 'x'), { constructorName: 'x' });
  assert.deepStrictEqual(set({}, 'a.prototypeId', 7), { a: { prototypeId: 7 } });
});
test('legitimate put is immutable and sets value', () => {
  const o = { a: 1 }; const r = put(o, 'b.c', 2);
  assert.deepStrictEqual(r, { a: 1, b: { c: 2 } });
  assert.deepStrictEqual(o, { a: 1 }); // original untouched
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const csvjson = require(path.resolve(__dirname, '..', 'index.js'));
const clean = () => { for (const k of ['p1','p2','p3']) delete Object.prototype[k]; };

test('CVE-2025-57318: __proto__.x header must not pollute', () => {
  clean(); csvjson.toSchemaObject('__proto__.p1\nyes'); assert.strictEqual(({}).p1, undefined); clean();
});
test('constructor.prototype.x header must not pollute', () => {
  clean(); csvjson.toSchemaObject('constructor.prototype.p2\nyes'); assert.strictEqual(({}).p2, undefined); clean();
});
test('__proto__[] header must not pollute or throw', () => {
  clean();
  assert.doesNotThrow(() => csvjson.toSchemaObject('__proto__[]\nyes'));
  assert.strictEqual(({}).p3, undefined); clean();
});
// behavior preservation
test('legitimate nested schema still builds', () => {
  const out = csvjson.toSchemaObject('name.first,name.last\nJohn,Doe');
  assert.deepStrictEqual(out, [{ name: { first: 'John', last: 'Doe' } }]);
});
test('legitimate flat schema still builds', () => {
  const out = csvjson.toSchemaObject('a,b\n1,2');
  assert.deepStrictEqual(out, [{ a: '1', b: '2' }]);
});
test('header containing but not equal to a reserved word still works', () => {
  const out = csvjson.toSchemaObject('constructorName,prototypeId\nx,7');
  assert.deepStrictEqual(out, [{ constructorName: 'x', prototypeId: '7' }]);
});

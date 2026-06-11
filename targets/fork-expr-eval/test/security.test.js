'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { Parser } = require(path.resolve(__dirname, '..', 'dist', 'bundle.js'));
const parser = new Parser();

test('CVE-2025-13204: __proto__ member access is blocked', () => {
  assert.throws(() => parser.evaluate('foo.__proto__', { foo: {} }), /forbidden/);
});
test('CVE-2025-12735: prototype member access is blocked', () => {
  assert.throws(() => parser.evaluate('foo.prototype', { foo: {} }), /forbidden/);
});
test('constructor member access is blocked', () => {
  // either rejected by the grammar or by the guard — must not return a function
  let result;
  try { result = parser.evaluate('foo.constructor', { foo: {} }); }
  catch (e) { return; /* blocked */ }
  assert.notStrictEqual(typeof result, 'function');
});
test('a __proto__ access cannot reach Object.prototype', () => {
  let r; try { r = parser.evaluate('foo.__proto__', { foo: {} }); } catch (e) { r = undefined; }
  assert.notStrictEqual(r, Object.prototype);
});
// behavior preservation
test('legitimate member access works', () => {
  assert.strictEqual(parser.evaluate('foo.bar', { foo: { bar: 42 } }), 42);
});
test('legitimate arithmetic works', () => {
  assert.strictEqual(parser.evaluate('2 * (3 + x)', { x: 4 }), 14);
});
test('legitimate builtins work', () => {
  assert.strictEqual(parser.evaluate('sqrt(16) + max(1,2,3)', {}), 7);
});
test('member named like-but-not a reserved word works', () => {
  assert.strictEqual(parser.evaluate('foo.constructorName', { foo: { constructorName: 9 } }), 9);
});

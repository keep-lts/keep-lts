'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const defaultsDeep = require(path.resolve(__dirname, '..', 'index.js'));

function clean() { for (const k of ['polluted','pp2','pp3']) delete Object.prototype[k]; }

test('CVE-2018-16486: constructor.prototype payload must not pollute', () => {
  clean();
  defaultsDeep({}, JSON.parse('{"constructor":{"prototype":{"polluted":"yes"}}}'));
  assert.strictEqual(({}).polluted, undefined);
  clean();
});

test('__proto__ payload must not pollute', () => {
  clean();
  defaultsDeep({}, JSON.parse('{"__proto__":{"pp2":"yes"}}'));
  assert.strictEqual(({}).pp2, undefined);
  clean();
});

test('legitimate deep defaults still work', () => {
  const out = defaultsDeep({ a: 1, nested: { x: 1 } }, { a: 9, b: 2, nested: { x: 9, y: 3 } });
  assert.deepStrictEqual(out, { a: 1, b: 2, nested: { x: 1, y: 3 } });
});

test('a key literally named "constructor" as data is dropped (acceptable, safe)', () => {
  clean();
  const out = defaultsDeep({}, { constructor: { prototype: { polluted: 'x' } } });
  assert.strictEqual(({}).polluted, undefined);
  assert.ok(!Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'));
  clean();
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const Parser = require(path.resolve(__dirname, '..', 'lib', 'parser.js'));
const createObjectPath = Parser.prototype._createObjectPath;
const pathToObject = Parser.prototype._pathToObject;
const clean = () => { for (const k of ['p1','p2','p3']) delete Object.prototype[k]; };

test('CVE-2025-13158: __proto__ path segment must not pollute', () => {
  clean(); const root = {};
  createObjectPath(root, 'group.__proto__.p1', 'insert');
  Object.assign(pathToObject('group.__proto__.p1', root) || {}, { p1: 'yes' });
  assert.strictEqual(({}).p1, undefined); clean();
});
test('constructor.prototype path segment must not pollute', () => {
  clean(); const root = {};
  createObjectPath(root, 'a.constructor.prototype.p2', 'insert');
  Object.assign(pathToObject('a.constructor.prototype.p2', root) || {}, { p2: 'yes' });
  assert.strictEqual(({}).p2, undefined); clean();
});
// behavior preservation
test('legitimate nested path is still created and resolvable', () => {
  const root = {};
  const leaf = createObjectPath(root, 'local.parameter.fields', 'insert');
  leaf.Parameter = [{ field: 'id' }];
  assert.deepStrictEqual(root, { local: { parameter: { fields: { Parameter: [{ field: 'id' }] } } } });
  assert.strictEqual(pathToObject('local.parameter.fields', root).Parameter[0].field, 'id');
});
test('push attachMethod still creates an array leaf', () => {
  const root = {};
  const leaf = createObjectPath(root, 'x.y', 'push');
  assert.ok(Array.isArray(leaf));
});
test('segment that merely contains a reserved word still works', () => {
  const root = {};
  createObjectPath(root, 'group.constructorName', 'insert');
  assert.ok(root.group && Object.prototype.hasOwnProperty.call(root.group, 'constructorName'));
});

'use strict';
const { test, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const parse = require('..');

const fixture = name => path.join(os.tmpdir(), name);
afterEach(() => { delete Object.prototype.isPolluted; delete Object.prototype.polluted; });

test('CVE-2025-25975: expandKeys must not pollute via __proto__ section name', () => {
  parse.expandKeys({ '__proto__ "isPolluted"': true });
  assert.strictEqual(({}).isPolluted, undefined, 'Object.prototype was polluted');
});

test('expandKeys must not pollute via constructor section name', () => {
  parse.expandKeys({ 'constructor "polluted"': true });
  assert.strictEqual(({}).polluted, undefined);
});

test('expandKeys must not manipulate prototype via __proto__ subsection name', () => {
  const out = parse.expandKeys({ 'foo "__proto__"': { isPolluted: true } });
  assert.strictEqual(({}).isPolluted, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(out, 'foo'), false);
});

test('legitimate ini-style keys still expand correctly', () => {
  const out = parse.expandKeys({
    'foo "bar"': { doStuff: true },
    'foo "baz"': { doStuff: true }
  });
  assert.deepStrictEqual(out, { foo: { bar: { doStuff: true }, baz: { doStuff: true } } });
});

test('end-to-end: parsing a malicious .gitconfig file does not pollute', () => {
  const fp = fixture('_malicious_gitconfig');
  fs.writeFileSync(fp, '[__proto__ "isPolluted"]\n  value = true\n');
  parse.sync({ path: fp, expandKeys: true });
  assert.strictEqual(({}).isPolluted, undefined, 'prototype polluted through file parse path');
  fs.unlinkSync(fp);
});

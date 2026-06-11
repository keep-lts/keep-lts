'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { minify } = require(path.resolve(__dirname, '..', 'src', 'htmlminifier.js'));

test('CVE-2022-37620: long whitespace run does not cause catastrophic backtracking', () => {
  const evil = 'x' + ' '.repeat(200000) + '!';
  const t0 = Date.now();
  minify(evil);
  const ms = Date.now() - t0;
  assert.ok(ms < 2000, `minify took ${ms}ms (expected < 2000ms; ReDoS not fixed?)`);
});

test('CVE-2022-37620: pathological conditional-comment input is fast', () => {
  const evil = '<!--[if ' + ' '.repeat(120000) + ']>';
  const t0 = Date.now();
  try { minify(evil, { processConditionalComments: true }); } catch (e) {}
  assert.ok(Date.now() - t0 < 2000);
});

// behavior preservation
test('basic minification works', () => {
  assert.strictEqual(minify('<p>  hello  </p>', { collapseWhitespace: true }), '<p>hello</p>');
});
test('ignored custom fragments are preserved', () => {
  assert.strictEqual(
    minify('<div>  <% code %>  </div>', { collapseWhitespace: true }),
    '<div> <% code %> </div>');
});
test('multiple fragments and whitespace collapse between them', () => {
  assert.strictEqual(
    minify('<p>a <% one %>   <% two %> b</p>', { collapseWhitespace: true }),
    '<p>a <% one %> <% two %> b</p>');
});
test('php-style fragments preserved', () => {
  assert.strictEqual(minify('<a href="<?= $url ?>">x</a>'), '<a href="<?= $url ?>">x</a>');
});
test('comment removal still works', () => {
  assert.strictEqual(minify('<!-- c --><b>x</b>', { removeComments: true }), '<b>x</b>');
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const urlRegex = require(path.resolve(__dirname, '..', 'index.js'));

test('CVE-2020-7661: pathological host input does not hang (ReDoS)', () => {
  const re = urlRegex({ exact: true });
  const evil = 'http://' + 'a'.repeat(200000) + '!';
  const t0 = Date.now();
  re.test(evil);
  const ms = Date.now() - t0;
  assert.ok(ms < 1000, `match took ${ms}ms (expected < 1000ms; ReDoS not fixed?)`);
});

test('behavior: matches valid URLs (exact)', () => {
  const re = urlRegex({ exact: true });
  for (const u of ['http://example.com', 'https://www.example.com/path?q=1',
    'http://sub.domain.co.uk', 'http://a-b.com', 'http://a--b.co', 'http://a_b.example.org',
    'http://1.2.3.4', 'http://localhost', 'http://xn--80ak6aa92e.com', 'http://h.com:65535/p#frag']) {
    assert.ok(re.test(u), `should match ${u}`);
  }
});

test('behavior: rejects non-URLs (exact)', () => {
  const re = urlRegex({ exact: true });
  for (const s of ['not a url', 'http://-bad.com', 'plain text', 'http://.com', 'http://a..b.com']) {
    assert.ok(!re.test(s), `should NOT match ${s}`);
  }
});

test('behavior: extracts embedded URLs (non-exact, global)', () => {
  const matches = 'see http://embedded.com here and www.foo.com too'.match(urlRegex());
  assert.deepStrictEqual(matches, ['http://embedded.com', 'www.foo.com']);
});

test('behavior: non-strict mode still works', () => {
  const re = urlRegex({ strict: false, exact: true });
  assert.ok(re.test('example.com'));
  assert.ok(re.test('foo.org/path'));
});

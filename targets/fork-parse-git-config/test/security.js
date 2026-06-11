'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const parse = require('..');

const fixture = name => path.join(os.tmpdir(), name);

describe('security: CVE-2025-25975 prototype pollution', function() {
  afterEach(() => {
    // ensure no test leaves the prototype dirty for the next
    delete Object.prototype.isPolluted;
    delete Object.prototype.polluted;
  });

  it('expandKeys must not pollute via __proto__ section name', function() {
    parse.expandKeys({ '__proto__ "isPolluted"': true });
    assert.strictEqual(({}).isPolluted, undefined, 'Object.prototype was polluted');
  });

  it('expandKeys must not pollute via constructor section name', function() {
    parse.expandKeys({ 'constructor "polluted"': true });
    assert.strictEqual(({}).polluted, undefined);
  });

  it('expandKeys must not manipulate prototype via __proto__ subsection name', function() {
    const out = parse.expandKeys({ 'foo "__proto__"': { isPolluted: true } });
    assert.strictEqual(({}).isPolluted, undefined);
    // the dangerous key is dropped, so no own "foo" object is created from it
    assert.strictEqual(Object.prototype.hasOwnProperty.call(out, 'foo'), false);
  });

  it('legitimate ini-style keys still expand correctly', function() {
    const out = parse.expandKeys({
      'foo "bar"': { doStuff: true },
      'foo "baz"': { doStuff: true }
    });
    assert.deepStrictEqual(out, { foo: { bar: { doStuff: true }, baz: { doStuff: true } } });
  });

  it('end-to-end: parsing a malicious .gitconfig file does not pollute', function() {
    const fp = fixture('_malicious_gitconfig');
    fs.writeFileSync(fp, '[__proto__ "isPolluted"]\n  value = true\n');
    parse.sync({ path: fp, expandKeys: true });
    assert.strictEqual(({}).isPolluted, undefined, 'prototype polluted through file parse path');
    fs.unlinkSync(fp);
  });
});

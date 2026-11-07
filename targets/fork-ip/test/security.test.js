'use strict';
// Keep LTS security + behaviour tests for ip (CVE-2024-29415).
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const ip = require(process.env.IP_IMPL || path.resolve(__dirname, '..', 'lib', 'ip.js'));
const original = require('./fixtures/ip-2.0.1.js');

// Every one of these is loopback, private, link-local or "this host" — none
// may ever be reported as public. The first six are from the CVE text.
const NOT_PUBLIC = [
  '127.1', '01200034567', '012.1.2.3', '000:0:0000::01', '::fFFf:127.0.0.1',
  '::ffff:7f00:1', '017700000001', '0177.0.0.1', '0x7f.0.0.1', '0x7f000001', '127.0.0.255',
  '0.0.0.0', '0', '0.1.2.3',
  '::FFFF:10.0.0.1', '::ffff:a00:1', '10.1', '012.0.0.1',
  '::ffff:a9fe:a9fe', '0xa9.0xfe.0xa9.0xfe', '2852039166', '169.254.169.254',
  '::ffff:c0a8:101', '192.168.257', '0xc0.0xa8.1.1',
  '::ffff:ac10:1', '172.16.0.1', '172.31.255.255',
  '0:0:0:0:0:0:0:1', '::0001', '0::0', '::',
  'fe80::1%eth0', 'FE80::ABCD', 'febf::1', 'fd00::1', 'FC00::1',
];

test('CVE-2024-29415: alternative spellings of private addresses are not public', () => {
  for (const a of NOT_PUBLIC) {
    assert.strictEqual(ip.isPublic(a), false, `${a} must not be public`);
    assert.strictEqual(ip.isPrivate(a), true, `${a} must be private`);
  }
});

test('CVE-2024-29415: every spelling of 127.0.0.1 is loopback', () => {
  for (const a of ['127.0.0.1', '127.1', '127.0.1', '2130706433', '017700000001',
    '0x7f.1', '0x7f000001', '0177.0.0.1', '::ffff:127.0.0.1', '::FFFF:127.0.0.1',
    '::ffff:7f00:1', '0:0:0:0:0:ffff:7f00:0001', '::1', '000:0:0000::01']) {
    assert.strictEqual(ip.isLoopback(a), true, `${a} must be loopback`);
  }
});

test('public addresses stay public in every spelling', () => {
  for (const a of ['8.8.8.8', '0x8.0x8.0x8.0x8', '134744072', '::ffff:8.8.8.8',
    '::ffff:808:808', '1.2.3.4', '2001:4860:4860::8888', '2606:4700::1111', '172.32.0.1',
    '192.169.0.1', '11.0.0.1', '126.255.255.255', '128.0.0.1']) {
    assert.strictEqual(ip.isPublic(a), true, `${a} should be public`);
    assert.strictEqual(ip.isLoopback(a), false, `${a} should not be loopback`);
  }
});

test('behavior: canonical addresses classify exactly as in 2.0.1', () => {
  // 20,000 random dotted-quad IPv4 addresses (skipping 0.0.0.0/8, which is now
  // deliberately private) plus their ::ffff: forms, and a set of canonical IPv6.
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed >>> 24; };
  const inputs = [];
  for (let i = 0; i < 20000; i++) {
    const o = [rnd(), rnd(), rnd(), rnd()];
    if (o[0] === 0) continue;
    if (i % 7 === 0) o[0] = [10, 127, 169, 172, 192][i % 5];
    if (i % 11 === 0) o[1] = [16, 31, 168, 254, 15, 32][i % 6];
    const a = o.join('.');
    inputs.push(a, `::ffff:${a}`);
  }
  inputs.push('::1', '::', 'fe80::1', 'fe80::abcd', 'fc00::1', 'fd12:3456::1',
    '2001:db8::1', '2001:4860:4860::8888', 'ff02::1');
  for (const a of inputs) {
    assert.strictEqual(ip.isPrivate(a), original.isPrivate(a), `isPrivate(${a})`);
    assert.strictEqual(ip.isLoopback(a), original.isLoopback(a), `isLoopback(${a})`);
  }
});

test('behavior: invalid input behaves exactly as in 2.0.1', () => {
  const run = (m, a) => { try { return m.isPrivate(a); } catch (e) { return `throws: ${e.message}`; } };
  for (const a of ['', 'localhost', '1.2.3.4.5', '256.1.1.1', '08.1.1.1', 'not an ip', '1.2.3']) {
    assert.strictEqual(run(ip, a), run(original, a), `isPrivate(${JSON.stringify(a)})`);
  }
  assert.throws(() => ip.isPrivate('localhost'), /invalid ipv4 address/);
});

test('behavior: the rest of the API is unchanged', () => {
  assert.strictEqual(ip.toString(ip.toBuffer('127.0.0.1')), '127.0.0.1');
  assert.strictEqual(ip.mask('192.168.1.134', '255.255.255.0'), '192.168.1.0');
  assert.strictEqual(ip.cidr('192.168.1.134/26'), '192.168.1.128');
  assert.strictEqual(ip.subnet('192.168.1.134', '255.255.255.192').broadcastAddress, '192.168.1.191');
  assert.strictEqual(ip.isEqual('::ffff:127.0.0.1', '127.0.0.1'), true);
  assert.strictEqual(ip.toLong('127.0.0.1'), 2130706433);
  assert.strictEqual(ip.fromLong(2130706433), '127.0.0.1');
  assert.strictEqual(ip.loopback('ipv6'), 'fe80::1');
  assert.strictEqual(ip.isV4Format('127.0.0.1'), true);
  assert.strictEqual(ip.isV6Format('::ffff:127.0.0.1'), true);
  assert.strictEqual(typeof ip.address(), 'string');
});

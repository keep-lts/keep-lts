'use strict'
// Keep LTS security + behaviour tests for extract-zip.
// Zips are built in memory (stored, uncompressed) so malicious archives are
// readable here instead of opaque binary fixtures, and no extra deps are needed.
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const extract = require(process.env.EXTRACT_ZIP_IMPL || path.resolve(__dirname, '..', 'index.js'))

const FILE = 0o100644
const DIR = 0o040755
const LINK = 0o120777

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32 (buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// entries: [{ name, data?, mode? }]
function buildZip (entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const e of entries) {
    const name = Buffer.from(e.name)
    const data = Buffer.from(e.data || '')
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0x21, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE((3 << 8) | 20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0x21, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(((e.mode || FILE) << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, data)
    centrals.push(central, name)
    offset += local.length + name.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, end])
}

// A fresh sandbox: <tmp>/target is the extraction dir, <tmp>/outside.txt is a
// file the archive must never touch.
function sandbox (entries) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'keeplts-ez-')))
  const dir = path.join(root, 'target')
  const outside = path.join(root, 'outside.txt')
  fs.mkdirSync(dir)
  fs.writeFileSync(outside, 'original')
  const zip = path.join(root, 'a.zip')
  fs.writeFileSync(zip, buildZip(entries))
  return { root, dir, outside, zip }
}

const isLink = p => { try { return fs.lstatSync(p).isSymbolicLink() } catch { return false } }
const posixOnly = { skip: process.platform === 'win32' && 'symlinks need privileges on Windows' }

// --- CVE-2026-56876: symlink targets must stay inside the target dir ---

test('CVE-2026-56876: relative symlink escaping the target dir is rejected', posixOnly, async () => {
  const s = sandbox([{ name: 'evil', data: '../outside.txt', mode: LINK }])
  await assert.rejects(extract(s.zip, { dir: s.dir }), /Out of bound symlink target/)
  assert.ok(!isLink(path.join(s.dir, 'evil')), 'escaping symlink must not be created')
})

test('CVE-2026-56876: absolute symlink target is rejected', posixOnly, async () => {
  const s = sandbox([{ name: 'evil', data: '/etc/passwd', mode: LINK }])
  await assert.rejects(extract(s.zip, { dir: s.dir }), /Out of bound symlink target/)
  assert.ok(!isLink(path.join(s.dir, 'evil')))
})

test('CVE-2026-56876 + CVE-2026-19693: symlink then same-name file cannot write outside', posixOnly, async () => {
  // The exact archive from the CVE-2026-19693 advisory.
  const s = sandbox([
    { name: 'evil', data: '../outside.txt', mode: LINK },
    { name: 'evil', data: 'pwned' }
  ])
  await assert.rejects(extract(s.zip, { dir: s.dir }))
  assert.strictEqual(fs.readFileSync(s.outside, 'utf8'), 'original')
})

// --- CVE-2026-19693: never write through a symlink at the destination ---

test('CVE-2026-19693: a pre-existing symlink at a file path is replaced, not written through', posixOnly, async () => {
  const s = sandbox([{ name: 'x', data: 'from zip' }])
  fs.symlinkSync(s.outside, path.join(s.dir, 'x')) // planted before extraction
  await extract(s.zip, { dir: s.dir })
  assert.strictEqual(fs.readFileSync(s.outside, 'utf8'), 'original')
  assert.ok(!isLink(path.join(s.dir, 'x')))
  assert.strictEqual(fs.readFileSync(path.join(s.dir, 'x'), 'utf8'), 'from zip')
})

// --- Bypasses of a purely textual containment check (found while patching) ---

test('bypass: link via a self-pointing symlinked directory is rejected', posixOnly, async () => {
  // d -> "." makes target/d === target, so d/l -> "../outside.txt" really
  // points at <tmp>/outside.txt even though it looks like target/outside.txt.
  const s = sandbox([
    { name: 'd', data: '.', mode: LINK },
    { name: 'd/l', data: '../outside.txt', mode: LINK },
    { name: 'd/l', data: 'pwned' }
  ])
  await assert.rejects(extract(s.zip, { dir: s.dir }), /Out of bound symlink target/)
  assert.strictEqual(fs.readFileSync(s.outside, 'utf8'), 'original')
})

test('bypass: ".." after a symlinked segment in a link target is rejected', posixOnly, async () => {
  // y -> "." and l -> "y/../outside.txt": the OS follows y first, then "..".
  const s = sandbox([
    { name: 'y', data: '.', mode: LINK },
    { name: 'l', data: 'y/../outside.txt', mode: LINK },
    { name: 'l', data: 'pwned' }
  ])
  await assert.rejects(extract(s.zip, { dir: s.dir }), /Out of bound symlink target/)
  assert.strictEqual(fs.readFileSync(s.outside, 'utf8'), 'original')
})

test('bypass: link approved before its middle segment becomes a symlink is rejected', posixOnly, async () => {
  const s = sandbox([
    { name: 'l', data: 'z/../outside.txt', mode: LINK },
    { name: 'z', data: '.', mode: LINK },
    { name: 'l', data: 'pwned' }
  ])
  await assert.rejects(extract(s.zip, { dir: s.dir }), /Out of bound symlink target/)
  assert.strictEqual(fs.readFileSync(s.outside, 'utf8'), 'original')
})

test('entry names with ".." are still rejected (zip slip)', async () => {
  const s = sandbox([{ name: '../outside.txt', data: 'pwned' }])
  await assert.rejects(extract(s.zip, { dir: s.dir }))
  assert.strictEqual(fs.readFileSync(s.outside, 'utf8'), 'original')
})

// --- Behaviour preserved ---

test('behavior: files, nested dirs and contents extract as before', async () => {
  const s = sandbox([
    { name: 'a.txt', data: 'A' },
    { name: 'sub/', mode: DIR },
    { name: 'sub/b.txt', data: 'B' },
    { name: 'deep/er/c.txt', data: 'C' }
  ])
  await extract(s.zip, { dir: s.dir })
  assert.strictEqual(fs.readFileSync(path.join(s.dir, 'a.txt'), 'utf8'), 'A')
  assert.strictEqual(fs.readFileSync(path.join(s.dir, 'sub/b.txt'), 'utf8'), 'B')
  assert.strictEqual(fs.readFileSync(path.join(s.dir, 'deep/er/c.txt'), 'utf8'), 'C')
})

test('behavior: symlinks that stay inside the target dir still work', posixOnly, async () => {
  // Like macOS .app / framework bundles: relative links within the archive.
  const s = sandbox([
    { name: 'Versions/A/lib.txt', data: 'lib' },
    { name: 'Versions/Current', data: 'A', mode: LINK },
    { name: 'lib.txt', data: 'Versions/Current/lib.txt', mode: LINK },
    { name: 'sub/up', data: '../Versions/A/lib.txt', mode: LINK },
    { name: 'self', data: '.', mode: LINK }
  ])
  await extract(s.zip, { dir: s.dir })
  assert.strictEqual(fs.readlinkSync(path.join(s.dir, 'Versions/Current')), 'A')
  assert.strictEqual(fs.readFileSync(path.join(s.dir, 'lib.txt'), 'utf8'), 'lib')
  assert.strictEqual(fs.readFileSync(path.join(s.dir, 'sub/up'), 'utf8'), 'lib')
})

test('behavior: file modes from the archive are applied', { skip: process.platform === 'win32' }, async () => {
  const s = sandbox([{ name: 'run.sh', data: '#!/bin/sh', mode: 0o100755 }])
  await extract(s.zip, { dir: s.dir })
  assert.strictEqual(fs.statSync(path.join(s.dir, 'run.sh')).mode & 0o777, 0o755)
})

test('behavior: __MACOSX entries are skipped and onEntry is called', async () => {
  const seen = []
  const s = sandbox([{ name: '__MACOSX/._a', data: 'x' }, { name: 'a', data: 'A' }])
  await extract(s.zip, { dir: s.dir, onEntry: e => seen.push(e.fileName) })
  assert.ok(!fs.existsSync(path.join(s.dir, '__MACOSX')))
  assert.deepStrictEqual(seen, ['a'])
})

test('behavior: relative target directory is rejected', async () => {
  const s = sandbox([{ name: 'a', data: 'A' }])
  await assert.rejects(extract(s.zip, { dir: 'relative/dir' }), /expected to be absolute/)
})

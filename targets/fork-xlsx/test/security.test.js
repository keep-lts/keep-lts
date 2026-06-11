'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require(path.resolve(__dirname, '..', 'xlsx.js'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-sec-'));

/* ---- helpers: build a minimal stored-ZIP xlsx with a chosen core.xml ---- */
function crc32(buf){ let c=~0; for(let i=0;i<buf.length;i++){ c^=buf[i]; for(let k=0;k<8;k++) c=(c>>>1)^(0xEDB88320&-(c&1)); } return ~c>>>0; }
function zip(entries){
  const locals=[], central=[]; let off=0;
  for(const e of entries){
    const name=Buffer.from(e.name), data=Buffer.from(e.data), crc=crc32(data);
    const lh=Buffer.alloc(30); lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt32LE(crc,14);
    lh.writeUInt32LE(data.length,18); lh.writeUInt32LE(data.length,22); lh.writeUInt16LE(name.length,26);
    locals.push(lh,name,data);
    const ch=Buffer.alloc(46); ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6);
    ch.writeUInt32LE(crc,16); ch.writeUInt32LE(data.length,20); ch.writeUInt32LE(data.length,24);
    ch.writeUInt16LE(name.length,28); ch.writeUInt32LE(off,42);
    central.push(ch,name); off+=lh.length+name.length+data.length;
  }
  const cdStart=off; let cdLen=0; for(const b of central) cdLen+=b.length;
  const eocd=Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(entries.length,8);
  eocd.writeUInt16LE(entries.length,10); eocd.writeUInt32LE(cdLen,12); eocd.writeUInt32LE(cdStart,16);
  return Buffer.concat([...locals,...central,eocd]);
}
function xlsxWithCore(coreXml){
  return zip([
    {name:'[Content_Types].xml', data:'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'},
    {name:'_rels/.rels', data:'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
    {name:'docProps/core.xml', data:coreXml},
    {name:'xl/workbook.xml', data:'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels', data:'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'},
    {name:'xl/worksheets/sheet1.xml', data:'<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'},
  ]);
}

/* ================= CVE-2023-30533: prototype pollution ================= */
test('CVE-2023-30533: reading the real malicious threaded-comments file does not pollute', () => {
  const before = Object.getOwnPropertyNames(Object.prototype).length;
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'threaded_comment_bad.xlsx'));
  try { XLSX.read(buf, { type: 'buffer' }); } catch (e) {}
  assert.strictEqual(({}).c, undefined, 'Object.prototype.c was polluted');
  assert.strictEqual(Object.getOwnPropertyNames(Object.prototype).length, before, 'Object.prototype gained a property');
});

/* ================= CVE-2024-22363: core-props ReDoS ================= */
test('CVE-2024-22363: a crafted docProps/core.xml does not cause catastrophic backtracking', () => {
  const evilCore = '<?xml version="1.0"?><cp:coreProperties xmlns:cp="x" xmlns:dcterms="y">' + '<dcterms:created>'.repeat(128000);
  const buf = xlsxWithCore(evilCore);
  const t0 = Date.now();
  try { XLSX.read(buf, { type: 'buffer' }); } catch (e) {}
  const ms = Date.now() - t0;
  // unpatched 0.18.5 takes ~50s; patched ~20ms. Generous bound that still catches the ReDoS.
  assert.ok(ms < 3000, 'read took ' + ms + 'ms (expected < 3000ms; ReDoS not fixed?)');
});

/* ================= behavior preservation ================= */
test('legitimate xlsx round-trips: data and Props preserved', () => {
  const ws = XLSX.utils.aoa_to_sheet([['Name','Qty','Price'],['Apple',5,1.25],['Banana',12,0.4]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fruits');
  wb.Props = { Title: 'Inventory', Author: 'Keep Test', Subject: 'Demo' };
  const file = path.join(tmp, 'legit.xlsx');
  XLSX.writeFile(wb, file);
  const rt = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(rt.Sheets[rt.SheetNames[0]]);
  assert.deepStrictEqual(rows, [{Name:'Apple',Qty:5,Price:1.25},{Name:'Banana',Qty:12,Price:0.4}]);
  assert.strictEqual(rt.Props.Title, 'Inventory');
  assert.strictEqual(rt.Props.Author, 'Keep Test');
});

test('legitimate core.xml props still parse correctly after the ReDoS fix', () => {
  const core = '<?xml version="1.0"?><cp:coreProperties xmlns:cp="x" xmlns:dc="d" xmlns:dcterms="t"><dc:creator>Jane Doe</dc:creator><dc:title>Quarterly Report</dc:title><dcterms:created>2024-01-15T00:00:00Z</dcterms:created></cp:coreProperties>';
  const wb = XLSX.read(xlsxWithCore(core), { type: 'buffer' });
  assert.strictEqual(wb.Props.Author, 'Jane Doe');
  assert.strictEqual(wb.Props.Title, 'Quarterly Report');
});

test('round-trips across xls and csv formats', () => {
  const ws = XLSX.utils.aoa_to_sheet([['a','b'],[1,2],[3,4]]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'S');
  for (const type of ['xls','biff8','csv']) {
    const out = XLSX.write(wb, { type:'buffer', bookType: type==='biff8'?'xls':type });
    const rt = XLSX.read(out, { type:'buffer' });
    const back = XLSX.utils.sheet_to_json(rt.Sheets[rt.SheetNames[0]], {header:1});
    assert.deepStrictEqual(back.slice(0,3), [['a','b'],[1,2],[3,4]]);
  }
});

/* ============ ESM build (xlsx.mjs) must carry the same fixes ============ */
test('ESM build (xlsx.mjs) is patched against both CVEs', async () => {
  const mod = await import(path.resolve(__dirname, '..', 'xlsx.mjs'));
  const ESM = mod.default || mod;
  // prototype pollution
  const before = Object.getOwnPropertyNames(Object.prototype).length;
  const bad = fs.readFileSync(path.join(__dirname, 'fixtures', 'threaded_comment_bad.xlsx'));
  try { ESM.read(bad, { type: 'buffer' }); } catch (e) {}
  assert.strictEqual(({}).c, undefined, 'ESM build polluted Object.prototype');
  assert.strictEqual(Object.getOwnPropertyNames(Object.prototype).length, before);
  // ReDoS
  const evilCore = '<?xml version="1.0"?><cp:coreProperties xmlns:cp="x" xmlns:dcterms="y">' + '<dcterms:created>'.repeat(128000);
  const t0 = Date.now();
  try { ESM.read(xlsxWithCore(evilCore), { type: 'buffer' }); } catch (e) {}
  assert.ok(Date.now() - t0 < 3000, 'ESM build still ReDoS-vulnerable');
});

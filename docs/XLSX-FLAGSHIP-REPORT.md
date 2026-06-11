# Flagship milestone — `xlsx` (SheetJS) — build report

*Completed 2026-06-11. Scope doc: [../targets/XLSX-FLAGSHIP-SCOPE.md](../targets/XLSX-FLAGSHIP-SCOPE.md).*

## Result: `@keep-lts/xlsx@0.18.6` — publish-ready, 5/5 tests, both CVEs fixed end-to-end

The single highest-value target in the pool is done. npm's `xlsx@0.18.5` (10.5M downloads/week)
is the last version SheetJS published to the registry; their fixes ship only via
`cdn.sheetjs.com`. This fork back-ports both onto the frozen 0.18.5 baseline.

| CVE | Type | Reproduced | Fix (ported from) | Verified |
|---|---|---|---|---|
| **CVE-2023-30533** | Prototype pollution (CWE-1321) | Real PoC file `threaded_comment_bad.xlsx` sets `Object.prototype.c` on read | One-line guard in `sheet_insert_comments` (SheetJS 0.19.3) | Pollutes on 0.18.5, clean on patch ✓ |
| **CVE-2024-22363** | ReDoS (CWE-1333) | Crafted `docProps/core.xml` → **49.8 s** to read a 2.2 MB file | indexOf-based `str_match_xml` replacing a backtracking regex in `parse_core_props` (SheetJS 0.20.2) | **49,782 ms → 17 ms** on patch ✓ |

## How the fixes were found (the rigorous part)

Public advisories were thin on specifics, so the fixes were pinned down authoritatively:

- **Prototype pollution:** located the real public PoC (`BenEdridge/CVE-2023-30533`), pulled
  the actual 8.8 KB malicious file, and **reproduced the pollution end-to-end** (`Object.prototype.c`
  gets set). Then diffed SheetJS **0.19.2 → 0.19.3** to isolate the exact upstream fix — a single
  line, `if(r.r < 0 || r.c < 0) return;`, in `sheet_insert_comments`. A `__proto__` comment ref
  decodes to negative coordinates, so the guard skips it before `sheet["__proto__"]` (=
  `Object.prototype`) is touched. Ported verbatim.
- **ReDoS:** diffed SheetJS **0.20.1 → 0.20.2**, found the regex XML-scanner replaced by an
  indexOf-based `str_match_xml`, traced the vulnerable regex to `parse_core_props`, and **reproduced
  catastrophic backtracking** — 4× input size → ~16× time (quadratic), a 2.2 MB file taking ~50 s.
  Ported the `str_match_xml` helper and rewired `parse_core_props` to it.

## Verification (beyond "tests pass")

- **Security tests fail on the original, pass on the patch** — the pollution and ReDoS tests both
  go red on 0.18.5 and green on 0.18.6; behavior tests stay green on both.
- **Cross-version parse equivalence:** a corpus of legitimate workbooks (xlsx/xlsb/xls/ods/fods,
  with unicode, dates, special characters, and core properties) parses **10/10 byte-for-byte
  identically** on patched vs original 0.18.5 — proving the read-path edits change nothing for
  legitimate files.
- **End-to-end through the real `XLSX.read` API**, not just the isolated regex.
- **Both shipped builds patched:** `xlsx.js` (CommonJS `main`) *and* `xlsx.mjs` (ESM `module`,
  used by bundlers/Deno). A near-miss — the ESM build was initially unpatched; the committed
  suite now imports and verifies it too, so an ESM consumer can't silently get vulnerable code.

## Packaging notes (Apache-2.0)

- LICENSE preserved; added a **NOTICE** crediting SheetJS LLC and stating the changes (Apache §4(b)).
- README banner is explicit that this is **unofficial, not affiliated with SheetJS**, explains the
  npm-frozen situation, and points users to `sheetjs.com` for ongoing support.
- Changed regions carry `CVE-...` comments. Drop-in via `overrides`; no API change.
- Removed the upstream `pretest`/`lint`/`build` scripts (they need the full SheetJS toolchain) so
  `npm test` runs the security suite cleanly.

## What needs the principal

Same boundary as the rest: register the scope, create the repo, `npm publish`. Because this is the
highest-scrutiny package, **publish with provenance/signing from CI** — its authenticity will be
checked hardest. Given SheetJS's deliberate exit from npm, the README's "not affiliated, use SheetJS
for support" framing should stay prominent.

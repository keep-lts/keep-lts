# Changelog

Security-maintained fork of [`xlsx`](https://www.npmjs.com/package/xlsx).
Only security and compatibility fixes are applied; the public API is unchanged.

## [0.18.6] — 2026-06-11

### Security
- **Fix CVE-2023-30533 / CVE-2024-22363 / GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9 (High, CWE-1321 Prototype Pollution / CWE-1333 ReDoS).** npm's `xlsx@0.18.5` is the last version SheetJS published to the registry; later fixed releases ship only via cdn.sheetjs.com. This fork ports two upstream fixes: a guard in `sheet_insert_comments` rejecting comment refs that decode to negative coordinates (CVE-2023-30533, from 0.19.3), and an indexOf-based core-property scanner replacing a backtracking regex (CVE-2024-22363, from 0.20.2).
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `xlsx@0.18.5`.

---

Based on `xlsx` by sheetjs (Apache-2.0).

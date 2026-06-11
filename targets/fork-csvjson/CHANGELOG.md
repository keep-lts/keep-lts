# Changelog

Security-maintained fork of [`csvjson`](https://www.npmjs.com/package/csvjson).
Only security and compatibility fixes are applied; the public API is unchanged.

## [5.1.1] — 2026-06-11

### Security
- **Fix CVE-2025-57318 / GHSA-xq4f-3jxp-qv6m (High, CWE-1321 Prototype Pollution).** `toSchemaObject` builds nested objects from CSV header names via `addDataInSchema` with no guard on reserved keys; a header like `__proto__.x` or `constructor.prototype.x` mutated Object.prototype. Headers whose dotted/bracketed segments name a prototype slot are now rejected.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `csvjson@5.1.0`.

---

Based on `csvjson` by Pradeep Mishra (MIT).

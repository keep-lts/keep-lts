# Changelog

Security-maintained fork of [`101`](https://www.npmjs.com/package/101).
Only security and compatibility fixes are applied; the public API is unchanged.

## [1.6.4] — 2026-06-11

### Security
- **Fix CVE-2021-25943 / GHSA-cwcx-rxgc-cmw3 (Critical, CWE-1321 Prototype Pollution).** `set` and `put` passed user-supplied keypaths directly to keypather, which walks `__proto__`/`constructor`/`prototype` segments. All keypather writes now go through a guard that rejects keypaths targeting a prototype slot.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `101@1.6.3`.

---

Based on `101` by Tejesh Mehta (MIT).

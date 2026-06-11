# Changelog

Security-maintained fork of [`utils-extend`](https://www.npmjs.com/package/utils-extend).
Only security and compatibility fixes are applied; the public API is unchanged.

## [1.0.9] — 2026-06-11

### Security
- **Fix CVE-2024-57077 / CVE-2020-8147 / GHSA-7qgg-vw88-cc99 / GHSA-6pq3-928q-x6w6 (Critical, CWE-1321 Prototype Pollution).** The recursive `extend` merged source keys with no guard on reserved property names; a `__proto__` key recursed into and polluted Object.prototype. The merge loop now skips `__proto__`, `constructor`, and `prototype`.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `utils-extend@1.0.8`.

---

Based on `utils-extend` by douzi <liaowei08@gmail.com> (ISC).

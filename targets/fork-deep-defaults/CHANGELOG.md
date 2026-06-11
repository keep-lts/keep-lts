# Changelog

Security-maintained fork of [`deep-defaults`](https://www.npmjs.com/package/deep-defaults).
Only security and compatibility fixes are applied; the public API is unchanged.

## [1.0.6] — 2026-06-11

### Security
- **Fix CVE-2021-25944 / GHSA-h6xg-rg33-9mf4 (Critical, CWE-1321 Prototype Pollution).** The recursive merge had no guard on reserved keys; a `__proto__` key in the source recursed into and polluted `Object.prototype`. The merge now skips `__proto__`, `constructor`, and `prototype`.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `deep-defaults@1.0.5`.

---

Based on `deep-defaults` by Daniel Kang (MIT).

# Changelog

Security-maintained fork of [`defaults-deep`](https://www.npmjs.com/package/defaults-deep).
Only security and compatibility fixes are applied; the public API is unchanged.

## [0.2.5] — 2026-06-11

### Security
- **Fix CVE-2018-16486 / GHSA-pjxw-22xf-6pwc (Critical, CWE-1321 Prototype Pollution).** The original guard blocked only `__proto__`, leaving the `constructor.prototype` walk reachable. The merge loop now skips `__proto__`, `constructor`, and `prototype` keys.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `defaults-deep@0.2.4`.

---

Based on `defaults-deep` by Jon Schlinkert (https://github.com/jonschlinkert) (MIT).

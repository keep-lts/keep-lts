# Changelog

Security-maintained fork of [`url-regex`](https://www.npmjs.com/package/url-regex).
Only security and compatibility fixes are applied; the public API is unchanged.

## [5.0.1] — 2026-06-11

### Security
- **Fix CVE-2020-7661 / GHSA-v4rh-8p82-6h5w (High, CWE-1333 Inefficient Regular Expression Complexity (ReDoS)).** The generated URL regex used host/domain sub-patterns of the form `(?:X[-_]*)*X+`, whose nested quantifiers backtrack catastrophically. They are rewritten to the equivalent, unambiguous `X+(?:[-_]+X+)*`, which matches the identical language in linear time.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `url-regex@5.0.0`.

---

Based on `url-regex` by Kevin Mårtensson (MIT).

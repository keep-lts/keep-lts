# Changelog

Security-maintained fork of [`html-minifier`](https://www.npmjs.com/package/html-minifier).
Only security and compatibility fixes are applied; the public API is unchanged.

## [4.0.1] — 2026-06-11

### Security
- **Fix CVE-2022-37620 / GHSA-pfq8-rq6v-vf5m (High, CWE-1333 Inefficient Regular Expression Complexity (ReDoS)).** The `reCustomIgnore` regex `\s*(?:<%...%>|<?...?>)+\s*` had an unbounded leading `\s*` that backtracks catastrophically on long whitespace runs not followed by a fragment. Bounding only the leading whitespace to 100 characters makes matching linear; output is identical for all realistic input (verified by a 75-case cross-version equivalence test).
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `html-minifier@4.0.0`.

---

Based on `html-minifier` by Juriy "kangax" Zaytsev (MIT).

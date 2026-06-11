# Changelog

Security-maintained fork of [`apidoc-core`](https://www.npmjs.com/package/apidoc-core).
Only security and compatibility fixes are applied; the public API is unchanged.

## [0.15.1] — 2026-06-11

### Security
- **Fix CVE-2025-13158 / CVE-2025-57317 / GHSA-6vj3-p34w-xxjp / GHSA-5q53-78f2-6gf8 (Critical, CWE-1321 Prototype Pollution).** The parser builds nested result objects from dotted paths derived from doc-block annotations (including user-controlled group names) via `_createObjectPath`/`_pathToObject`, with no guard on reserved segments; a `__proto__` or `constructor.prototype` segment caused Object.prototype to be extended. Both functions now refuse to traverse or build through a prototype slot.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `apidoc-core@0.15.0`.

---

Based on `apidoc-core` by Peter Rottmann <rottmann@inveris.de> (MIT).

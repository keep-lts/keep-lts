# Changelog

Security-maintained fork of [`expr-eval`](https://www.npmjs.com/package/expr-eval).
Only security and compatibility fixes are applied; the public API is unchanged.

## [2.0.3] — 2026-06-11

### Security
- **Fix CVE-2025-12735 / CVE-2025-13204 / GHSA-jc85-fpwf-qm7x / GHSA-8gw3-rxh4-v6jx (High, CWE-94 Code Injection / CWE-1321 Prototype Pollution).** `evaluate()` performed unrestricted member access (`a.b`) on values, so an expression could read `__proto__`/`prototype` (prototype pollution) or climb via `constructor` toward `Function` to execute arbitrary code. All runtime member-access sites now reject the `__proto__`, `constructor`, and `prototype` property names. The fix is applied identically across the CommonJS bundle, the ESM module, and the regenerated minified bundle.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `expr-eval@2.0.2`.

---

Based on `expr-eval` by Matthew Crumley (MIT).

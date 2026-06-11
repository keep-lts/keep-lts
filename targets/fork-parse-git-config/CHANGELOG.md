# Changelog

All notable changes to this security-maintained fork are documented here.
This fork tracks the original [`parse-git-config`](https://www.npmjs.com/package/parse-git-config)
API exactly; only security and compatibility fixes are applied.

## [3.0.1] — 2026-06-11

### Security
- **Fix CVE-2025-25975 / GHSA-8g77-54rh-46hx (prototype pollution, CRITICAL CWE-1321).**
  `parse.expandKeys()` constructed nested objects from git config section names
  without guarding reserved property names. A crafted section such as
  `[__proto__ "polluted"]` (or a config object with key `'__proto__ "polluted"'`)
  caused `Object.prototype` to be mutated for the entire process. Section and
  subsection names that resolve to `__proto__`, `constructor`, or `prototype`
  are now rejected. See [SECURITY.md](./SECURITY.md) for the full advisory,
  proof-of-concept, and remediation.

### Notes
- No public API change. `expandKeys`, `parse`, `parse.sync`, and
  `parse.resolveConfigPath` behave identically for all legitimate git config input.
- Original behavior is covered by the upstream test suite (unchanged); the fix is
  covered by 5 new regression tests in `test/security.js`.
- Drop-in replacement for `parse-git-config@3.0.0`. See README for one-line adoption
  via npm `overrides`.

---

Based on `parse-git-config@3.0.0` by Jon Schlinkert and contributors (MIT).

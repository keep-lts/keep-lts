# Changelog

Security-maintained fork of [`extract-zip`](https://www.npmjs.com/package/extract-zip).
Only security and compatibility fixes are applied; the public API is unchanged.

## [2.0.2] — 2026-11-07

### Security
- **Fix CVE-2026-56876 / CVE-2026-19693 / GHSA-jmr9-qjv8-65gv / GHSA-7pqw-9j4j-h8q3 (High, CWE-59 Link Following / CWE-22 Path Traversal).** Symlink entries are resolved the way the operating system will resolve them — from the real directory containing the link, following symlinks that already exist — and rejected unless they land inside the extraction directory. Absolute link targets, and targets with a `..` after a normal segment (which can escape through a symlinked segment), are rejected outright. Before writing a file or creating a link, any symlink already sitting at that path is removed rather than followed.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `extract-zip@2.0.1`.

---

Based on `extract-zip` by max ogden (BSD-2-Clause).

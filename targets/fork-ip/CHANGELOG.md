# Changelog

Security-maintained fork of [`ip`](https://www.npmjs.com/package/ip).
Only security and compatibility fixes are applied; the public API is unchanged.

## [2.0.2] — 2026-11-07

### Security
- **Fix CVE-2024-29415 / GHSA-2p57-rm9w-gvfp (High, CWE-918 Server-Side Request Forgery (SSRF)).** isPrivate, isPublic and isLoopback parse the input to its 4 or 16 bytes (accepting every IPv4 spelling the OS resolver accepts: short forms, octal, hex, a single 32-bit number; and IPv6 with any case, leading zeros, :: compression, zone IDs and IPv4-mapped or IPv4-compatible forms) and classify the bytes. Inputs the parser rejects fall back to the original 2.0.1 logic, so invalid input behaves exactly as before.
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in `test/security.test.js`.
- Drop-in replacement for `ip@2.0.1`.

---

Based on `ip` by Fedor Indutny <fedor@indutny.com> (MIT).

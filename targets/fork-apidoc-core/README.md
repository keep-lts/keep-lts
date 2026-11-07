# @keep-lts/apidoc-core

> Security-maintained, drop-in fork of [`apidoc-core`](https://www.npmjs.com/package/apidoc-core).

> [!IMPORTANT]
> **Unofficial security-maintenance fork.** The original `apidoc-core` has no fix for
> **CVE-2025-13158 / CVE-2025-57317 / GHSA-6vj3-p34w-xxjp / GHSA-5q53-78f2-6gf8** (Critical). This fork applies a minimal, tested patch and keeps the
> public API byte-for-byte compatible. Adopt with zero code changes via npm `overrides`:
>
> ```json
> { "overrides": { "apidoc-core": "npm:@keep-lts/apidoc-core@^0.15.1" } }
> ```
>
> See [SECURITY.md](./SECURITY.md) and [CHANGELOG.md](./CHANGELOG.md). Original functionality
> and attribution preserved under the MIT license.

> **Running this in production for an audited team?** [Keep LTS Pro](https://keep-lts.com/#pro)
> adds an SLA on future CVEs, SBOM/VEX for your auditor, and fixes for the other dead dependencies in
> your tree. Async, no sales calls. Questions: hello@keep-lts.com

---

# apidoc-core

Core parser library to generate apidoc result following the [apidoc-spec](https://github.com/apidoc/apidoc-spec).

![Build Status](https://github.com/apidoc/apidoc-core/workflows/validate/badge.svg)
[![Dependency Status](https://david-dm.org/apidoc/apidoc-core.svg)](https://david-dm.org/apidoc/apidoc-core)
[![NPM version](https://badge.fury.io/js/apidoc-core.svg)](http://badge.fury.io/js/apidoc-core)

If you are an end user, please proceed to [apidoc](https://github.com/apidoc/apidoc) or [apidoc-documentation](http://apidocjs.com).

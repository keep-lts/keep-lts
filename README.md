# Keep LTS — security-maintained forks of abandoned npm packages

An agent-run business: find widely-used npm packages that are abandoned **with a known CVE and no
fix on the registry**, publish minimal tested drop-in security patches, and let audit-driven search
traffic find them. Free fixes are the marketing; the accumulated track record is the moat.

**Status:** 11 forks built, tested, and packaged (15 CVEs, ~16.1M combined weekly downloads).
Nothing published yet — go-live is gated on principal-only steps (npm account, publish). See
[docs/STATUS.md](docs/STATUS.md).

## The system

```
pipeline/   → finds targets:   OSV npm advisories × downloads × "latest still vulnerable"  → 69 candidates
targets/    → the products:    11 patched @keep-lts/* forks (+ QUEUE.md of what's next)
site/       → distribution:    SEO discovery site generated from the fork metadata (the storefront)
publish/    → go-live:         test-gated publish-all.sh + launch checklist
docs/       → the record:      STATUS, BATCH-1-REPORT, XLSX-FLAGSHIP-REPORT
```

## How a fork is built (the discipline)

Every fork follows the same standard — the thing that makes a security business credible:

1. **Reproduce** the CVE with a real proof-of-concept.
2. **Patch** minimally — security-only, port the upstream fix where one exists, comment the CVE.
3. **Regression-test** so the test **fails on the original and passes on the patch**.
4. **Preserve behavior** — legitimate inputs produce identical results (cross-version equivalence
   for the larger packages).
5. **Package** as a scoped, signed, drop-in fork; upstream license + attribution retained.

## The catalog

| Package | Fixes | Downloads/wk |
|---|---|---|
| `xlsx` (SheetJS) | CVE-2023-30533, CVE-2024-22363 | 10,557,539 |
| `html-minifier` | CVE-2022-37620 | 3,322,664 |
| `parse-git-config` | CVE-2025-25975 | 1,053,903 |
| `expr-eval` | CVE-2025-12735, CVE-2025-13204 | 505,077 |
| `url-regex` | CVE-2020-7661 | 415,842 |
| `utils-extend` | CVE-2024-57077, CVE-2020-8147 | 72,170 |
| `csvjson` | CVE-2025-57318 | 50,050 |
| `apidoc-core` | CVE-2025-13158, CVE-2025-57317 | 49,899 |
| `defaults-deep` | CVE-2018-16486 | 36,061 |
| `101` | CVE-2021-25943 | 34,804 |
| `deep-defaults` | CVE-2021-25944 | 14,302 |

`pez` was investigated and **deliberately excluded** — a maintained successor (`@hapi/pez`) exists,
so the honest answer for users is "migrate," not "install our fork."

## Adopting a fix (what the customer does)

```json
{ "overrides": { "<package>": "npm:@keep-lts/<package>@^<version>" } }
```

One entry, reinstall, audit clears — no code changes.

## Reproduce the build from scratch

```sh
node pipeline/01-find-nofix.mjs && node pipeline/02-enrich.mjs && node pipeline/03-verify-latest.mjs
bash pipeline/scaffold.sh <pkg> <version>     # fork a vulnerable version
# ...patch + add test/security.test.js...
node pipeline/package-fork.mjs targets/fork-<pkg>   # make it publish-ready
node site/generate.mjs                         # rebuild the storefront
```

# Adoption Queue — vetted targets

Generated from `data/targets-verified.json` (OSV npm advisories × npm download data ×
latest-version-still-vulnerable verification), then triaged by hand for *product quality*.

**Triage rule:** raw score (downloads × severity × years-abandoned) finds candidates, but a
good *product* also requires: (a) still genuinely depended upon, (b) **no drop-in
successor** the user would just switch to, (c) the vuln is real and **unmitigated in the
wild**, (d) a permissive license we can legally fork, and ideally (e) a small, surgical,
low-regression-risk patch. Several high-score hits fail these and are excluded with reasons.

Verified-vulnerable target pool: **69 packages** (latest published version still affected).

---

## Tier A — do next (surgical prototype-pollution, real usage, no successor)

These mirror the proven `parse-git-config` template almost exactly (CWE-1321, block
`__proto__`/`constructor`/`prototype`, tiny diff, low regression risk). Fastest path to a
batch of credible public fixes.

| Package | dl/wk | Severity | CVE(s) | License | Notes |
|---|---|---|---|---|---|
| **parse-git-config** | 1.05M | HIGH | CVE-2025-25975 | MIT | ✅ **DONE — fork built, tested, publish-ready** |
| expr-eval | 505k | HIGH | CVE-2025-12735, CVE-2025-13204 | MIT | Expression eval; recent CVEs, active real usage |
| apidoc-core | 50k | CRITICAL | (2 incl. CWE-1321) | MIT | Build-time tool, clean fork |
| csvjson | 50k | HIGH | CWE-1321 | MIT | Surgical |
| utils-extend | 72k | CRITICAL | CVE-2020-8147, CVE-2024-57077 | ISC | Surgical merge guard |
| defaults-deep | 36k | CRITICAL | CVE-2018-16486 | MIT | Classic deep-merge pollution |
| deep-defaults | 14k | CRITICAL | CWE-1321 | MIT | Same pattern |
| 101 | 35k | CRITICAL | CVE-2021-25943 | MIT | Util lib, surgical |
| pez | 78k | HIGH | CWE-1321 | BSD-3 | Multipart parser (hapi-family) |

## Tier B — high value, more work (worth it for the download volume / depth)

| Package | dl/wk | Severity | Issue | License | Why it's worth more effort |
|---|---|---|---|---|---|
| **xlsx (SheetJS)** | **10.5M** | HIGH | CWE-1321 + ReDoS (CWE-1333) | Apache-2.0 | ✅ **DONE — flagship shipped.** `@keep-lts/xlsx@0.18.6`. |
| html-minifier | 3.32M | HIGH | CVE-2022-37620 (ReDoS) | MIT | ✅ **DONE — `@keep-lts/html-minifier@4.0.1`.** The `reCustomIgnore` `\s*(?:…)+\s*` ReDoS; fixed by bounding the leading whitespace. **Note discovered while building: the popular successor `html-minifier-terser` (18.5M/wk) ships the identical vulnerable regex — neither original nor successor is fixed on npm, so this fork is the only remediation.** |
| url-regex | 416k | HIGH | CVE-2020-7661 (ReDoS) | MIT | ✅ **DONE — `@keep-lts/url-regex@5.0.1`.** Rewrote the `(?:X[-_]*)*X+` host/domain sub-patterns to linear-time equivalents (108/108 equivalence). The "successor" `url-regex-safe` only mitigates via the optional native `re2` module and *lost* adoption (276k/wk < the original's 416k); this pure-JS fix is strictly better and serves the larger, stuck user base. |
| ~~xmldom~~ | 1.53M | CRITICAL | 7 vulns | MIT | ❌ **EXCLUDED — dominant maintained successor.** `@xmldom/xmldom` has **21× the downloads** (32.8M/wk), is actively maintained (Apr 2026), and is the clear community path. Unlike `url-regex` (whose successor lost), here migration is the honest answer. The 7 vulns are also non-trivial serialization rewrites, not surgical guards. Same call as `pez`. |
| parsejson | 255k | HIGH | CWE-400 | MIT | Old socket.io-era util, still pulled transitively. |

## Tier C — verify license before forking (registry lists UNKNOWN)

`license: UNKNOWN` in npm metadata usually means the license is only in a LICENSE file or
README, not the `package.json`. Must confirm it's actually permissive (MIT/ISC/BSD/Apache)
**before** any fork. Do not fork copyleft/no-license packages.

- mockery (105k/wk, CRITICAL, CWE-1321) — check repo LICENSE
- mockjs (127k/wk, HIGH, CWE-1321) — check repo LICENSE
- pdf-image (15k/wk, CRITICAL, command injection) — check; also command-injection patches are higher-risk
- timespan (99k/wk, HIGH, ReDoS) — check; very old (12.7y)

## Excluded — poor products despite high raw score (honest reasons)

| Package | dl/wk | Why excluded |
|---|---|---|
| colors | 26M | 2022 maintainer **sabotage** (intentional infinite loop), universally mitigated by pinning; not a CVE to "support." |
| faker | 2.69M | Same 2022 sabotage saga; ecosystem moved to `@faker-js/faker`. |
| coa, rc | 5.9M / 36M | Compromised-release supply-chain incidents, long since remediated by pinning; nothing to maintain. |
| babel-traverse | 3.04M | Direct drop-in successor `@babel/traverse` — users just switch. |
| lodash.pick / lodash.set | 2.2M / 2.0M | Per-method lodash packages; fix is "use lodash ≥4.17.21" — trivial migration, no fork demand. |
| hoek, ammo, content, subtext | 90k–2.9M | hapi-ecosystem renamed to `@hapi/*`; successors exist. (Note: `pez` kept in Tier A only if confirmed no maintained `@hapi/pez` drop-in.) |

## The eval-family caveat (safe-eval, safer-eval)

`safe-eval` (30k/wk) and `safer-eval` (17k/wk) score high (multiple CRITICAL sandbox-escape
CVEs) but are **structurally hard to secure** — they promise a JS sandbox that Node cannot
truly provide, so "fixes" are an escape-of-the-month treadmill. Either (a) skip, or (b)
offer them only with an explicit "migrate to `vm2` successor / isolated-vm" advisory rather
than a false promise of safety. Do **not** market these as "secured." Flagged, not queued.

---

## Suggested batch plan

1. **Batch 1 (this week):** Tier A — replicate the `parse-git-config` template across the
   7 remaining surgical proto-pollution packages. Each is ~1–2 hours: reproduce, guard,
   regression-test, package. Publish all as free, signed forks → 8 credible public fixes.
2. **Batch 2:** `xmldom` + `html-minifier` + `url-regex` (Tier B, medium effort).
3. **Flagship:** `xlsx` — own milestone. Its 10.5M/wk reach is the single best
   reputation and lead-gen asset in the whole pool.

# Batch 1 — build report

*Completed 2026-06-11. Replicating the proven `parse-git-config` template across the Tier-A
target set, plus scoping the `xlsx` flagship.*

## Result: 8 publish-ready forks, 62 passing regression tests, 0 failures

Every fork below was taken through the full discipline: **reproduce the CVE → minimal
surgical patch → regression test that fails on the original and passes on the patch →
preserve all legitimate behavior → package as a signed, drop-in `@keep-lts/*` fork.** None
are published — all are staged for the principal's npm account.

| Fork | Fixes | Severity | Tests | Notes |
|---|---|---|---|---|
| `@keep-lts/parse-git-config@3.0.1` | CVE-2025-25975 | Critical | 21 ✓ | prototype pollution (built prior session) |
| `@keep-lts/defaults-deep@0.2.5` | CVE-2018-16486 | Critical | 4 ✓ | bypassed original's partial `__proto__`-only guard via `constructor.prototype` |
| `@keep-lts/deep-defaults@1.0.6` | CVE-2021-25944 | Critical | 4 ✓ | `__proto__` recursion into Object.prototype |
| `@keep-lts/101@1.6.4` | CVE-2021-25943 | Critical | 9 ✓ | keypath pollution through `keypather` in `set`/`put`; added shared guard module |
| `@keep-lts/csvjson@5.1.1` | CVE-2025-57318 | High | 6 ✓ | header-driven pollution in `toSchemaObject`; dot+bracket segment guard |
| `@keep-lts/utils-extend@1.0.9` | CVE-2024-57077, CVE-2020-8147 | Critical | 5 ✓ | deep-`extend` pollution |
| `@keep-lts/apidoc-core@0.15.1` | CVE-2025-13158, CVE-2025-57317 | Critical | 5 ✓ | dotted-path build/resolve pollution in the parser core |
| `@keep-lts/expr-eval@2.0.3` | CVE-2025-12735, CVE-2025-13204 | High | 8 ✓ | **hardest:** unrestricted member access → RCE + pollution; guarded all 3 build artifacts (CJS/ESM/min) |

**Total: 11 CVEs neutralized across 8 packages, ~1.8M combined weekly downloads** (the
long-tail thesis in action — each package is individually small; `parse-git-config` at 1.05M
and `expr-eval` at 505k dominate the batch, the rest are 14k–72k/wk. The portfolio and the
`xlsx` flagship are where the real reach is).

## One package deliberately excluded

**`pez`** (78k/wk) — dropped after research showed a **maintained drop-in successor exists**:
`@hapi/pez` (v6.1.1, April 2026, not deprecated, 1.48M downloads/week, 19× the old package).
This fails the product rule "no successor the user would just switch to." The honest answer
for users on old `pez` is *migrate to `@hapi/pez`*, not *install our fork* — so shipping a
pez fork would be low-value and misleading. Excluding it is consistent with the methodology
in [QUEUE.md](../targets/QUEUE.md).

## Engineering notes (what was built to make this repeatable)

- **`pipeline/scaffold.sh`** — fork a published vulnerable version into a clean workspace.
- **`pipeline/package-fork.mjs`** — transform a patched fork into a publish-ready `@keep-lts`
  package: scoped name, idempotent version bump (derived from the affected version),
  generated SECURITY.md + CHANGELOG.md, README banner, CI workflow, provenance config.
- **Test approach:** self-contained `node:test` suites (the packages' ancient mocha versions
  don't run on Node 22). Where upstream had behavior tests, the cases were **ported** so
  behavior preservation is still verified on a working runner. Every security test was
  checked to **fail on the unpatched original** — they catch the real bug, not a tautology.

### A real bug caught in the tooling
The first version of `package-fork.mjs` added a `files` field to packages that had none,
which **restricts** the npm publish to just those entries and would have shipped packages
with **zero code**. Caught by inspecting the actual `npm pack` tarball contents (not just the
passing tests, which run against the working dir). Fixed to only extend an existing `files`
array, and the two affected forks (`101`, `deep-defaults`) were repaired and re-verified.
Lesson baked in: **always verify the packaged artifact, not just the test run.**

## Flagship scoped

**`xlsx`/SheetJS (10.5M/wk)** — full milestone scope in
[targets/XLSX-FLAGSHIP-SCOPE.md](../targets/XLSX-FLAGSHIP-SCOPE.md). npm `latest` is frozen at
the vulnerable 0.18.5 (two HIGH CVEs) because SheetJS moved fixed releases to their own CDN.
Both fixes are **ports of known upstream diffs**, which de-risks the large (24.5k-line)
bundle. Recommended as the next milestone *after* Batch 1 publishes, so the brand has a
visible track record before shipping the highest-scrutiny package.

## What needs the principal (unchanged boundary)

Register the npm org/scope, create the GitHub repos, `npm publish` each fork (provenance is
pre-configured), pick the final brand. The publish steps are identical to those in
[STATUS.md](STATUS.md) — now applied to 8 packages instead of 1.

## Recommended next step

Publish the 8 forks (fastest path to a public track record), then green-light the `xlsx`
milestone. After that, Batch 2 from the queue: `xmldom`, `html-minifier`, `url-regex`.

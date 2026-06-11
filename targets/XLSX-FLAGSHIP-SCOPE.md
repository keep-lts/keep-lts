# Flagship milestone scope — `xlsx` (SheetJS) security fork

*Scoping doc, 2026-06-11. This is the single highest-value target in the pool. It gets its
own milestone rather than being rushed into a batch.*

## Why this is the flagship

| Fact | Value |
|---|---|
| Weekly npm downloads | **~10.5 million** |
| npm `latest` | **0.18.5**, published 2022-03-24, **not deprecated** |
| Open HIGH CVEs on that version | **CVE-2023-30533** (prototype pollution, CWE-1321), **CVE-2024-22363** (ReDoS, CWE-1333) |
| License | Apache-2.0 (forkable with NOTICE preservation) |
| Why no npm fix exists | SheetJS **deliberately stopped publishing to npm** after 0.18.5. Fixed releases (0.19.3 for the pollution, 0.20.2 for the ReDoS) live **only on `cdn.sheetjs.com`**, so `npm install xlsx` still installs the vulnerable build. |

This is the cleanest possible expression of the whole thesis: an enormous, security-flagged
user base with **no fix path through the package manager they actually use**, abandoned not
by neglect but by a distribution decision. Every `npm audit` in 10M weekly installs flags
this and finds nothing to upgrade to.

## The two fixes (both are *ports*, not original research)

SheetJS already wrote and shipped both fixes — they are simply unavailable on npm. The work
is porting two known, battle-tested diffs onto the frozen 0.18.5 baseline. That dramatically
de-risks the patch despite the file size.

1. **CVE-2023-30533 — prototype pollution.** Triggered when reading a crafted workbook;
   object construction during parse does not guard `__proto__`. Upstream fix (0.19.3) adds
   reserved-key guards at the object-building sinks. Port = the same `__proto__`/
   `constructor`/`prototype` guard pattern already proven across the seven Batch-1 forks,
   applied at the xlsx parse sinks.
2. **CVE-2024-22363 — ReDoS.** A regex used in parsing exhibits catastrophic backtracking on
   adversarial input. Upstream fix (0.20.2) bounds/rewrites the offending pattern. Port =
   replace the single regex with the bounded version.

## Why it's a milestone, not a batch item

- **Size:** `xlsx.js` is one **835 KB, ~24,500-line** bundle (package ~7.2 MB). Locating the
  exact sinks and confirming no collateral behavior change takes real care.
- **Blast radius:** at 10.5M downloads/week this is the most visible package in the portfolio.
  A regression here would damage the whole brand's credibility. It must ship only behind a
  thorough, fixture-based test suite.
- **Testing is heavier:** unlike the small utils, this needs **end-to-end fixtures** — parse
  real `.xlsx`/`.xls`/`.csv`/`.ods` files (normal *and* malicious) and assert (a) the
  pollution payload no longer mutates `Object.prototype`, (b) the ReDoS input returns
  promptly, and (c) a corpus of legitimate spreadsheets round-trips byte-identically vs the
  unpatched parse. Build the corpus from the package's own demo/test fixtures plus a few
  hand-built adversarial workbooks.

## Execution plan (the milestone)

1. **Reproduce both CVEs** on 0.18.5 with concrete PoCs (a malicious workbook for the
   pollution; a timing harness for the ReDoS).
2. **Port the two upstream fixes** to the frozen bundle, keeping the diff minimal and
   commented with CVE references (same discipline as Batch 1).
3. **Build the fixture corpus** and a round-trip equivalence test (patched vs original parse
   on ~20–30 legitimate files must match exactly).
4. **Package** as `@keep-lts/xlsx@0.18.6`, Apache-2.0 **NOTICE preserved**, drop-in via
   `overrides`, with the standard SECURITY.md/CHANGELOG/CI.
5. **Provenance + signing** matter most here — this is the package whose authenticity users
   will scrutinize hardest.

## Special considerations / risks

- **Respect the license precisely.** Apache-2.0 requires retaining the NOTICE and license and
  stating changes. The fork README must be unambiguous that it is an **unofficial security
  maintenance fork**, not affiliated with SheetJS, and point users who want ongoing upstream
  support to SheetJS's CDN/Pro offering. This is both legally required and the right thing.
- **Positioning vs. the maintainer.** SheetJS left npm on purpose; the fork serves the users
  who can't follow them off-registry (corporate registries, locked-down CI, transitive
  dependents). Frame it as filling the npm gap, not competing with SheetJS.
- **Effort estimate:** ~1–2 focused sessions (vs ~1–2 hours for a Batch-1 util). The reward —
  a signed, fixed, drop-in `xlsx` on npm — is the strongest single reputation and lead-gen
  asset in the entire business.

## Recommendation

**Green-light as the next milestone after Batch 1 publishes.** Sequence it *after* the seven
small forks are public, so the brand already has a visible track record of correct, tested,
well-documented fixes before it ships the highest-scrutiny package. The port-not-rewrite
nature of both fixes makes this far less risky than the raw file size suggests.

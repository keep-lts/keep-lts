# LTS Business — Build Status & Handoff

*Last updated 2026-06-11. Idea #1 from [BUSINESS_IDEAS.md](../../BUSINESS_IDEAS.md): security-maintained
LTS for the long tail of abandoned npm packages.*

## TL;DR

The whole business loop is **proven end-to-end and replicated into 11 publish-ready forks**,
including the **`xlsx`/SheetJS flagship (10.5M downloads/week)** — 15 CVEs neutralized, ~16.1M
combined weekly downloads, 79 passing regression tests, 0 failures. Batch 2 added `url-regex`
and `html-minifier` (both ReDoS) and excluded `xmldom` (dominant maintained successor). An
automated pipeline
found 69 genuinely-vulnerable, abandoned, forkable packages; Batch 1 took eight small ones
through reproduce → patch → test → package, and the `xlsx` flagship milestone shipped next.
See [BATCH-1-REPORT.md](BATCH-1-REPORT.md) and [XLSX-FLAGSHIP-REPORT.md](XLSX-FLAGSHIP-REPORT.md).
Nothing has been published or made public —
everything that crosses a legal/identity/money boundary is staged and waiting for your
go-ahead.

## What's done (agent-built, verifiable now)

1. **Target-discovery pipeline** — `lts/pipeline/`, three stages:
   - `01-find-nofix.mjs` — scans the full OSV npm advisory corpus (6,397 advisories) for
     vulnerabilities with **no fixed version anywhere** → 1,362 packages.
   - `02-enrich.mjs` — adds live npm download counts + registry metadata (license, last
     publish, deprecation), filters to ≥10k downloads/week, scores by
     `log10(downloads) × severity × years-abandoned`.
   - `03-verify-latest.mjs` — semver-checks that the **latest published version is still
     vulnerable** (kills false positives from advisories that only pin old hijacked
     releases) → **69 verified targets.**
   - Re-runnable any time to refresh the pipeline as new advisories land.
2. **Triaged adoption queue** — [targets/QUEUE.md](../targets/QUEUE.md). Tiered by product
   quality, not just score; excludes the traps (sabotage incidents, packages with drop-in
   successors) with honest reasons. Flagship identified: **`xlsx`/SheetJS, 10.5M dl/wk.**
3. **11 publish-ready forks** — `lts/targets/fork-*/`, each reproduced → patched → regression-
   tested (test fails on original, passes on patch) → behavior preserved → packaged with
   SECURITY.md/CHANGELOG/CI, upstream license + attribution retained. Adoption is **zero-code**
   via npm `overrides`. Details: [BATCH-1-REPORT.md](BATCH-1-REPORT.md) (8 small forks) and
   [XLSX-FLAGSHIP-REPORT.md](XLSX-FLAGSHIP-REPORT.md) (the 10.5M/wk flagship, both CVEs fixed
   end-to-end, both CommonJS + ESM builds patched).
4. **Discovery site (the distribution engine)** — `lts/site/generate.mjs` emits a static,
   SEO-tuned site from the fork metadata: an index plus one page per package, each targeting
   the moment a developer's `npm audit` flags a "no fix available" CVE and they search for one.
   Brand-neutral (env-configurable). This is how "free forks are the marketing" actually works.
5. **Turnkey publish kit** — `lts/publish/publish-all.sh` publishes all forks with a per-package
   test gate (won't ship a failing package) and skips anything already on npm; provenance is
   pre-configured. Launch checklist in [../publish/README.md](../publish/README.md).

## What needs YOU (the fiduciary boundary an agent can't cross)

These are deliberately *not* done because they require a legal person, identity, or money:

| # | Action | Why it's yours | Effort |
|---|---|---|---|
| 1 | ✅ **Brand decided: `keep-lts`** (npm scope `@keep-lts`; display "Keep LTS"; domain plan `keep-lts.com`). | Business call. | DONE |
| 2 | ✅ **npm org `keep-lts` registered** (Steve, 2026-06-11). | Needs npm account + 2FA. | DONE |
| 3 | **Create the GitHub org/repo** (`keep-lts` to match the scope) and push the `lts/` dir. | Your identity/org. | 15 min |
| 4 | **Create an npm automation token → GitHub secret `NPM_TOKEN`.** | Lets CI publish for you. | 5 min |
| 5 | **Run the "Publish to npm" Actions workflow** (dry-run, then real). Provenance is auto-on in CI. | Publishing under your name. | 5 min |
| 6 | **Deploy `site/dist`** to a static host + buy/connect the `keep-lts.com` domain. | Money (~$12/yr) + accounts. | 20 min |
| 7 | **Stand up billing + E&O insurance** before charging for paid tiers. | Money + legal entity + liability. | before revenue |

### Publishing (when you're ready)
All 11 publish together via the launch kit — see [../publish/README.md](../publish/README.md).
Recommended path: push `lts/` to GitHub → add an `NPM_TOKEN` secret → run the "Publish to npm"
Actions workflow (dry-run, then real) for signed provenance. A local `./publish/publish-all.sh
--yes` also works (no provenance off-CI).

## The business logic (why this is the one to build)

- **Free forks are the marketing.** Each published fix is a permanent, searchable artifact:
  when someone's `npm audit` flags the package, they find your maintained drop-in. No ads,
  no outbound — distribution is the work product itself.
- **Reputation compounds into the moat.** After N credible public fixes, you have the track
  record needed to sell the paid tier (private registry, SLA'd backports, SBOM/VEX
  attestations, "support this exact pinned version" contracts) to compliance-driven buyers.
- **Unit economics.** Marginal cost per additional package ≈ compute + minutes of review.
  The pipeline already amortizes discovery across all 69 targets. A human LTS shop
  (HeroDevs) can't touch this tail; that's the whole opening.

## Honest risks

- **Patch liability** — mitigated by: patch-only/no-feature policy, full upstream test-suite
  gating, public diffs, and (before any revenue) E&O insurance. The eval-family packages are
  explicitly *not* marketed as "secured" — see the caveat in QUEUE.md.
- **Trust deficit (no human face)** — mitigated by signed provenance, public reproducible
  tests, preserved attribution, and the free-tier track record before any ask for money.
- **Platform risk** — npm could change fork/naming policy; forks here preserve license &
  attribution and use a clearly-labeled scope to stay on the right side of it.

## Recommended next actions

Brand + npm org are done (see the table above). What remains is the launch sequence:
1. Push the `lts/` directory to GitHub (org `keep-lts`).
2. Create an npm automation token → add it as the GitHub secret `NPM_TOKEN`.
3. Run the "Publish to npm" workflow — dry-run first, then for real (all 11 go live, signed).
4. Deploy `site/dist` to a static host and connect the `keep-lts.com` domain.
5. (Optional) grow the catalog — Batch 3 candidates in [QUEUE.md](../targets/QUEUE.md):
   `taffydb`, `bigint-buffer`, license-verify `mockery`/`mockjs`.

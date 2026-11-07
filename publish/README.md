# Launch kit — going live

Everything here turns the 11 built forks into a live business. The build is done; these are the
**principal-only** steps an agent can't take (they need your identity, accounts, and money).

## One-time setup

1. **Pick the brand.** The forks currently use the `@keep-lts` scope (placeholder). To change it,
   set the env vars and re-run the site generator, and rename the packages' scope. Free npm scopes
   checked as of build: `@keep-lts`, plus brand names `patchkeep`, `evergreendeps`, `keeplts`.
2. **Register the npm org/scope** matching your brand (npmjs.com → add organization).
3. **`npm login`** in your shell (with 2FA enabled).
4. **Buy the domain** (default referenced: `keep-lts.com`) and point it at a static host.

## Publish the packages

The same script (`publish-all.sh`) is used both ways. It is **test-gated** (a fork whose tests fail
is never published) and **re-runnable** (anything already on npm is skipped). It auto-detects whether
it's running in CI and turns provenance on or off accordingly — so it just works in both places.

### Option A — from CI, with signed provenance (recommended)

This is the right way, especially for `xlsx` (the highest-scrutiny package). npm can only generate
provenance attestations from a supported CI with an OIDC token — a local publish cannot.

1. Push the `lts/` directory as a GitHub repo (it's self-contained — has its own README, `.gitignore`,
   workflow, everything). The publish workflow lives at `lts/.github/workflows/publish.yml`.
2. On npmjs.com, add a **trusted publisher** to each package (package → Settings → Trusted
   Publisher → GitHub Actions: org `keep-lts`, repo `keep-lts`, workflow `publish.yml`, allow
   `npm publish`), or run `npm trust github @keep-lts/<pkg> --file publish.yml --repo keep-lts/keep-lts --allow-publish`.
   No token or secret is needed, so nothing expires. (Provenance is only generated once the repo is public.)
3. GitHub → **Actions → "Publish to npm" → Run workflow**. Leave **dry run** checked the first time to
   see exactly what would publish; then run again unchecked to publish for real.

The workflow has `id-token: write` for OIDC, and the script automatically rewrites each package's
`repository` field to your actual GitHub repo at publish time so the provenance attestation validates
(no manual edits needed, whatever you name the repo).

### Option B — from your laptop, quick, no provenance

```sh
npm login                        # once, with 2FA
cd lts/publish
./publish-all.sh                 # dry-run — shows what would publish, runs every test gate
./publish-all.sh --yes           # publish for real (publishes with --no-provenance)
```

Locally the script passes `--no-provenance` (overriding `publishConfig.provenance: true`) so the
publish succeeds off-CI. Note: with 2FA, npm prompts for an OTP per package unless your token is an
automation token. You forgo the signed attestation — fine for the small forks, but prefer Option A
for `xlsx`.

## Deploy the discovery site

```sh
cd lts/site
LTS_BRAND="YourBrand" LTS_SCOPE="@yourscope" LTS_DOMAIN="yourdomain.dev" node generate.mjs
# deploy ./dist to GitHub Pages / Netlify / Vercel / Cloudflare Pages (it's pure static)
```

The site is the distribution engine: each package page is SEO-tuned for the moment a developer's
`npm audit` flags a package with "no fix available" and they search for one. Regenerate it whenever
you add a fork — it reads the catalog automatically.

## Create the GitHub repos (optional but recommended)

Public repos give the forks a credible home and let people read the diff before adopting. For each
`lts/targets/fork-*`, create `github.com/<brand>/<package>` and push. (A scripted version using
`gh repo create` can be added once the brand/org is decided.)

## After launch — the flywheel

1. The free, fixed packages are the marketing: audit-driven searches find your drop-in.
2. Each public fix builds the track record needed to sell the **paid tier** (private registry, SLA'd
   backports, SBOM/VEX attestations) to compliance-driven buyers.
3. The discovery pipeline (`lts/pipeline`) keeps surfacing new targets — grow the catalog, repeat.

See [../docs/STATUS.md](../docs/STATUS.md) for the full state and [../docs/BATCH-1-REPORT.md](../docs/BATCH-1-REPORT.md)
/ [../docs/XLSX-FLAGSHIP-REPORT.md](../docs/XLSX-FLAGSHIP-REPORT.md) for how each fork was built.

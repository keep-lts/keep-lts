#!/usr/bin/env bash
# Publish every @keep-lts fork to npm. Works both locally and in CI.
#
#   - Locally:  publishes WITHOUT provenance (npm can't generate it off-CI), so a
#               laptop publish just works after `npm login`.
#   - In CI:    auto-detects the GitHub Actions OIDC token and publishes WITH
#               provenance, and points each package's `repository` at the actual
#               repo so the provenance attestation validates.
#
# Prerequisites (one-time, principal-only — an agent cannot do these):
#   1. npm account with your scope (default @keep-lts) registered.
#   2. Auth: `npm login` locally, OR an NPM_TOKEN secret for the CI workflow.
#
# Usage:
#   ./publish-all.sh            # dry-run: shows what would publish, runs every test gate
#   ./publish-all.sh --yes      # actually publish
#
# Safe to re-run: versions already on npm are detected and skipped.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TARGETS="$HERE/../targets"
REPO_ROOT="$(cd "$HERE/.." && pwd)"   # the deployable repo root (the lts/ directory)
DRY=1; [ "${1:-}" = "--yes" ] && DRY=0

# Provenance is OFF unless explicitly requested (KEEPLTS_PROVENANCE=true). It only
# works from a CI with an OIDC token AND a PUBLIC repo, so keeping it opt-in lets a
# private-repo or local publish succeed. (This overrides publishConfig.provenance.)
IN_CI=0; [ -n "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" ] && IN_CI=1
PROV="--no-provenance"
[ "${KEEPLTS_PROVENANCE:-}" = "true" ] && PROV="--provenance"

echo "== Keep LTS publish =="
[ $DRY -eq 1 ] && echo "(dry-run — pass --yes to publish for real)"
[ "$PROV" = "--provenance" ] && echo "provenance: ON  (requested)" || echo "provenance: off"
echo

published=0; skipped=0; failed=0
for dir in "$TARGETS"/fork-*/; do
  [ -f "$dir/package.json" ] || continue
  name=$(node -p "require('$dir/package.json').name")
  version=$(node -p "require('$dir/package.json').version")

  # already on npm?
  if npm view "$name@$version" version >/dev/null 2>&1; then
    echo "skip   $name@$version (already published)"
    skipped=$((skipped+1)); continue
  fi

  echo "----- $name@$version -----"
  ( cd "$dir"
    # Install each fork's deps so its test gate can load them. node_modules is not
    # committed, so on a fresh checkout (CI) this is required before `npm test`.
    echo "  • npm install"
    # --omit=dev: only runtime deps (skips forks' fragile/conflicting devDeps).
    # --ignore-scripts: never run build/prepare scripts (protects patched dist/ files
    # from being regenerated from unpatched source, and avoids arbitrary install code).
    npm install --omit=dev --ignore-scripts --legacy-peer-deps --no-audit --no-fund >/dev/null 2>&1 || { echo "  ✗ install failed"; exit 1; }
    echo "  • npm test"
    npm test >/dev/null 2>&1 || { echo "  ✗ tests failed — NOT publishing"; exit 1; }
    echo "  ✓ tests pass"

    # In CI, normalize the package's repository to the actual GitHub repo so npm
    # provenance validates regardless of repo name. Ephemeral CI checkout, so this
    # in-place edit is never committed.
    if [ $IN_CI -eq 1 ] && [ $DRY -eq 0 ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
      reldir="${dir#"$REPO_ROOT"/}"; reldir="${reldir%/}"
      node -e "const fs=require('fs'),j=JSON.parse(fs.readFileSync('package.json'));j.repository={type:'git',url:'git+https://github.com/'+process.env.GITHUB_REPOSITORY+'.git',directory:process.argv[1]};fs.writeFileSync('package.json',JSON.stringify(j,null,2)+'\n')" "$reldir"
    fi

    if [ $DRY -eq 1 ]; then
      echo "  • would run: npm publish --access public $PROV"
    else
      echo "  • npm publish --access public $PROV"
      npm publish --access public $PROV
      echo "  ✓ published"
    fi
  ) && { [ $DRY -eq 0 ] && published=$((published+1)) || true; } || { echo "  ✗ FAILED: $name"; failed=$((failed+1)); }
  echo
done

echo "== summary =="
[ $DRY -eq 1 ] && echo "dry-run complete. Re-run with --yes to publish." || echo "published: $published   skipped: $skipped   failed: $failed"
[ $failed -gt 0 ] && exit 1 || exit 0

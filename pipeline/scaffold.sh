#!/usr/bin/env bash
# Scaffold a fork workspace from the PUBLISHED vulnerable version of a package.
# We fork exactly what users run (the npm tarball), reproduce, patch, and test.
# Usage: scaffold.sh <pkg> <version>
set -euo pipefail
PKG="$1"; VER="$2"
ROOT="/Users/steve/Documents/New project/lts/targets"
SAFE=$(echo "$PKG" | tr '/@' '__')
DIR="$ROOT/fork-$SAFE"

rm -rf "$DIR" && mkdir -p "$DIR"
cd "$DIR"
echo ">>> packing $PKG@$VER"
TGZ=$(npm pack "$PKG@$VER" 2>/dev/null | tail -1)
tar -xzf "$TGZ" && rm "$TGZ"
# move package/* up into the fork dir root
shopt -s dotglob
mv package/* . && rmdir package
shopt -u dotglob

echo ">>> installing runtime deps"
# install only production deps to run the code; dev deps installed on demand
npm install --omit=dev --silent --no-audit --no-fund 2>/dev/null || true

echo ">>> main entry:"
node -p "require('./package.json').main || 'index.js'"
echo ">>> files shipped:"
node -e "console.log((require('./package.json').files||['(all)']).join(', '))"
echo ">>> scaffolded at: $DIR"

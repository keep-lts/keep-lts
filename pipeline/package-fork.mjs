#!/usr/bin/env node
// Turn a scaffolded + patched fork dir into a publish-ready @keep-lts package.
// Reads <forkdir>/fork-meta.json for the advisory metadata, then:
//  - transforms package.json (scoped name, bumped version, provenance, keywords)
//  - generates CHANGELOG.md and SECURITY.md
//  - prepends a fork banner to README
//  - writes a .github/workflows/ci.yml
// Idempotent-ish: rewrites the generated files each run.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: package-fork.mjs <forkdir>"); process.exit(1); }
const meta = JSON.parse(readFileSync(join(dir, "fork-meta.json"), "utf8"));
const pkgPath = join(dir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const origName = pkg.name;
const scoped = `@keep-lts/${origName.replace(/^@.*\//, "")}`;
const bump = (v) => { const p = (v || "0.0.0").split("."); p[2] = String((+p[2] || 0) + 1); return p.join("."); };
// Derive from the affected (original) version so re-runs are idempotent.
const newVersion = meta.newVersion || bump(meta.affectedVersion || pkg.version);

// --- package.json transform (preserve everything, change identity + safety bits) ---
const origAuthor = pkg.author;
pkg.name = scoped;
pkg.version = newVersion;
pkg.description = `Security-maintained drop-in fork of ${origName}. ${meta.shortFix} Original API unchanged.`;
pkg.contributors = [...(Array.isArray(pkg.contributors) ? pkg.contributors : []),
  "Keep LTS (security maintenance fork)"];
pkg.repository = `keep-lts/${origName.replace(/^@.*\//, "")}`;
pkg.bugs = { url: `https://github.com/${pkg.repository}/issues` };
pkg.homepage = `https://github.com/${pkg.repository}`;
// IMPORTANT: only touch `files` if the original package had one. Adding a `files`
// field to a package that lacked it would RESTRICT the publish to just these entries
// and drop all the actual code. When absent, npm includes everything by default
// (CHANGELOG.md/SECURITY.md included), which is what we want.
if (Array.isArray(pkg.files) && pkg.files.length) {
  pkg.files = [...new Set([...pkg.files, "CHANGELOG.md", "SECURITY.md"])];
}
pkg.keywords = [...new Set([...(pkg.keywords || []), ...(meta.cves || []).map((c) => c.toLowerCase()),
  "security", "patch", "lts", "fork", ...(meta.cwe ? [meta.cwe.toLowerCase().replace(/\s+/g, "-")] : [])])];
pkg.publishConfig = { access: "public", provenance: true };
if (meta.testScript) pkg.scripts = { ...(pkg.scripts || {}), test: meta.testScript };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// --- CHANGELOG.md ---
const ids = [...(meta.cves || []), ...(meta.ghsas || [])].join(" / ");
writeFileSync(join(dir, "CHANGELOG.md"), `# Changelog

Security-maintained fork of [\`${origName}\`](https://www.npmjs.com/package/${origName}).
Only security and compatibility fixes are applied; the public API is unchanged.

## [${newVersion}] — ${meta.date}

### Security
- **Fix ${ids} (${meta.severity}, ${meta.cwe}).** ${meta.longFix}
  See [SECURITY.md](./SECURITY.md) for the advisory, proof-of-concept, and remediation.

### Notes
- No public API change; behavior is identical for all legitimate input.
- Regression tests added in \`${meta.testFile || "test/security.js"}\`.
- Drop-in replacement for \`${origName}@${pkg.version === newVersion ? meta.affectedVersion : meta.affectedVersion}\`.

---

Based on \`${origName}\` by ${typeof origAuthor === "string" ? origAuthor : origAuthor?.name || "the original authors"} (${pkg.license || "see LICENSE"}).
`);

// --- SECURITY.md ---
writeFileSync(join(dir, "SECURITY.md"), `# Security Advisory — ${origName}

## ${ids} — ${meta.title}

| | |
|---|---|
| **Severity** | ${meta.severity} (${meta.cwe}) |
| **Affected** | \`${origName}\` ${meta.affectedRange} (original package; no upstream fix) |
| **Fixed in** | \`${scoped}@${newVersion}\` |

### Summary

${meta.summary}

### Proof of concept

\`\`\`js
${meta.poc}
\`\`\`

### The fix

${meta.fixExplanation}

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

\`\`\`json
{
  "overrides": {
    "${origName}": "npm:${scoped}@^${newVersion}"
  }
}
\`\`\`

Then reinstall and confirm \`npm ls ${origName}\` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.
`);

// --- README banner ---
const readmeCandidates = ["README.md", "readme.md", "Readme.md"];
const rmName = readmeCandidates.find((r) => existsSync(join(dir, r))) || "README.md";
const rmPath = join(dir, rmName);
const existing = existsSync(rmPath) ? readFileSync(rmPath, "utf8") : `# ${origName}\n`;
if (!existing.includes("security-maintenance fork")) {
  const banner = `# ${scoped}

> Security-maintained, drop-in fork of [\`${origName}\`](https://www.npmjs.com/package/${origName}).

> [!IMPORTANT]
> **Unofficial security-maintenance fork.** The original \`${origName}\` has no fix for
> **${ids}** (${meta.severity}). This fork applies a minimal, tested patch and keeps the
> public API byte-for-byte compatible. Adopt with zero code changes via npm \`overrides\`:
>
> \`\`\`json
> { "overrides": { "${origName}": "npm:${scoped}@^${newVersion}" } }
> \`\`\`
>
> See [SECURITY.md](./SECURITY.md) and [CHANGELOG.md](./CHANGELOG.md). Original functionality
> and attribution preserved under the ${pkg.license || "original"} license.

---

`;
  writeFileSync(rmPath, banner + existing);
}

// --- CI workflow ---
const wfDir = join(dir, ".github", "workflows");
mkdirSync(wfDir, { recursive: true });
writeFileSync(join(wfDir, "ci.yml"), `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: { node: [18, 20, 22] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: \${{ matrix.node }} }
      - run: git config --global user.name ci && git config --global user.email ci@example.com
      - run: npm install
      - run: npm test
`);

console.log(`packaged ${scoped}@${newVersion}  (from ${origName})`);

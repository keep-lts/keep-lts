# Security Advisory — extract-zip

## CVE-2026-56876 / CVE-2026-19693 / GHSA-jmr9-qjv8-65gv / GHSA-7pqw-9j4j-h8q3 — Arbitrary file write outside the extraction directory via symlink entries in extract-zip

| | |
|---|---|
| **Severity** | High (CWE-59 Link Following / CWE-22 Path Traversal) |
| **Affected** | `extract-zip` <= 2.0.1 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/extract-zip@2.0.2` |

### Summary

extract-zip validated only the parent directory of each archive entry. A malicious zip could (1) create a symlink pointing anywhere on disk (CVE-2026-56876), and (2) follow it with a regular file of the same name, which extract-zip then wrote through the symlink — an arbitrary file write outside the extraction directory (CVE-2026-19693). Any service that extracts user-supplied zips (uploads, plugin/theme installers, CI artefacts, Electron updaters) is exposed.

### Proof of concept

```js
// zip entries: 'evil' (symlink -> ../../../../home/user/.bashrc), then 'evil' (file: attacker content)
await require('extract-zip')('evil.zip', { dir: '/srv/uploads/x' })
// extract-zip 2.0.1 overwrites /home/user/.bashrc
```

### The fix

Three checks, each covered by a regression test that fails on 2.0.1: (1) every symlink target is resolved against the real filesystem and must land inside the target directory; absolute targets and `x/../y`-style targets are refused, closing bypasses of a purely textual check (e.g. a link through an earlier `d -> .` symlink); (2) an existing symlink at a destination path is removed before writing, never written through; (3) the existing parent-directory check is kept and also guards against cross-drive paths on Windows. Normal archives — files, nested folders, file modes, `__MACOSX` skipping, and relative symlinks that stay inside (as in macOS .app/framework bundles) — extract exactly as before.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "extract-zip": "npm:@keep-lts/extract-zip@^2.0.2"
  }
}
```

Then reinstall and confirm `npm ls extract-zip` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

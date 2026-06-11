# Security Advisory — xlsx

## CVE-2023-30533 / CVE-2024-22363 / GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9 — Prototype pollution and ReDoS in SheetJS xlsx on file read

| | |
|---|---|
| **Severity** | High (CWE-1321 Prototype Pollution / CWE-1333 ReDoS) |
| **Affected** | `xlsx` <= 0.18.5 on npm (the last npm-published release) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/xlsx@0.18.6` |

### Summary

Two vulnerabilities are reachable when `XLSX.read()` parses an attacker-supplied spreadsheet. CVE-2023-30533: a crafted (threaded) comment whose cell `ref` is `__proto__` causes `sheet[ref]` to resolve to `Object.prototype`, which is then mutated — polluting every object in the process. CVE-2024-22363: a crafted `docProps/core.xml` with many unclosed property tags triggers catastrophic backtracking in the core-property regex (a ~2 MB file takes ~50 seconds to parse, a denial of service).

### Proof of concept

```js
const XLSX = require('xlsx');
// 1) prototype pollution
XLSX.read(fs.readFileSync('threaded_comment_bad.xlsx')); // sets Object.prototype.c on 0.18.5
// 2) ReDoS: a docProps/core.xml with 128k unclosed <dcterms:created> tags
XLSX.read(crafted_buffer, { type: 'buffer' }); // ~50s on 0.18.5, ~17ms when patched
```

### The fix

Prototype pollution: `sheet_insert_comments` now returns early when `decode_cell(comment.ref)` yields negative row/column, so a non-address ref such as `__proto__` can never reach `sheet[comment.ref]`. ReDoS: `parse_core_props` now locates each property tag with `String#indexOf` (`str_match_xml`) instead of a `([\s\S]*?)` regex that re-scanned from every opening tag. Both are direct ports of SheetJS's own fixes; a cross-version equivalence test confirms legitimate files parse identically to upstream 0.18.5.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "xlsx": "npm:@keep-lts/xlsx@^0.18.6"
  }
}
```

Then reinstall and confirm `npm ls xlsx` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

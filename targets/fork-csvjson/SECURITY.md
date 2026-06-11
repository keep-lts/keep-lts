# Security Advisory — csvjson

## CVE-2025-57318 / GHSA-xq4f-3jxp-qv6m — Prototype Pollution in csvjson via toSchemaObject headers

| | |
|---|---|
| **Severity** | High (CWE-1321 Prototype Pollution) |
| **Affected** | `csvjson` <= 5.1.0 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/csvjson@5.1.1` |

### Summary

`csvjson.toSchemaObject()` interprets dotted/bracketed CSV column headers (e.g. `name.first`) to build nested objects. With no guard on reserved property names, a header such as `__proto__.polluted` or `constructor.prototype.polluted` causes the schema builder to walk into and mutate `Object.prototype`, affecting every object in the process (the `__proto__[]` variant instead throws, a denial-of-service). The attacker only needs to control the header row of a parsed CSV.

### Proof of concept

```js
const csvjson = require('csvjson');
csvjson.toSchemaObject('__proto__.polluted\nyes');
console.log(({}).polluted); // => 'yes'
```

### The fix

`addDataInSchema` now splits each header on `.`, `[`, and `]` and rejects the header if any segment is `__proto__`, `constructor`, or `prototype`. Legitimate nested headers — and headers that merely contain those words as substrings, e.g. `constructorName` — are unaffected.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "csvjson": "npm:@keep-lts/csvjson@^5.1.1"
  }
}
```

Then reinstall and confirm `npm ls csvjson` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

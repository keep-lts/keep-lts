# Security Advisory — deep-defaults

## CVE-2021-25944 / GHSA-h6xg-rg33-9mf4 — Prototype Pollution in deep-defaults

| | |
|---|---|
| **Severity** | Critical (CWE-1321 Prototype Pollution) |
| **Affected** | `deep-defaults` <= 1.0.5 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/deep-defaults@1.0.6` |

### Summary

`deep-defaults` recursively fills in defaults from a source object. With no guard on reserved property names, a source object parsed from untrusted JSON containing `__proto__` causes the recursion to walk into `Object.prototype` and add properties there, polluting every object in the process.

### Proof of concept

```js
const dd = require('deep-defaults');
dd({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'));
console.log(({}).polluted); // => 'yes'
```

### The fix

Source keys naming a prototype slot (`__proto__`, `constructor`, `prototype`) are skipped, so untrusted data can never reach `Object.prototype`. All legitimate default-merging behavior is preserved (verified by the ported upstream behavior cases).

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "deep-defaults": "npm:@keep-lts/deep-defaults@^1.0.6"
  }
}
```

Then reinstall and confirm `npm ls deep-defaults` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

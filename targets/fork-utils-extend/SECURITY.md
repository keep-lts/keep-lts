# Security Advisory — utils-extend

## CVE-2024-57077 / CVE-2020-8147 / GHSA-7qgg-vw88-cc99 / GHSA-6pq3-928q-x6w6 — Prototype Pollution in utils-extend's deep extend

| | |
|---|---|
| **Severity** | Critical (CWE-1321 Prototype Pollution) |
| **Affected** | `utils-extend` <= 1.0.8 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/utils-extend@1.0.9` |

### Summary

`utils-extend`'s deep `extend()` recursively merges a source object into a target. With no guard on reserved keys, a source object parsed from untrusted JSON containing `__proto__` causes the recursion to walk into and mutate `Object.prototype`, polluting every object in the process.

### Proof of concept

```js
const u = require('utils-extend');
u.extend({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'));
console.log(({}).polluted); // => 'yes'
```

### The fix

Source keys naming a prototype slot (`__proto__`, `constructor`, `prototype`) are skipped during the recursive merge. All legitimate deep-merge behavior — nested objects, arrays, and the multi-source `extend()` wrapper — is preserved.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "utils-extend": "npm:@keep-lts/utils-extend@^1.0.9"
  }
}
```

Then reinstall and confirm `npm ls utils-extend` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

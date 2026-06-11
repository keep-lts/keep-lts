# Security Advisory — 101

## CVE-2021-25943 / GHSA-cwcx-rxgc-cmw3 — Prototype Pollution in 101 via set/put keypaths

| | |
|---|---|
| **Severity** | Critical (CWE-1321 Prototype Pollution) |
| **Affected** | `101` <= 1.6.3 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/101@1.6.4` |

### Summary

The `set` and `put` functions accept a dotted/bracketed keypath and delegate to the `keypather` library to assign a nested value. A keypath such as `__proto__.polluted` or `constructor.prototype.polluted` causes keypather to walk into and mutate `Object.prototype`, affecting every object in the process. This is reachable from the 3-arg, 2-arg, and partial-application forms of both functions.

### Proof of concept

```js
const set = require('101/set');
set({}, '__proto__.polluted', 'yes');
console.log(({}).polluted); // => 'yes'
```

### The fix

A small `_safe-keypath.js` wrapper validates every keypath before it reaches keypather; keypaths whose segments resolve to `__proto__`, `constructor`, or `prototype` are rejected (the write is skipped). Legitimate keypaths — including keys that merely contain those words as substrings, e.g. `constructorName` — are unaffected.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "101": "npm:@keep-lts/101@^1.6.4"
  }
}
```

Then reinstall and confirm `npm ls 101` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

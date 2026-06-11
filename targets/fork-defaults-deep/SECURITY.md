# Security Advisory — defaults-deep

## CVE-2018-16486 / GHSA-pjxw-22xf-6pwc — Prototype Pollution in defaults-deep via constructor.prototype

| | |
|---|---|
| **Severity** | Critical (CWE-1321 Prototype Pollution) |
| **Affected** | `defaults-deep` <= 0.2.4 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/defaults-deep@0.2.5` |

### Summary

`defaults-deep` recursively copies source properties into a target. The published version guards against a literal `__proto__` key but still recurses through `constructor` into `constructor.prototype`, allowing an attacker-controlled source object (e.g. parsed from untrusted JSON) to add or overwrite properties on `Object.prototype` for the whole process.

### Proof of concept

```js
const defaultsDeep = require('defaults-deep');
defaultsDeep({}, JSON.parse('{"constructor":{"prototype":{"polluted":"yes"}}}'));
console.log(({}).polluted); // => 'yes'  (Object.prototype polluted)
```

### The fix

Keys that name a prototype slot (`__proto__`, `constructor`, `prototype`) are skipped during the recursive merge, so no source data can reach `Object.prototype`. Legitimate deep-default behavior is unchanged — real configuration data does not contain these reserved section names.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "defaults-deep": "npm:@keep-lts/defaults-deep@^0.2.5"
  }
}
```

Then reinstall and confirm `npm ls defaults-deep` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

# Security Advisory — apidoc-core

## CVE-2025-13158 / CVE-2025-57317 / GHSA-6vj3-p34w-xxjp / GHSA-5q53-78f2-6gf8 — Prototype Pollution in apidoc-core via doc-block path building

| | |
|---|---|
| **Severity** | Critical (CWE-1321 Prototype Pollution) |
| **Affected** | `apidoc-core` <= 0.15.0 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/apidoc-core@0.15.1` |

### Summary

When apidoc-core parses API documentation comments, group/element names flow into dotted object paths that `_createObjectPath` builds and `_pathToObject` resolves, after which the parsed values are merged in with `_.extend`. A crafted annotation whose path contains `__proto__` (or `constructor.prototype`) causes the merge to target `Object.prototype`, polluting every object in the process. This is reachable by anyone who can get the tool to parse an untrusted source file.

### Proof of concept

```js
// path segments derived from doc annotations reach the prototype:
const Parser = require('apidoc-core/lib/parser');
const root = {};
Parser.prototype._createObjectPath(root, 'group.__proto__.polluted', 'insert');
Object.assign(Parser.prototype._pathToObject('group.__proto__.polluted', root), { polluted: 'yes' });
console.log(({}).polluted); // => 'yes' on the unpatched version
```

### The fix

`_createObjectPath` and `_pathToObject` now detect any path segment equal to `__proto__`, `constructor`, or `prototype` and return a fresh throwaway object instead of building into or resolving through the prototype chain. Legitimate nested paths (e.g. `local.parameter.fields`) and the `push`/`insert` attach methods are unaffected.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "apidoc-core": "npm:@keep-lts/apidoc-core@^0.15.1"
  }
}
```

Then reinstall and confirm `npm ls apidoc-core` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

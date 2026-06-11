# Security Advisory — expr-eval

## CVE-2025-12735 / CVE-2025-13204 / GHSA-jc85-fpwf-qm7x / GHSA-8gw3-rxh4-v6jx — Code execution and prototype pollution via unrestricted member access in expr-eval

| | |
|---|---|
| **Severity** | High (CWE-94 Code Injection / CWE-1321 Prototype Pollution) |
| **Affected** | `expr-eval` <= 2.0.2 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/expr-eval@2.0.3` |

### Summary

`expr-eval` lets callers evaluate string expressions against a supplied scope, including member access such as `foo.bar`. Because member access was unrestricted, a crafted expression could reach JavaScript internals: `foo.__proto__` exposes (and can pollute) `Object.prototype`, and the `constructor` chain can reach the `Function` constructor to run arbitrary code. Any application that evaluates untrusted expressions is affected.

### Proof of concept

```js
const { Parser } = require('expr-eval');
const parser = new Parser();
parser.evaluate('foo.__proto__', { foo: {} }); // returns Object.prototype on the unpatched version
```

### The fix

A `memberAccess(object, property)` guard wraps every runtime member-access site and throws when the property is `__proto__`, `constructor`, or `prototype`. Legitimate expressions — member access to ordinary properties, arithmetic, and built-in functions like `sqrt`/`max` — are unchanged. The same guard is present in `dist/bundle.js` (CommonJS), `dist/index.mjs` (ESM), and `dist/bundle.min.js` (regenerated from the patched source).

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "expr-eval": "npm:@keep-lts/expr-eval@^2.0.3"
  }
}
```

Then reinstall and confirm `npm ls expr-eval` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

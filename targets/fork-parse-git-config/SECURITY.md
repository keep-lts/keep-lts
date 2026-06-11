# Security Advisory — parse-git-config

## CVE-2025-25975 / GHSA-8g77-54rh-46hx — Prototype Pollution in `expandKeys`

| | |
|---|---|
| **Severity** | Critical (CWE-1321: Prototype Pollution; CWE-200) |
| **Affected** | `parse-git-config` `<= 3.0.0` (the original package; no upstream fix exists) |
| **Fixed in** | `@keep-lts/parse-git-config@3.0.1` |
| **Disclosed** | 2025-03-20 |

### Summary

`parse.expandKeys()` turns git-config section names of the form `section "subsection"`
into nested objects. The original implementation assigned into
`config[prop][subsection]` without checking whether `prop` (or `subsection`) named a
reserved JavaScript property. When `prop` is `__proto__`, the assignment reaches
`Object.prototype`, polluting **every object in the running process**. Depending on how
downstream code uses the result, this can escalate to denial of service, logic
bypass, or — if a polluted property flows into a sink such as `child_process` options
or template rendering — remote code execution.

This is reachable in two ways:

1. **Directly**, if an application passes attacker-influenced data to `parse.expandKeys()`.
2. **Through file parsing**, by calling `parse({ expandKeys: true })` /
   `parse.sync({ expandKeys: true })` on a `.git/config` an attacker can write
   (e.g. a cloned/untrusted repository, a CI workspace, a multi-tenant host).

### Proof of concept

```js
const parse = require('parse-git-config'); // vulnerable 3.0.0

parse.expandKeys({ '__proto__ "isPolluted"': true });
console.log(({}).isPolluted); // => true   (Object.prototype polluted)
```

End-to-end via a malicious config file:

```ini
[__proto__ "isPolluted"]
  value = true
```
```js
parse.sync({ path: './evil/.git/config', expandKeys: true });
console.log(({}).isPolluted); // => true
```

### The fix

Section and subsection names that resolve to `__proto__`, `constructor`, or
`prototype` are rejected and dropped. Holder objects are only created on own,
object-typed properties. Legitimate git configuration is unaffected — no real
`.gitconfig` contains a section literally named `__proto__`.

```js
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// ...
if (UNSAFE_KEYS.has(prop) || UNSAFE_KEYS.has(m[2])) {
  delete config[key];
  continue;
}
```

### Remediation

Replace the vulnerable transitive/direct dependency with this drop-in fork. No code
changes are required (the public API is identical):

```json
{
  "overrides": {
    "parse-git-config": "npm:@keep-lts/parse-git-config@^3.0.1"
  }
}
```

Then reinstall. Verify with `npm ls parse-git-config` that the resolved version points
at the fork, and confirm `node -e "require('parse-git-config').expandKeys({'__proto__ \"x\"':1}); console.log(({}).x)"` prints `undefined`.

### Reporting

To report a vulnerability in this fork, open a private security advisory on the fork
repository. Do not file public issues for undisclosed vulnerabilities.

# Security Advisory — url-regex

## CVE-2020-7661 / GHSA-v4rh-8p82-6h5w — Regular Expression Denial of Service in url-regex

| | |
|---|---|
| **Severity** | High (CWE-1333 Inefficient Regular Expression Complexity (ReDoS)) |
| **Affected** | `url-regex` <= 5.0.0 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/url-regex@5.0.1` |

### Summary

url-regex builds a regular expression for matching/validating URLs. Its host and domain sub-patterns contained nested quantifiers that backtrack catastrophically: a string like `http://` followed by a long run of host characters and one non-matching byte takes time quadratic-or-worse in the input length, so untrusted input can hang the event loop (a ~20 KB string already takes ~600 ms; larger inputs take many seconds).

### Proof of concept

```js
const urlRegex = require('url-regex');
const re = urlRegex({ exact: true });
re.test('http://' + 'a'.repeat(200000) + '!'); // hangs for many seconds on 5.0.0
```

### The fix

The host and domain sub-patterns are rewritten from `(?:[a-z0-9][-_]*)*[a-z0-9]+` to `[a-z0-9]+(?:[-_]+[a-z0-9]+)*` (and the `-`-only domain variant similarly). The two forms accept exactly the same hostnames — verified identical across a corpus of 27 URLs in all four strict/exact option combinations — but the rewrite removes the ambiguous overlap that caused backtracking, so matching is linear. Unlike `url-regex-safe`, which only avoids the ReDoS when the optional native `re2` module is installed (and silently falls back to the vulnerable engine otherwise), this fix is pure JavaScript and always safe.

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "url-regex": "npm:@keep-lts/url-regex@^5.0.1"
  }
}
```

Then reinstall and confirm `npm ls url-regex` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

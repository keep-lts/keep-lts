# Security Advisory — html-minifier

## CVE-2022-37620 / GHSA-pfq8-rq6v-vf5m — Regular Expression Denial of Service in html-minifier (reCustomIgnore)

| | |
|---|---|
| **Severity** | High (CWE-1333 Inefficient Regular Expression Complexity (ReDoS)) |
| **Affected** | `html-minifier` <= 4.0.0 (all published versions; the html-minifier-terser successor is also affected) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/html-minifier@4.0.1` |

### Summary

html-minifier's `minify()` replaces "ignored custom fragments" (template tags like `<%...%>` and `<?...?>`) via the `reCustomIgnore` regular expression `\s*(?:...)+\s*`. The leading `\s*` backtracks catastrophically: input containing a long run of whitespace not followed by a fragment makes `minify()` take time quadratic in the input length (a ~160 KB string takes ~40 seconds), so untrusted HTML can hang the event loop. Note: the widely-used successor `html-minifier-terser` ships the identical regex and is also affected; at the time of writing there is no fixed version of either on npm.

### Proof of concept

```js
const { minify } = require('html-minifier');
minify('x' + ' '.repeat(200000) + '!'); // hangs for many seconds on 4.0.0
```

### The fix

The leading `\s*` in `reCustomIgnore` is bounded to `\s{0,100}`. The trailing `\s*` is left unbounded because it only runs after a fragment has matched and therefore never backtracks. No real template has 100+ whitespace characters immediately before an ignored fragment, so minified output is byte-for-byte identical for realistic input — confirmed across 75 input/option combinations against the original. Matching is now linear (a 2 MB worst-case input completes in well under a second).

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "html-minifier": "npm:@keep-lts/html-minifier@^4.0.1"
  }
}
```

Then reinstall and confirm `npm ls html-minifier` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

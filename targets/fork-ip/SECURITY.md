# Security Advisory — ip

## CVE-2024-29415 / GHSA-2p57-rm9w-gvfp — SSRF: ip.isPublic() misclassifies alternative spellings of private and loopback addresses

| | |
|---|---|
| **Severity** | High (CWE-918 Server-Side Request Forgery (SSRF)) |
| **Affected** | `ip` <= 2.0.1 (all published versions) (original package; no upstream fix) |
| **Fixed in** | `@keep-lts/ip@2.0.2` |

### Summary

Apps use ip.isPublic() to stop users from making the server fetch internal URLs (SSRF protection). In ip 2.0.1 it pattern-matched the text of the address, so other spellings of the same internal address passed as public: 127.1 and 017700000001 (localhost), 0.0.0.0 (localhost on most systems), ::fFFf:127.0.0.1 and ::ffff:7f00:1 (IPv4-mapped localhost), and ::ffff:a9fe:a9fe — the cloud metadata service 169.254.169.254, the classic target for stealing cloud credentials. CVE-2024-29415 is the incomplete fix of CVE-2023-42282; the package has had no release since February 2024.

### Proof of concept

```js
const ip = require('ip');
ip.isPublic('127.1');             // true on 2.0.1 (localhost!)
ip.isPublic('::ffff:a9fe:a9fe');  // true on 2.0.1 (169.254.169.254, cloud metadata)
ip.isPublic('0.0.0.0');           // true on 2.0.1
```

### The fix

Classification now works on bytes, not text. Regression tests cover 37 alternative spellings that must not be public (the six from the CVE included) and 14 spellings of 127.0.0.1 that must be loopback; both fail on 2.0.1. Behaviour is otherwise unchanged: 20,000 canonical IPv4 addresses and their ::ffff: forms, plus canonical IPv6, classify identically to 2.0.1; invalid input returns or throws exactly as before; and the rest of the API (toBuffer, mask, cidr, subnet, toLong, address, ...) is untouched. Two deliberate hardening changes, both towards 'not public': 0.0.0.0/8 is now private (it reaches localhost), and all of fe80::/10 is link-local (2.0.1 only matched fe80:).

### Remediation

Replace the vulnerable dependency with this drop-in fork — no code changes required:

```json
{
  "overrides": {
    "ip": "npm:@keep-lts/ip@^2.0.2"
  }
}
```

Then reinstall and confirm `npm ls ip` resolves to the fork.

### Reporting

Report vulnerabilities in this fork via a private security advisory on the fork repository.

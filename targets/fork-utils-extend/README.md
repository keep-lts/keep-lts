# @keep-lts/utils-extend

> Security-maintained, drop-in fork of [`utils-extend`](https://www.npmjs.com/package/utils-extend).

> [!IMPORTANT]
> **Unofficial security-maintenance fork.** The original `utils-extend` has no fix for
> **CVE-2024-57077 / CVE-2020-8147 / GHSA-7qgg-vw88-cc99 / GHSA-6pq3-928q-x6w6** (Critical). This fork applies a minimal, tested patch and keeps the
> public API byte-for-byte compatible. Adopt with zero code changes via npm `overrides`:
>
> ```json
> { "overrides": { "utils-extend": "npm:@keep-lts/utils-extend@^1.0.9" } }
> ```
>
> See [SECURITY.md](./SECURITY.md) and [CHANGELOG.md](./CHANGELOG.md). Original functionality
> and attribution preserved under the ISC license.

> **Running this in production for an audited team?** [Keep LTS Pro](https://keep-lts.com/#pro)
> adds an SLA on future CVEs, SBOM/VEX for your auditor, and fixes for the other dead dependencies in
> your tree. Async, no sales calls. Questions: hello@keep-lts.com

---

# utils-extend
[![NPM](https://nodei.co/npm/utils-extend.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/utils-extend/)  
Extend nodejs util api, and it is light weight and simple.
```
var util = require('utils-extend');
```
### install
```
npm install utils-extend --save
```
## API
### util
Extend api in nodejs util module, 

### util.extend
Deep clone soure object to target
```js
var target = {};
var source = {
  k: 'v',
  k2: []
};
var source2 = {
  k3: { }  
};

util.extend(target, source, source2);
```

### util.isObject
Check target is object, array and function return false.

### util.isArray
Chck target is array
```
uitl.isArray = Array.isArray

```
### util.isNumber

### util.isDate

### util.isRegExp

### util.isFunction

### util.isString

### util.isUndefined

### util.noop
Empty function

### util.unique
Make array unique.
```
var arr = [4, 5, 5, 6];
var result = uitl.unique(arr);
```
### util.pick
Return a copy of the object with list keys
```js
util.pick({ key: 'value' }, 'key');
util.pick({ key: 'value' }, function(value, key, object) { });
```

### util.escape
Escapes a string for insertion into HTML, replacing &, <, >, ", `, and ' characters.
```js
var html = '<div></div>'
var result = util.escape('<div></div>')
```

### util.unescape
The opposite of escape

### util.path.isAbsolute
Return true is path isabsolute, otherwise return false.
```
util.path.isAbsolute('C:\\file\\path');          // windows
util.path.isAbsolute('/file/path');              // unix
```

### util.path.unixifyPath
Normalize \ paths to / paths.

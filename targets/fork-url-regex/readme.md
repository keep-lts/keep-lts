# @keep-lts/url-regex

> Security-maintained, drop-in fork of [`url-regex`](https://www.npmjs.com/package/url-regex).

> [!IMPORTANT]
> **Unofficial security-maintenance fork.** The original `url-regex` has no fix for
> **CVE-2020-7661 / GHSA-v4rh-8p82-6h5w** (High). This fork applies a minimal, tested patch and keeps the
> public API byte-for-byte compatible. Adopt with zero code changes via npm `overrides`:
>
> ```json
> { "overrides": { "url-regex": "npm:@keep-lts/url-regex@^5.0.1" } }
> ```
>
> See [SECURITY.md](./SECURITY.md) and [CHANGELOG.md](./CHANGELOG.md). Original functionality
> and attribution preserved under the MIT license.

> **Running this in production for an audited team?** [Keep LTS Pro](https://keep-lts.com/#pro)
> adds an SLA on future CVEs, SBOM/VEX for your auditor, and fixes for the other dead dependencies in
> your tree. Async, no sales calls. Questions: hello@keep-lts.com

---

# url-regex [![Build Status](http://img.shields.io/travis/kevva/url-regex.svg?style=flat)](https://travis-ci.org/kevva/url-regex)

> Regular expression for matching URLs

Based on this [gist](https://gist.github.com/dperini/729294) by Diego Perini.


## Install

```
$ npm install url-regex
```


## Usage

```js
const urlRegex = require('url-regex');

urlRegex().test('http://github.com foo bar');
//=> true

urlRegex().test('www.github.com foo bar');
//=> true

urlRegex({exact: true}).test('http://github.com foo bar');
//=> false

urlRegex({exact: true}).test('http://github.com');
//=> true

urlRegex({strict: false}).test('github.com foo bar');
//=> true

urlRegex({exact: true, strict: false}).test('github.com');
//=> true

'foo http://github.com bar //google.com'.match(urlRegex());
//=> ['http://github.com', '//google.com']
```


## API

### urlRegex([options])

Returns a `RegExp` for matching URLs.

#### options

##### exact

Type: `boolean`<br>
Default: `false`

Only match an exact string. Useful with `RegExp#test` to check if a string is a URL.

##### strict

Type: `boolean`<br>
Default: `true`

Force URLs to start with a valid protocol or `www`. If set to `false` it'll match the TLD against a list of valid [TLDs](https://github.com/stephenmathieson/node-tlds).


## Related

- [get-urls](https://github.com/sindresorhus/get-urls) - Get all URLs in text
- [linkify-urls](https://github.com/sindresorhus/linkify-urls) - Linkify URLs in text


## License

MIT © [Kevin Mårtensson](https://github.com/kevva) and [Diego Perini](https://github.com/dperini)

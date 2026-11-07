# @keep-lts/extract-zip

> Security-maintained, drop-in fork of [`extract-zip`](https://www.npmjs.com/package/extract-zip).

> [!IMPORTANT]
> **Unofficial security-maintenance fork.** The original `extract-zip` has no fix for
> **CVE-2026-56876 / CVE-2026-19693 / GHSA-jmr9-qjv8-65gv / GHSA-7pqw-9j4j-h8q3** (High). This fork applies a minimal, tested patch and keeps the
> public API byte-for-byte compatible. Adopt with zero code changes via npm `overrides`:
>
> ```json
> { "overrides": { "extract-zip": "npm:@keep-lts/extract-zip@^2.0.2" } }
> ```
>
> See [SECURITY.md](./SECURITY.md) and [CHANGELOG.md](./CHANGELOG.md). Original functionality
> and attribution preserved under the BSD-2-Clause license.

---

# extract-zip

Unzip written in pure JavaScript. Extracts a zip into a directory. Available as a library or a command line program.

Uses the [`yauzl`](http://npmjs.org/yauzl) ZIP parser.

[![NPM](https://nodei.co/npm/extract-zip.png?global=true)](https://npm.im/extract-zip)
[![Uses JS Standard Style](https://cdn.jsdelivr.net/gh/standard/standard/badge.svg)](https://github.com/standard/standard)
[![Build Status](https://github.com/maxogden/extract-zip/workflows/CI/badge.svg)](https://github.com/maxogden/extract-zip/actions?query=workflow%3ACI)

## Installation

Make sure you have Node 10 or greater installed.

Get the library:

```
npm install extract-zip --save
```

Install the command line program:

```
npm install extract-zip -g
```

## JS API

```javascript
const extract = require('extract-zip')

async function main () {
  try {
    await extract(source, { dir: target })
    console.log('Extraction complete')
  } catch (err) {
    // handle any errors
  }
}
```

### Options

- `dir` (required) - the path to the directory where the extracted files are written
- `defaultDirMode` - integer - Directory Mode (permissions), defaults to `0o755`
- `defaultFileMode` - integer - File Mode (permissions), defaults to `0o644`
- `onEntry` - function - if present, will be called with `(entry, zipfile)`, entry is every entry from the zip file forwarded from the `entry` event from yauzl. `zipfile` is the `yauzl` instance

Default modes are only used if no permissions are set in the zip file.

## CLI Usage

```
extract-zip foo.zip <targetDirectory>
```

If not specified, `targetDirectory` will default to `process.cwd()`.

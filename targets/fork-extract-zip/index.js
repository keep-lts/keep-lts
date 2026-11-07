const debug = require('debug')('extract-zip')
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const { createWriteStream, promises: fs } = require('fs')
const getStream = require('get-stream')
const path = require('path')
const { promisify } = require('util')
const stream = require('stream')
const yauzl = require('yauzl')

const openZip = promisify(yauzl.open)
const pipeline = promisify(stream.pipeline)

// Keep LTS security patch (CVE-2026-19693, CVE-2026-56876):
// extraction must never read or write outside the target directory.

// True if `target` is `dir` itself or somewhere underneath it (absolute paths).
function isInside (dir, target) {
  const relative = path.relative(dir, target)
  if (relative === '') return true
  return !relative.split(path.sep).includes('..') && !path.isAbsolute(relative)
}

// Resolve a symlink's target the way the OS will, starting from the real
// directory that contains the link, following any symlinks that already exist.
// Returns null for targets we refuse outright:
//  - absolute targets (could point anywhere), and
//  - targets with a `..` after a normal segment (e.g. `x/../y`). The OS applies
//    `..` after following `x`, so if `x` is (or later becomes) a symlink the
//    target can escape even though it looks contained on paper.
async function resolveLinkTarget (realParentDir, link) {
  if (path.isAbsolute(link) || path.win32.isAbsolute(link) || path.posix.isAbsolute(link)) return null
  const segments = link.split(/[\\/]+/).filter(s => s !== '' && s !== '.')
  let seenName = false
  let current = realParentDir
  for (const segment of segments) {
    if (segment === '..') {
      if (seenName) return null
      current = path.dirname(current)
      continue
    }
    seenName = true
    const next = path.join(current, segment)
    try {
      current = await fs.realpath(next)
    } catch (err) {
      /* istanbul ignore if */
      if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') throw err
      current = next
    }
  }
  return current
}

// Remove a symlink sitting at `dest` so we replace it instead of writing
// through it (CVE-2026-19693). Real files and directories are left alone.
async function removeSymlinkAt (dest) {
  let stats
  try {
    stats = await fs.lstat(dest)
  } catch (err) {
    /* istanbul ignore if */
    if (err.code !== 'ENOENT') throw err
    return
  }
  if (stats.isSymbolicLink()) {
    debug('removing existing symlink', dest)
    await fs.unlink(dest)
  }
}

class Extractor {
  constructor (zipPath, opts) {
    this.zipPath = zipPath
    this.opts = opts
  }

  async extract () {
    debug('opening', this.zipPath, 'with opts', this.opts)

    this.zipfile = await openZip(this.zipPath, { lazyEntries: true })
    this.canceled = false

    return new Promise((resolve, reject) => {
      this.zipfile.on('error', err => {
        this.canceled = true
        reject(err)
      })
      this.zipfile.readEntry()

      this.zipfile.on('close', () => {
        if (!this.canceled) {
          debug('zip extraction complete')
          resolve()
        }
      })

      this.zipfile.on('entry', async entry => {
        /* istanbul ignore if */
        if (this.canceled) {
          debug('skipping entry', entry.fileName, { cancelled: this.canceled })
          return
        }

        debug('zipfile entry', entry.fileName)

        if (entry.fileName.startsWith('__MACOSX/')) {
          this.zipfile.readEntry()
          return
        }

        const destDir = path.dirname(path.join(this.opts.dir, entry.fileName))

        try {
          await fs.mkdir(destDir, { recursive: true })

          const canonicalDestDir = await fs.realpath(destDir)

          if (!isInside(this.opts.dir, canonicalDestDir)) {
            throw new Error(`Out of bound path "${canonicalDestDir}" found while processing file ${entry.fileName}`)
          }

          await this.extractEntry(entry)
          debug('finished processing', entry.fileName)
          this.zipfile.readEntry()
        } catch (err) {
          this.canceled = true
          this.zipfile.close()
          reject(err)
        }
      })
    })
  }

  async extractEntry (entry) {
    /* istanbul ignore if */
    if (this.canceled) {
      debug('skipping entry extraction', entry.fileName, { cancelled: this.canceled })
      return
    }

    if (this.opts.onEntry) {
      this.opts.onEntry(entry, this.zipfile)
    }

    const dest = path.join(this.opts.dir, entry.fileName)

    // Backstop: yauzl already rejects absolute and `..` entry names.
    /* istanbul ignore if */
    if (!isInside(this.opts.dir, dest)) {
      throw new Error(`Out of bound path "${dest}" found while processing file ${entry.fileName}`)
    }

    // convert external file attr int into a fs stat mode int
    const mode = (entry.externalFileAttributes >> 16) & 0xFFFF
    // check if it's a symlink or dir (using stat mode constants)
    const IFMT = 61440
    const IFDIR = 16384
    const IFLNK = 40960
    const symlink = (mode & IFMT) === IFLNK
    let isDir = (mode & IFMT) === IFDIR

    // Failsafe, borrowed from jsZip
    if (!isDir && entry.fileName.endsWith('/')) {
      isDir = true
    }

    // check for windows weird way of specifying a directory
    // https://github.com/maxogden/extract-zip/issues/13#issuecomment-154494566
    const madeBy = entry.versionMadeBy >> 8
    if (!isDir) isDir = (madeBy === 0 && entry.externalFileAttributes === 16)

    debug('extracting entry', { filename: entry.fileName, isDir: isDir, isSymlink: symlink })

    const procMode = this.getExtractedMode(mode, isDir) & 0o777

    // always ensure folders are created
    const destDir = isDir ? dest : path.dirname(dest)

    const mkdirOptions = { recursive: true }
    if (isDir) {
      mkdirOptions.mode = procMode
    }
    debug('mkdir', { dir: destDir, ...mkdirOptions })
    await fs.mkdir(destDir, mkdirOptions)
    if (isDir) return

    debug('opening read stream', dest)
    const readStream = await promisify(this.zipfile.openReadStream.bind(this.zipfile))(entry)

    if (symlink) {
      const link = await getStream(readStream)
      // CVE-2026-56876: a symlink may not point outside the target directory.
      const realParent = await fs.realpath(path.dirname(dest))
      const resolved = await resolveLinkTarget(realParent, link)
      if (resolved === null || !isInside(this.opts.dir, resolved)) {
        throw new Error(`Out of bound symlink target "${link}" found while processing file ${entry.fileName}`)
      }
      debug('creating symlink', link, dest)
      await removeSymlinkAt(dest)
      await fs.symlink(link, dest)
    } else {
      // CVE-2026-19693: never write through a symlink planted at this path.
      await removeSymlinkAt(dest)
      await pipeline(readStream, createWriteStream(dest, { mode: procMode }))
    }
  }

  getExtractedMode (entryMode, isDir) {
    let mode = entryMode
    // Set defaults, if necessary
    if (mode === 0) {
      if (isDir) {
        if (this.opts.defaultDirMode) {
          mode = parseInt(this.opts.defaultDirMode, 10)
        }

        if (!mode) {
          mode = 0o755
        }
      } else {
        if (this.opts.defaultFileMode) {
          mode = parseInt(this.opts.defaultFileMode, 10)
        }

        if (!mode) {
          mode = 0o644
        }
      }
    }

    return mode
  }
}

module.exports = async function (zipPath, opts) {
  debug('creating target directory', opts.dir)

  if (!path.isAbsolute(opts.dir)) {
    throw new Error('Target directory is expected to be absolute')
  }

  await fs.mkdir(opts.dir, { recursive: true })
  opts.dir = await fs.realpath(opts.dir)
  return new Extractor(zipPath, opts).extract()
}

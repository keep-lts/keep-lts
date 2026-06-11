'use strict';

/**
 * CVE-2021-25943: `set`/`put` pass user-supplied keypaths straight to keypather,
 * which walks `__proto__`/`constructor`/`prototype` segments and can mutate
 * Object.prototype. This wrapper rejects any keypath that targets a prototype
 * slot before delegating; legitimate keypaths are unaffected.
 */
var UNSAFE_SEGMENT = /(?:^|[.\[])\s*['"]?(?:__proto__|constructor|prototype)['"]?\s*(?:[.\]]|$)/;

module.exports = function safeKeypatherSet(keypather, obj, keypath, val) {
  if (UNSAFE_SEGMENT.test(String(keypath))) {
    return obj;
  }
  return keypather.set(obj, keypath, val);
};

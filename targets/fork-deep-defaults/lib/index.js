'use strict';

var _ = require('lodash');

/**
 * Recursively assigns own enumerable properties of the source object to the destination object for all destination properties that resolve to undefined.
 * @param {Object} dest destination object; this object is modified.
 * @param {Object} src source object that has the defaults
 * @returns {Object} destination object
 */
function _deepDefaults(dest, src) {
    if(_.isUndefined(dest) || _.isNull(dest) || !_.isPlainObject(dest)) { return dest; }

    _.each(src, function(v, k) {
        // CVE-2021-25944: skip keys that name a prototype slot, otherwise a
        // `__proto__` key recurses into Object.prototype and pollutes it.
        if(k === '__proto__' || k === 'constructor' || k === 'prototype') { return; }
        if(_.isUndefined(dest[k])) {
            dest[k] = v;
        } else if(_.isPlainObject(v)) {
            _deepDefaults(dest[k], v);
        }
    });

    return dest;
}

exports = module.exports = _deepDefaults;
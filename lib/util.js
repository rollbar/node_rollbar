// Adapted from https://github.com/rollbar/rollbar.js/blob/master/src/util.js
exports.merge = function() {
  var options, name, src, copy, copyIsArray, clone,
    target = arguments[0] || {},
    i = 1,
    length = arguments.length,
    deep = true;

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && typeof target !== 'function') {
    target = {};
  }

  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        // IE8 will iterate over properties of objects like "indexOf"
        if (!options.hasOwnProperty(name)) {
          continue;
        }

        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy) {
          continue;
        }

        // Recurse if we're merging plain objects or arrays
        if (deep && copy && (copy.constructor == Object || (copyIsArray = (copy.constructor == Array)))) {
          if (copyIsArray) {
            copyIsArray = false;
            // Overwrite the source with a copy of the array to merge in
            clone = [];
          } else {
            clone = src && src.constructor == Object ? src : {};
          }

          // Never move original objects, clone them
          target[name] = exports.merge(clone, copy);

        // Don't bring in undefined values
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }

  // Return the modified object
  return target;
}

/*jslint devel: true, nomen: true, plusplus: true, regexp: true, indent: 2, maxlen: 100 */

"use strict";

var debug = require('debug');
var name = 'Rollbar';

// Enable output to stdout
debug.enable(name + ':log,' + name + ':error');

var logger = {
  log: debug(name + ':log'),
  error: debug(name + ':error')
};

module.exports = logger;

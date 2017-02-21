/*jslint devel: true, nomen: true, indent: 2, maxlen: 100 */

"use strict";

var deploy = require('./lib/deploy');

exports.createDeploy = deploy.createDeploy;
exports.getDeploy = deploy.getDeploy;
exports.listDeploys = deploy.listDeploys;

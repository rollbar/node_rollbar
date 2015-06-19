/*jslint devel: true, nomen: true, plusplus: true, regexp: true, indent: 2, maxlen: 100 */

"use strict";

var async = require('async');
var http = require('http');
var https = require('https');
var uuid = require('node-uuid');
var os = require('os');
var url = require('url');

var parser = require('./parser');
var packageJson = require('../package.json');

var SETTINGS = {
  accessToken: null,
  codeVersion: null,
  host: os.hostname(),
  environment: 'development',
  framework: 'node-js',
  root: null,  // root path to your code
  branch: null,  // git branch name
  notifier: {
    name: 'node_rollbar',
    version: packageJson.version
  },
  scrubHeaders: [],
  scrubFields: ['passwd', 'password', 'secret', 'confirm_password', 'password_confirmation'],
  addRequestData: null  // Can be set by the user or will default to addRequestData defined below
};

/*
 * Public API
 */

var Notifier = function(api, options) {
  var opt;

  this.accessToken = api.accessToken;
  this.apiClient = api;
  this.settings = JSON.parse(JSON.stringify(SETTINGS));
  this.VERSION = SETTINGS.notifier.version;

  options = options || {};

  for (opt in options) {
    if (options.hasOwnProperty(opt)) {
      this.settings[opt] = options[opt];
    }
  }
};


Notifier.prototype.handleError = function (err, req, callback) {
  return this.handleErrorWithPayloadData(err, {}, req, callback);
};


Notifier.prototype.handleErrorWithPayloadData = function (err, payloadData, req, callback) {
  // Allow the user to call with an optional request and callback
  // e.g. handleErrorWithPayloadData(err, payloadData, req, callback) 
  //   or handleErrorWithPayloadData(err, payloadData, callback)
  //   or handleErrorPayloadData(err, payloadData)
  if (typeof req === 'function') {
    callback = req;
    req = null;
  }

  if (!(err instanceof Error)) {
    if (typeof callback === 'function') {
      return callback(new Error('handleError was passed something other than an Error'));
    }
  }

  this._addItem({error: err, payload: payloadData, request: req}, callback);
};


Notifier.prototype.reportMessage = function (message, level, req, callback) {
  return this.reportMessageWithPayloadData(message, {level: level}, req, callback);
};


Notifier.prototype.reportMessageWithPayloadData = function (message, payloadData, req, callback) {
  this._addItem({message: message, payload: payloadData, request: req}, callback);
};


module.exports = Notifier;

/** Private **/

Notifier.prototype._buildBaseData = function(extra) {
  var data, props;

  extra = extra || {};
  data = {
    timestamp: Math.floor((new Date().getTime()) / 1000),
    environment: extra.environment || this.settings.environment,
    level: extra.level || 'error',
    language: 'javascript',
    framework: extra.framework || this.settings.framework,
    uuid: genUuid(),
    notifier: JSON.parse(JSON.stringify(this.settings.notifier))
  };

  if (this.settings.codeVersion) {
    data.code_version = this.settings.codeVersion;
  }

  props = Object.getOwnPropertyNames(extra);
  props.forEach(function (name) {
    if (!data.hasOwnProperty(name)) {
      data[name] = extra[name];
    }
  });

  data.server = {
    host: this.settings.host,
    argv: process.argv.concat(),
    pid: process.pid
  }

  data.server.host = this.settings.host;

  if (this.settings.branch) {
    data.server.branch = this.settings.branch;
  }
  if (this.settings.root) {
    data.server.root = this.settings.root;
  }

  return data;
};


Notifier.prototype._scrubRequestHeaders = function(headers, settings) {
  var obj, k;

  obj = {};
  settings = settings || this.settings;
  for (k in headers) {
    if (headers.hasOwnProperty(k)) {
      if (settings.scrubHeaders.indexOf(k) === -1) {
        obj[k] = headers[k];
      } else {
        obj[k] = charFill('*', headers[k].length);
      }
    }
  }
  return obj;
};


Notifier.prototype._scrubRequestParams = function(params, settings) {
  var k;

  settings = settings || this.settings;
  for (k in params) {
    if (params.hasOwnProperty(k) && params[k] && settings.scrubFields.indexOf(k) >= 0) {
      params[k] = charFill('*', params[k].length);
    }
  }

  return params;
};


Notifier.prototype._buildItemData = function(item, callback) {
  var baseData, steps;
  var self = this;

  baseData = this._buildBaseData(item.payload);

  // Add the message to baseData if there is one
  function addMessageData(callback) {
    baseData.body = {};
    if (item.message !== undefined) {
      baseData.body.message = {
        body: item.message
      };
    }
    callback(null);
  }

  // Add the error trace information to baseData if there is one
  function addTraceData(callback) {
    if (item.error) {
      buildErrorData(baseData, item.error, callback);
    } else {
      callback(null);
    }
  }

  // Add the request information to baseData if there is one
  function addReqData(callback) {
    var addReqDataFn = self.settings.addRequestData || self._addRequestData.bind(self);
    if (item.request) {
      addReqDataFn(baseData, item.request);
    }
    callback(null);
  }

  steps = [
    addMessageData,
    addTraceData,
    addReqData
  ];

  async.series(steps, function (err) {
    if (err) {
      callback(err);
    }
    callback(null, baseData);
  });
};


Notifier.prototype._addItem = function(item, callback) {
  var self = this;

  if (typeof callback !== 'function') {
    callback = function dummyCallback() {};
  }

  try {
    this._buildItemData(item, function (err, data) {
      if (err) {
        return callback(err);
      }
      self.apiClient.postItem(data, function (err, resp) {
        if (typeof callback === 'function') {
          callback(err, data, resp);
        }
      });
    });
  } catch (e) {
    console.error('[Rollbar] Internal error while building payload: ' + e);
    callback(e);
  }
};


Notifier.prototype._buildRequestData = function(req) {
  var headers, host, proto, reqUrl, parsedUrl, data, bodyParams, k;

  headers = req.headers || {};
  host = headers.host || '<no host>';
  proto = req.protocol || (req.socket && req.socket.encrypted) ? 'https' : 'http';
  reqUrl = proto + '://' + host + (req.url || '');
  parsedUrl = url.parse(reqUrl, true);
  data = {url: reqUrl,
    GET: parsedUrl.query,
    user_ip: extractIp(req),
    headers: this._scrubRequestHeaders(headers),
    method: req.method};

  if (req.body) {
    bodyParams = {};
    if (typeof req.body === 'object') {
      for (k in req.body) {
        if (req.body.hasOwnProperty(k)) {
          bodyParams[k] = req.body[k];
        }
      }
      data[req.method] = _scrubRequestParams(bodyParams);
    } else {
      data.body = req.body;
    }
  }

  return data;
};

Notifier.prototype._addRequestData = function(data, req) {
  var reqData, userId;

  reqData = this._buildRequestData(req);
  if (reqData) {
    data.request = reqData;
  }

  if (req.route) {
    data.context = req.route.path;
  } else {
    try {
      data.context = req.app._router.matchRequest(req).path;
    } catch (ignore) {
      // ignore
    }
  }

  if (req.rollbar_person) {
    data.person = req.rollbar_person;
  } else if (req.user) {
    data.person = {id: req.user.id};
    if (req.user.username) {
      data.person.username = req.user.username;
    }
    if (req.user.email) {
      data.person.email = req.user.email;
    }
  } else if (req.user_id || req.userId) {
    userId = req.user_id || req.userId;
    if (typeof userId === 'function') {
      userId = userId();
    }
    data.person = {id: userId};
  }
};



/*
 * Exports for testing
 */

Notifier.prototype._extractIp = function (req) {
  return extractIp(req);
};


/*
 * Internal
 */

function genUuid() {
  var buf = new Buffer(16);
  uuid.v4(null, buf);
  return buf.toString('hex');
}


function buildErrorData(baseData, err, callback) {
  parser.parseException(err, function (e, errData) {
    if (e) {
      return callback(e);
    }
    baseData.body.trace = {
      frames: errData.frames,
      exception: {
        class: errData['class'],
        message: errData.message
      }
    };

    callback(null);
  });
}


function charFill(char, num) {
  var a, x;

  a = [];
  x = num;
  while (x > 0) {
    a[x] = '';
    x -= 1;
  }
  return a.join(char);
}


function extractIp(req) {
  var ip = req.ip;
  if (!ip) {
    if (req.headers) {
      ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];
    }
    if (!ip && req.connection && req.connection.remoteAddress) {
      ip = req.connection.remoteAddress;
    }
  }
  return ip;
}



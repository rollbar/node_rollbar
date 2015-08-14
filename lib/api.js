/*jslint devel: true, nomen: true, plusplus: true, regexp: true, indent: 2, maxlen: 100 */

"use strict";

var async = require('async');
var url = require('url');
var http = require('http');
var https = require('https');
var stringify = require('json-stringify-safe');

var SETTINGS = {
  protocol: 'https',
  version: '1',
  endpoint: 'https://api.rollbar.com/api/1/',
  verbose: true,
  proxy: null
};

/*
 * Public API
 */

var Api = function (accessToken, options) {
  var opt, portCheck;

  options = options || {};
  this.accessToken = accessToken;
  this.endpoint = options.endpoint || Api.endpoint;
  this.settings = JSON.parse(JSON.stringify(SETTINGS));

  this.version = SETTINGS.version;
  this.endpoint = SETTINGS.endpoint;

  for (opt in options) {
    if (options.hasOwnProperty(opt)) {
      this.settings[opt] = options[opt];
    }
  }

  this.settings.endpointOpts = url.parse(this.endpoint);
  this.settings.protocol = this.settings.endpointOpts.protocol.split(':')[0];
  this.settings.transport = {http: http, https: https}[this.settings.protocol];
  this.settings.proxy = options.proxy;

  portCheck = this.settings.endpointOpts.host.split(':');
  if (portCheck.length > 1) {
    this.settings.endpointOpts.host = portCheck[0];
    this.settings.port = parseInt(portCheck[1], 10);
  }
};

Api.prototype.postItem = function (item, callback) {
  return this._postApi('item/', this._buildPayload(item), callback);
};

module.exports = Api;

/*
 * Private
 */

Api.prototype._transportOpts = function(path, method) {
  var port;
  port = this.settings.port ||
      (this.settings.protocol === 'http' ? 80 : (this.settings.protocol === 'https' ? 443 : undefined));

  return {
    host: this.settings.endpointOpts.host,
    port: port,
    path: this.settings.endpointOpts.path + path,
    method: method
  };
}


Api.prototype._parseApiResponse = function(respData, callback) {
  try {
    respData = JSON.parse(respData);
  } catch (e) {
    console.error('[Rollbar] Could not parse api response, err: ' + e);
    return callback(e);
  }

  if (respData.err) {
    console.error('[Rollbar] Received error: ' + respData.message);
    return callback(new Error('Api error: ' + (respData.message || 'Unknown error')));
  }

  if (this.settings.verbose) {
    console.log('[Rollbar] Successful api response');
  }
  callback(null, respData.result);
}


Api.prototype._makeApiRequest = function(transport, opts, bodyObj, callback) {
  var writeData, req;
  var self = this;

  if (!bodyObj) {
    return callback(new Error('Cannot send empty request'));
  }

  try {
    try {
      writeData = JSON.stringify(bodyObj);
    } catch (e) {
      console.error('[Rollbar] Could not serialize to JSON - falling back to safe-stringify');
      writeData = stringify(bodyObj);
    }
  } catch (e) {
    console.error('[Rollbar] Could not safe-stringify data. Giving up');
    return callback(e);
  }

  opts.headers = opts.headers || {};

  opts.headers['Content-Type'] = 'application/json';
  opts.headers['Content-Length'] = Buffer.byteLength(writeData, 'utf8');
  opts.headers['X-Rollbar-Access-Token'] = this.accessToken;

  if (this.settings.proxy) {
    opts.path = this.settings.protocol + '://' + opts.host + opts.path;
    opts.host = this.settings.proxy.host;
    opts.port = this.settings.proxy.port;
    transport = http;
  }

  req = transport.request(opts, function (resp) {
    var respData = [];

    resp.setEncoding('utf8');
    resp.on('data', function (chunk) {
      respData.push(chunk);
    });

    resp.on('end', function () {
      respData = respData.join('');
      self._parseApiResponse(respData, callback);
    });
  });

  req.on('error', function (err) {
    console.error('[Rollbar] Could not make request to rollbar, ' + err);
    callback(err);
  });

  if (writeData) {
    req.write(writeData);
  }
  req.end();
}


Api.prototype._postApi = function(path, payload, callback) {
  var transport, opts;

  transport = this.settings.transport;
  opts = this._transportOpts(path, 'POST');

  return this._makeApiRequest(transport, opts, payload, callback);
}


Api.prototype._buildPayload = function(data) {
  var payload;

  payload = {
    access_token: this.accessToken,
    data: data
  };

  return payload;
}


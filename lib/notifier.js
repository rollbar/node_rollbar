var http = require('http');
var https = require('https');
var uuid = require('node-uuid');
var os = require('os');
var url = require('url');
var util = require('util');

var parser = require('./parser');
var packageJson = require('../package.json');

exports.VERSION = packageJson.version;
exports.endpoint = 'https://submit.ratchet.io/api/1/';

var SETTINGS = {
  accessToken: null,
  host: os.hostname(),
  environment: 'development',
  framework: 'node-js',
  root: null,  // root path to your code
  branch: null,  // git branch name
  handler: 'setInterval',  // 'nextTick' or 'setInterval' or 'inline'
  handlerInterval: 3,  // number of seconds to use with setInterval handler
  batchSize: 10,
  endpoint: exports.endpoint,
  notifier: {
    name: 'node_ratchet',
    version: exports.VERSION
  },
  scrubFields: ['passwd', 'password', 'secret']
};

var apiClient;
var pendingItems = [];
var intervalHandler;

/*
 * Public API
 */

exports.init = function(api, options) {
  apiClient = api;
  options = options || {};
  SETTINGS.accessToken = api.accessToken;
  for (var opt in options) {
    SETTINGS[opt] = options[opt];
  }

  if (SETTINGS.handler == 'setInterval') {
    intervalHandler = setInterval(postItems, SETTINGS.handlerInterval * 1000);
  }
};

exports.shutdown = function(callback) {
  exports.changeHandler('inline');
  clearIntervalHandler();
  postItems(callback);
};


exports.changeHandler = function(newHandler) {
  clearIntervalHandler();
  SETTINGS.handler = newHandler;
  if (newHandler == 'setInterval') {
    intervalHandler = setInterval(postItems, SETTINGS.handlerInterval * 1000);
  }
};

exports.handleError = function(err, req, callback) {
  // Allow the user to call with an optional request and callback
  // e.g. handleError(err, req, callback) or handleError(err, callback)
  //      or handleError(err)
  if (typeof req === 'function') {
    callback = req;
    req = null;
  }
  callback = callback || function(err) {};

  if (!(err instanceof Error)) {
    return callback(new Error('handleError was passed something other than an Error'));
  }
  return parser.parseException(err, function(e, errData) {
    if (e) {
      return callback(e);
    } else {
      var data = buildBaseData();
      data.body = {
        trace: {
          frames: errData.frames,
          exception: {
            class: errData['class'],
            message: errData.message
          }
        }
      };

      if (req) {
        addRequestData(data, req);
      }
      data.server = buildServerData();
      return addItem(data, callback);
    }
  });
};


exports.reportMessage = function(message, level, req, callback) {
  level = level || 'error';
  var data = buildBaseData();
  data.level = level;
  data.body = {
    message: {
      body: message
    }
  };

  if (req) {
    addRequestData(data, req);
  }
  data.server = buildServerData();
  return addItem(data, callback);
};


/** Internal **/

function postItems(callback) {
  var items;
  var numToRemove;
  callback = callback || function(err, apiResp) {};

  var looper = function(err, apiResp) {
    if (err) {
      return callback(err);
    } else if (pendingItems.length) {
      numToRemove = Math.min(pendingItems.length, SETTINGS.batchSize);
      items = pendingItems.splice(0, numToRemove);

      return apiClient.postItems(items, looper);
    } else {
      return callback(null);
    }
  };
  return looper();
};

function addItem(item, callback) {
  pendingItems.push(item);

  if (SETTINGS.handler == 'nextTick') {
    process.nextTick(function() {
      postItems(callback);
    });
  } else if (SETTINGS.handler == 'inline') {
    return postItems(callback);
  } else {
    if (callback && typeof callback === 'function') {
      return callback(null);
    }
  }
}


function buildBaseData(level) {
  level = level || 'error';
  return {timestamp: Math.floor((new Date().getTime()) / 1000),
          environment: SETTINGS.environment,
          level: level,
          language: 'javascript',
          framework: SETTINGS.framework,
          uuid: genUuid(),
          notifier: SETTINGS.notifier};
}


function addRequestData(data, req) {
  var reqData = buildRequestData(req);
  if (reqData) {
    data.request = reqData;
  }

  if (req.ratchet_person) {
    data.person = req.ratchet_person;
  } else if (req.user_id || req.userId) {
    var userId = req.user_id || req.userId;
    if (typeof userId === 'function') {
      userId = userId();
    }
    data.person = {id: userId};
  }
}


function buildServerData() {
  var data = {
    host: SETTINGS.host
  };

  if (SETTINGS.branch) {
    data.branch = SETTINGS.branch;
  }
  if (SETTINGS.root) {
    data.root = SETTINGS.root;
  }
  return data;
}


function buildRequestData(req) {
  var host = req.headers.host || '<no host>';
  var proto = req.protocol || req.socket.encrypted ? 'https' : 'http';
  var reqUrl = proto + '://' + host + req.url;
  var parsedUrl = url.parse(reqUrl, true);
  var data = {url: reqUrl,
              GET: parsedUrl.query,
              user_ip: extractIp(req),
              headers: req.headers,
              method: req.method};
  if (req.method == 'POST') {
    var postParams = {};
    if (req.body) {
      if (typeof req.body === 'object') {
        for (var k in req.body) {
          postParams[k] = req.body[k];
        }
        data.POST = scrub_request_params(postParams);
      } else {
        data.body = req.body;
      }
    }
  }

  return data;
}


function scrub_request_params(params) {
  for (var k in params) {
    if (SETTINGS.scrubFields.indexOf(k) >= 0) {
      params[k] = Array(params[k].length + 1).join('*');
    }
  }
  
  return params;
}


function extractIp(req) {
  return req.ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}


function clearIntervalHandler() {
  if (intervalHandler) {
    clearInterval(intervalHandler);
  }
}

function genUuid() {
  var buf = new Buffer(16);
  uuid.v4(null, buf);
  return buf.toString('hex');
}

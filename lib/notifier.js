var events = require('events'),
    http = {http: require('http'), https: require('https')},
    node_util = require('util'),
    os = require('os'),
    parseUrl = require('url').parse,
    ratchetParser = require('./parser'),
    querystring = require('querystring');

module.exports.version = require('../package.json').version;

var protocolMap = {
  'http': 80,
  'https': 443
};

var linesOfContext = 7;

var Notifier = function(accessToken, endpoint, params) {
  this.initialize(accessToken, endpoint, params);
};

node_util.inherits(Notifier, events.EventEmitter);

Notifier.prototype = {
  endpointOptions: null,
  accessToken: null,
  extraParams: null,
  host: null,
  handler: null,
  items: [],
  initialize: function(accessToken, endpoint, params) {
    this.accessToken = accessToken;
    this.endpointOptions = this.parseEndpoint(endpoint);
    this.extraParams = params || {};

    this.host = this.extraParams['server.host'] || os.hostname();
    this.extraParams['server.host'] = this.host;
    this.extraParams['server.environment'] = this.extraParams['server.environment'] || 'development';
    this.extraParams['notifier.name'] = 'node_ratchet';
  },
  parseEndpoint: function parseEndpoint(endpoint) {
    try {
      var parsed = parseUrl(endpoint), response = {
        protocol: parsed.protocol.slice(0, -1),
        host: parsed.host.split(':')[0]
      };

      var path = parsed.path.substr(1);
      var index = path.lastIndexOf('/');
      response.path = path.substr(0, index);
      response.port = ~~parsed.port || protocolMap[response.protocol] || 443;
      return response;
    } catch (e) {
      throw new Error('Invalid endpoint: ' + endpoint + ', ' + e);
    }
  },
  addWebRequestError: function(req, exc, callback) {
    var params = ratchetParser.parseRequest(req);
    this.addError(exc, params, callback);
  },
  addError: function(exc, params, callback) {
    var payload = {};
    var key;
    for (key in this.extraParams) {
      params[key] = this.extraParams[key];
    }
    payload['access_token'] = this.accessToken;
    payload['timestamp'] = (new Date()).getTime() / 1000;
    payload['body'] = ratchetParser.formatExceptionString(exc);
    payload['params'] = JSON.stringify(params);

    this.items.push({type: 'error', payload: payload});
    this.handleItems(callback);
  },
  handleItems: function(callback) {
    if (this.handler) {
      clearTimeout(this.handler);
    }
    // handle the items asynchronously
    this.handler = setTimeout(this.createAsyncHandler(), 200);
    if (typeof callback === 'function') {
      callback();
    }
  },
  createAsyncHandler: function() {
    var postItems = this.postItems;
    var items = this.items;
    var endpointOptions = this.endpointOptions;
    
    var _handler = function() {
      try {
        postItems(endpointOptions, items);
      } catch (exc) {
        node_util.error('Could not post item to ratchet.io: ' + exc);
      }
    };
    return _handler;
  },
  postItems: function(endpointOptions, items) {
    var _postItems = function() {
      var item = items.shift();
      if (item) {
        var payloadData = querystring.stringify(item.payload);
        var opts = {
          host: endpointOptions.host,
          port: endpointOptions.port,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': payloadData.length
          },
          path: '/' + endpointOptions.path + '/'
        };
        var req = http[endpointOptions.protocol].request(opts, function(resp) {
          resp.setEncoding('utf8');
          resp.on('data', function(data) {
            node_util.error('data from postItem: ' + data);
          });
          resp.on('end', function() {
            _postItems();
          }); 
        });

        req.on('error', function(e) {
          node_util.error('Error posting item to Ratchet.io: ' + e);
        });
        req.end(payloadData);
        node_util.debug('Posted error to Ratchet.io: ' + querystring.stringify(item.payload));
      }
    };
    _postItems();
  },
  patchGlobal: function() {
    var self = this;
    process.on('uncaughtException', function(exc) {
      this.addError(exc, {});
    });
  }
};

module.exports.Notifier = Notifier;

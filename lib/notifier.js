var events = require('events'),
    http = {http: require('http'), https: require('https')},
    node_util = require('util'),
    os = require('os'),
    parseUrl = require('url').parse,
    querystring = require('querystring');

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
    var params = this.parseRequest(req);
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
    payload['body'] = this.formatException(exc);
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
        console.log(opts);
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
  parseRequest: function(req) {
    var host = req.headers.host || this.host || '<no host>';
    return {
      'request.GET': req.params,
      'request.POST': req.body || '<unavailable: use bodyParser middleware>',
      'request.headers': req.headers,
      'request.url': (function build_absolute_url() {
          var protocol = req.socket.encrypted ? 'https' : 'http';
          return protocol + '://' + host + req.url;
      }()),
    };
    return kwargs;
  },
  formatException: function(exc) {
    var excData = this.parseException(exc);
    var frames = [];
    var index;
    var cur;
    for (index = 0; index < excData.frames.length; ++index) {
      cur = excData.frames[index];
      frames.push(['    ', 'at ', cur.function, ' (', cur.filename, ':', cur.lineno, ':', cur.colno, ')'].join(''));
    }
    var parts = [[excData.name, ': ', excData.message].join(''), frames.join('\n')];
    return parts.join('\n');
  },
  parseException: function(exc) {
    var ret = {};
    var stack = this.parseStack(exc.stack);
    ret['name'] = exc.name;
    ret['message'] = exc.message || '<no message>';
    ret['frames'] = stack;
    return ret;
  },
  parseStack: function(stack) {
    try {
      // grab all lines except the first
      var lines = stack.split('\n').slice(1);
      var frames = [];
      var cache = {};
      lines.forEach(function(line, index) {
        var pattern = /^\s*at (?:(.+(?: \[\w\s+\])?) )?\(?(.+?)(?::(\d+):(\d+))?\)?$/;
        var data = line.match(pattern).slice(1);
        var line;
        var frame = {
          function: data[0] ? data[0] : '<unknown>',
          filename: data[1],
          lineno: ~~data[2],
          colno: ~~data[3]
        };

        // internal Node files are not full path names. Ignore them.
        if (frame.filename[0] === '/' || frame.filename[0] === '.') {
          // check if it has been read in first
          if (frame.filename in cache) {
            parseLines(cache[frame.filename]);
          } else {
            try {
              file = fs.readFileSync(frame.filename, 'utf8');
              file = file.toString().split('\n');
              cache[frame.filename] = file;
              parseLines(file);
              frames.push(frame);
            } catch (err) {
              node_util.error('Could not open: ' + frame.filename + ', ' + err);
            }
          }
        } else {
          frames[index] = frame;
        }
      });
    } catch (e) {
      node_util.warn('Can\'t parse stack trace:\n' + stack);
    }
    return frames;
  },
  parseLines: function(lines) {
    frame.pre_context = lines.slice(Math.max(0, frame.lineno - (linesOfContext + 1)), frame.lineno - 1);
    frame.context_line = lines[frame.lineno - 1];
    frame.post_context = lines.slice(frame.lineno, frame.lineno + linesOfContext);
  },
  patchGlobal: function() {
    var self = this;
    process.on('uncaughtException', function(exc) {
      this.addError(exc, {});
    });
  }
};

module.exports.Notifier = Notifier;

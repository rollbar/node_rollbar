var fs = require('fs'),
    node_util = require('util');

var linesOfContext = 7;

var formatExceptionString = module.exports.formatExceptionString = function(exc) {
  var excData = parseException(exc);
  var frames = [];
  var index;
  var cur;
  for (index = 0; index < excData.frames.length; ++index) {
    cur = excData.frames[index];
    frames.push(['    ', 'at ', cur.function, ' (', cur.filename, ':', cur.lineno, ':', cur.colno, ')'].join(''));
  }
  var parts = [[excData.name, ': ', excData.message].join(''), frames.join('\n')];
  return parts.join('\n');
};

var parseRequest = module.exports.parseRequest = function(req, defaultHost) {
  var header;
  var host = req.headers.host || defaultHost || '<no host>';
  var ret = {
    'request.GET': req.params,
    'request.POST': req.body || '<unavailable: use bodyParser middleware>',
    'request.url': (function build_absolute_url() {
        var protocol = req.socket.encrypted ? 'https' : 'http';
        return protocol + '://' + host + req.url;
    }()),
  };

  for (header in req.headers) {
    ret['request.header.' + header] = req.headers[header];
  }
  return ret;
};

var parseException = module.exports.parseException = function(exc) {
  var ret = {};
  var stack = parseStack(exc.stack);
  ret['name'] = exc.name;
  ret['message'] = exc.message || '<no message>';
  ret['frames'] = stack;
  return ret;
};

var parseStack = module.exports.parseStack = function(stack) {
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
          extractContextLines(frame, cache[frame.filename]);
          frames.push(frame);
        } else {
          try {
            file = fs.readFileSync(frame.filename, 'utf8');
            file = file.toString().split('\n');
            cache[frame.filename] = file;
            extractContextLines(frame, file);
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
    node_util.error('Can\'t parse stack trace, ' + e + ':\n' + stack);
  }
  return frames;
};

var extractContextLines = function(frame, lines) {
  frame.pre_context = lines.slice(Math.max(0, frame.lineno - (linesOfContext + 1)), frame.lineno - 1);
  frame.context_line = lines[frame.lineno-1];
  frame.post_context = lines.slice(frame.lineno, frame.lineno + linesOfContext);
};

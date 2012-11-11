var fs = require('fs');
var util = require('util');

var linesOfContext = 3;
var tracePattern = /^\s*at (?:(.+(?: \[\w\s+\])?) )?\(?(.+?)(?::(\d+):(\d+))?\)?$/;

exports.parseException = function(exc, callback) {
  return exports.parseStack(exc.stack, function(err, stack) {
    if (err) {
      util.error('could not parse exception, err: ' + err);
      return callback(err);
    } else {
      var ret = {
        class: exc.name,
        message: exc.message || '<no message>',
        frames: stack
      };
      return callback(null, ret);
    }
  });
};

exports.parseStack = function(stack, callback) {
  // grab all lines except the first
  var lines = stack.split('\n').slice(1);
  var frames = [];
  var cache = {};
  var curLine;

  var looper = function(err) {
    if (err) {
      util.error('error while parsing the stack trace, err: ' + err);
      return callback(err);
    } else if (lines.length) {
      curLine = lines.shift();

      var matched = curLine.match(tracePattern);
      if (!matched) {
        return looper(null);
      }

      var data = matched.slice(1);
      var frame = {
        method: data[0] || '<unknown>',
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
          return fs.readFile(frame.filename, 'utf8', function(err2, fileData) {
            if (err2) {
              util.error('could not read in file ' + frame.filename + ' for context');
              return looper(err2);
            } else {
              var fileLines = fileData.split('\n');
              cache[frame.filename] = fileLines;
              frames.push(frame);
              return looper(null);
            }
          });
        }
      } else {
        frames.push(frame);
      }
      return looper(null);
    } else {
      frames.reverse();
      return callback(null, frames);
    }
  };
  return looper(null);
};

var extractContextLines = function(frame, lines) {
  frame.pre_context = lines.slice(Math.max(0, frame.lineno - (linesOfContext + 1)), frame.lineno - 1);
  frame.context_line = lines[frame.lineno-1];
  frame.post_context = lines.slice(frame.lineno, frame.lineno + linesOfContext);
};

var fs = require('fs');
var util = require('util');

var linesOfContext = 3;
var tracePattern = /^\s*at (?:([^(]+(?: \[\w\s+\])?) )?\(?(.+?)(?::(\d+):(\d+))?\)?$/;

var jadeTracePattern = /^\s*at .+ \(.+ (at[^)]+\))\)$/;
var jadeFramePattern = /^\s*(>?) [0-9]+\|(\s*.+)$/m;

exports.parseException = function(exc, callback) {
  return exports.parseStack(exc.stack, function(err, stack) {
    if (err) {
      util.error('could not parse exception, err: ' + err);
      return callback(err);
    } else {
      var message = exc.message || '<no message>';
      var ret = {
        class: exc.name,
        message: message,
        frames: stack
      };

      var jadeMatch = message.match(jadeFramePattern);
      if (jadeMatch) {
        jadeData = parseJadeDebugFrame(message);
        ret.message = jadeData.message;
        ret.frames.push(jadeData.frame);
      }
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

      var matched = curLine.match(jadeTracePattern);
      if (matched) {
        curLine = matched[1];
      }
      matched = curLine.match(tracePattern);
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
              extractContextLines(frame, cache[frame.filename]);
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

var parseJadeDebugFrame = function(body) {
  // Given a Jade exception body, return a frame object
  var lines = body.split('\n');
  var lineNumSep = lines[0].indexOf(':');
  var filename = lines[0].slice(0, lineNumSep);
  var lineno = parseInt(lines[0].slice(lineNumSep + 1));
  var numLines = lines.length;
  var msg = lines[numLines - 1];

  lines = lines.slice(1, numLines - 1);

  var i;
  var contextLine;
  var preContext = [];
  var postContext = [];
  var line;
  for (i = 0; i < numLines - 2; ++i) {
    line = lines[i];
    jadeMatch = line.match(jadeFramePattern); 
    if (jadeMatch) {
      if (jadeMatch[1] === '>') {
        contextLine = jadeMatch[2];
      } else {
        if (!contextLine) {
          if (jadeMatch[2]) {
            preContext.push(jadeMatch[2]);
          }
        } else {
          if (jadeMatch[2]) {
            postContext.push(jadeMatch[2]);
          }
        }
      }
    }
  }

  preContext = preContext.slice(0, Math.min(preContext.length, linesOfContext));
  postContext = postContext.slice(0, Math.min(postContext.length, linesOfContext));

  return {frame: {method: '<jade>',
                  filename: filename,
                  lineno: lineno,
                  code: contextLine,
                  context: {
                    pre: preContext,
                    post: postContext
                  }},
          message: msg};

};

var extractContextLines = function(frame, fileLines) {
  frame.code = fileLines[frame.lineno - 1];
  frame.context = {
    pre: fileLines.slice(Math.max(0, frame.lineno - (linesOfContext + 1)), frame.lineno - 1),
    post: fileLines.slice(frame.lineno, frame.lineno + linesOfContext)
  };
};

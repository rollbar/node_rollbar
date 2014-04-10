var assert = require('assert');
var fs = require('fs');
var jade = require('jade');
var vows = require('vows');

var parser = require('../lib/parser');

var suite = vows.describe('parser').addBatch({
  'Read in a jade template with an error, compile with no filename': {
    topic: function() {
      readJadeFixture(__dirname + '/../fixture/jadeerr.jade',
        false, {breakme: true}, this.callback);
    },
    'parse the exception with parseException': parseAndVerifyException(false),
  },
  'Read in a jade template with an error, compile with a filename': {
    topic: function() {
      readJadeFixture(__dirname + '/../fixture/jadeerr.jade',
        true, {breakme: true}, this.callback);
    },
    'parse the exception with parseException': parseAndVerifyException(true)
  },
  'Create a new Error in this file': {
    topic: function() {
      // NOTE: Don't change this next line of code since we verify the context line
      // in the parsed exception below.
      this.callback(null, new Error('Hello World'));
    },
    'parse it with parseException': {
      topic: function(err, exc) {
        return parser.parseException(exc, this.callback);
      },
      'verify the filename': function(err, parsedObj) {
        assert.isNull(err);
        assert.isObject(parsedObj);
        assert.isArray(parsedObj.frames);

        var lastFrame = parsedObj.frames[parsedObj.frames.length - 1];
        assert.isObject(lastFrame);
        assert.equal(lastFrame.filename, __filename);
      },
      'verify the context line': function(err, parsedObj) {
        var lastFrame = parsedObj.frames[parsedObj.frames.length - 1];
        assert.isString(lastFrame.code);
        assert.includes(lastFrame.code, 'new Error(\'Hello World\')');
      }
    }
  },
  'An error reading a file': {
    topic: function(err) {
      var exc = new Error();
      exc.stack = "Error\n at REPLServer.self.eval (/tmp/file-does-not-exist.js:1:2)" +
        "\n at REPLServer.self.eval (/tmp/other-file-does-not-exist.js:3:4)";
      return parser.parseException(exc, this.callback);
    },
    'it returns frames without context': function(err, parsedObj) {
      assert.equal(parsedObj.frames.length, 2);
      assert.equal(parsedObj.frames[0].filename, "/tmp/other-file-does-not-exist.js");
      assert.equal(parsedObj.frames[0].lineno, 3);
      assert.equal(parsedObj.frames[0].colno, 4);
      assert.equal(parsedObj.frames[1].filename, "/tmp/file-does-not-exist.js");
      assert.equal(parsedObj.frames[1].lineno, 1);
      assert.equal(parsedObj.frames[1].colno, 2);
    }
  },
  'A coffee script stacktrace': {
    topic: function(err) {
      var exc = new Error();
      exc.stack = "TypeError: Cannot read property 'foo' of undefined\n at example (/tmp/example.coffee:2:3, <js>:5:20)";
      return parser.parseException(exc, this.callback);
    },
    'it parses correctly': function(err, parsedObj) {
      assert.equal(parsedObj.frames[0].filename, "/tmp/example.coffee");
      assert.equal(parsedObj.frames[0].lineno, 2);
      assert.equal(parsedObj.frames[0].colno, 3);
    }
  }
}).export(module, {error: false});


function readJadeFixture(filename, includeJadeFilename, jadeLocals, callback) {
  fs.readFile(filename, function(err, data) {
    if (err) {
      return callback(err);
    } else {
      var opts = {};
      if (includeJadeFilename) {
        opts.filename = __dirname + '/../fixture/jadeerr.jade';
      }
      var jadeFn = jade.compile(data, opts);
      try {
        jadeFn(jadeLocals);
        return callback(new Error('expected this to break'));
      } catch (e) {
        return callback(null, e);
      }
    }
  });
}

function parseAndVerifyException(jadeDebug) {
  return {
    topic: function(err, exc) {
      parser.parseException(exc, this.callback);
    },
    'verify stack frames': function(err, parsedObj) {
      assert.isNull(err);
      assert.isObject(parsedObj);

      var frames = parsedObj.frames;
      assert.isArray(frames);

      assert.equal(parsedObj.class, 'ReferenceError');
      assert.equal(parsedObj.message, 'foo is not defined');

      var i;
      var numFrames = frames.length;
      var cur;
      assert.isTrue(numFrames >= 1);

      var jadeDebugFound = false;
      for (i = 0; i < numFrames; ++i) {
        cur = frames[i];
        assert.include(cur, 'method');
        assert.include(cur, 'filename');
        assert.include(cur, 'lineno');
        if (cur.method !== '<jade>') {
          assert.include(cur, 'colno');
          assert.isNumber(cur.colno);
        } else {
          jadeDebugFound = true;
        }

        assert.isNumber(cur.lineno);
        assert.isString(cur.method);
        assert.isString(cur.filename);
      }

      if (jadeDebug) {
        if (!jadeDebugFound) {
          assert.isFalse('jade debug not found');
        }
      } else {
        if (jadeDebugFound) {
          assert.isFalse('jade debug found but should not be');
        }
      }
    }
  };
};

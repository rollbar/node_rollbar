/*jslint devel: true, node: true, nomen: true, plusplus: true, indent: 2, maxlen: 100 */

"use strict";

var util = require('util');
var assert = require('assert');
var vows = require('vows');
var sinon = require('sinon');

var rollbar = require('../rollbar');
var api = require('../lib/api');
var notifier = require('../lib/notifier');

var https = require('https');

var ACCESS_TOKEN = '8802be7c990a4922beadaaefb6e0327b';

rollbar.init(ACCESS_TOKEN, {environment: 'playground'});

function CustomError(message, nested) {
  rollbar.Error.call(this, message, nested);
}

util.inherits(CustomError, rollbar.Error);

sinon.spy(api, 'postItem');

// Making this a separate suite so it can use its own sinon sandbox
// mode.  This is needed because in order to test that the pending
// requests are queued, we need to stub http.request.  And if we do
// that in the main tests, everything breaks.
var sandbox = null;
vows.describe('notifier pending requests').addBatch({
  'pending requests': {
    topic: function() {
      assert(notifier.pendingItemsCount() == 0);
      sandbox = sinon.sandbox.create();
      sandbox.stub(https, 'request', function(){ /* do nothing */ });
      notifier.handleError(new Error('test'), this.callback);
      assert(notifier.pendingItemsCount() == 1); // should have been enqueued synchronously
    },
    'it keeps track of pending requests': function() {
      assert(notifier.pendingItemsCount() == 0); // should have been dequeued before callback is called
      sandbox.restore();
    }
  }
}).export(module, {error: false});

var waitSandbox = null;
vows.describe('notifier wait').addBatch({
  'has pending requests': {
    topic: function() {
      assert(notifier.pendingItemsCount() == 0);
      waitSandbox = sinon.sandbox.create();
      waitSandbox.stub(https, 'request', function(){ /* do nothing */ });

      notifier.handleError(new Error('test'));
      assert(notifier.pendingItemsCount() == 1); // should have been enqueued synchronously

      notifier.wait(this.callback);

      notifier.handleError(new Error('test'));
      assert(notifier.pendingItemsCount() == 2); // should have been enqueued synchronously
    },
    'it keeps track of pending requests': function() {
      assert(notifier.pendingItemsCount() == 0); // callback should be called after all items are flushed
      waitSandbox.restore();
    }
  }
}).export(module, {error: false});

vows.describe('notifier').addBatch({
  // A context is supposed to be a string.  If an object is passed in, verify that
  // some transformation happens so it doesn't throw an error.
  'context with an object': {
    topic: function() {
      // Set up a context object that will be >255 characters if serialized.
      var obj = {};
      for (var i=0; i < 50; i++)
        obj["test-"+i] = i*i;
      var cb = this.callback;
      notifier.reportMessageWithPayloadData('test', {context: obj}, null, function() {
        // try an empty context too
        notifier.reportMessageWithPayloadData('test', {context: {}}, null, function() {
          // try an array context too
          notifier.reportMessageWithPayloadData('test', {context: [1,2,3]}, null, cb);
        });
      });
    },
    'it does not throw an error': function(err) {
      // If the context was not intercepted and handled specially, an error resembling
      // "Invalid format. data.context object value found, but a null is required"
      // would have been thrown.  The assertion here is that no error is thrown.
      assert.isNull(err);
    },
    'it serializes the context': function(err) {
      // Because of the asynchronous nature of this test suite, I wasn't able to figure
      // out a way to get a reference to the exact spy call for this topic.  As a work-
      // around, I'm iterating over all the calls and making sure the contexts are all
      // valid.  Not ideal, but the end result is the same.
      var hasContext = false;
      for (var i=0; i < api.postItem.callCount; i++) {
        var call = api.postItem.getCall(i);
        if (call.args[0] && call.args[0].context) {
          hasContext = true;
          var context = call.args[0].context;
          assert(typeof context == 'string');
          assert(context[0] == '{' || context[0] == '['); // make sure it was serialized
          assert(context.length < 256); // make sure it was truncated
        }
      }
      assert(hasContext);
    }
  },

  'handleError with a normal error': {
    topic: function () {
      var test = function () {
        var x = thisVariableIsNotDefined;
      };
      try {
        test();
      } catch (e) {
        notifier.handleError(e, this.callback);
      }
    },
    'verify no error is returned': function (err) {
      assert.isNull(err);
    }
  },

  'handleError with a circular reference': {
    topic: "",
    'does not throw an exception': function(topic) {
      var circularError = { error: {} };
      circularError.error.hello = circularError.error
      notifier.handleError(circularError);
    }
  },

  'handleError with a nested error': {
    topic: function() {
      var test = function () {
        var x = thisVariableIsNotDefined;
      };
      try {
        test();
      } catch (e) {
        var err = new CustomError('nested-message', e);
        notifier.handleError(err, this.callback);
      }
    },

    'it sends the correct data': function() {
      assert(api.postItem.calledWith(
        {
          timestamp: sinon.match.number,
          environment: 'playground',
          level: 'error',
          language: 'javascript',
          framework: 'node-js',
          uuid: sinon.match.string,
          notifier: { name: 'node_rollbar', version: sinon.match.string },
          server: {
            host: sinon.match.string,
            argv: sinon.match.array,
            pid: sinon.match.number
          },
          body: {
            trace_chain: [
              {
                frames: sinon.match.array,
                exception: {
                  class: 'CustomError',
                  message: 'nested-message'
                }
              },
              {
                frames: sinon.match.array,
                exception:
                {
                  class: 'ReferenceError',
                  message: 'thisVariableIsNotDefined is not defined'
                }
              }
            ]
          }
        }
      ));
    }
  },

  'handleErrorWithPayloadData with a normal error': {
    topic: function () {
      var test = function () {
        var x = thisVariableIsNotDefined;
      };
      try {
        test();
      } catch (e) {
        notifier.handleErrorWithPayloadData(e, {level: "warning"}, this.callback);
      }
    },
    'verify no error is returned': function (err) {
      assert.isNull(err);
    }
  },
  'handleErrorWithPayloadData with an array': {
    topic: function () {
      notifier.handleErrorWithPayloadData([1, 2, 3, "I'm broken"], {level: "warning"}, this.callback);
    },
    'verify an error is returned': function (err) {
      assert.isNotNull(err);
      assert(err.toString().indexOf("I'm broken") > -1);
    }
  },
  'handleError with an Error that has a missing stack': {
    topic: function () {
      var e = new Error('test error');
      e.stack = undefined;
      notifier.handleError(e, this.callback);
    },
    'verify no error is returned': function (err) {
      assert.isNull(err);
    }
  },
  'handleError with an infinite recursion stack limit reached Error': {
    topic: function () {
      var genError = function (counter) {
        return genError(++counter);
      };
      try {
        genError();
      } catch (e) {
        notifier.handleError(e, this.callback);
      }
    },
    'verify the error was sent': function (err) {
      assert.isNull(err);
    }
  },
  'handleError with a String': {
    topic: function () {
      notifier.handleError('Some string', this.callback);
    },
    'verify the error was sent': function (err) {
      assert.isNull(err);
    }
  },
  'handleError with a thrown String': {
    topic: function () {
      try {
        throw 'Fake error';
      } catch (e) {
        notifier.handleError(e, this.callback);
      }
    },
    'verify the error was sent': function (err) {
      assert.isNull(err);
    }
  },
  'reportMessage with a valid request object': {
    topic: function () {
      notifier.reportMessage('test', 'debug', {url: 'http://localhost/foo'}, this.callback);
    },
    'verify no error is returned': function (err) {
      assert.isNull(err);
    }
  },

  'reportMessage with a req.body as a plain object': {
    topic: function () {
      var request = {};
      request.body = Object.create(null);
      request.body.foo = 'bar';
      request.url = 'http://localhost/foo';
      request.method = 'POST';

      notifier.reportMessage('test', 'debug', request, this.callback);
    },
    'verify no error is returned': function (err, data, resp) {
      assert.deepEqual(data.request.POST, {foo: 'bar'});
    }
  },
  'reportMessage with invalid request object': {
    topic: function () {
      notifier.reportMessage('test', 'debug', 1, this.callback);
    },
    'verify no error is returned': function (err) {
      assert.isNull(err);
    }
  },
  'reportMessageWithPayloadData with valid level and fingerprint': {
    topic: function () {
      notifier.reportMessageWithPayloadData('test', {
        level: 'debug',
        fingerprint: 'custom-fingerprint'
      }, null, this.callback);
    },
    'verify no error is returned': function (err) {
      assert.isNull(err);
    }
  },
  'scrubRequestHeaders scrubs "cookie" header': {
    topic: function () {
      var callback = this.callback;
      return callback(null,
          notifier._scrubRequestHeaders(null, {
            cookie: 'remove=me',
            otherHeader: 'test'
          }));
    },
    'verify cookie is scrubbed': function (err, headers) {
      assert.equal(headers.cookie, '*********');
      assert.equal(headers.otherHeader, 'test');
    }
  },
  'scrubRequestHeaders scrubs multiple headers': {
    topic: function () {
      var callback = this.callback;
      return callback(null,
          notifier._scrubRequestHeaders(['cookie', 'password'], {
            cookie: 'remove=me',
            password: 'secret',
            otherHeader: 'test'
          }));
    },
    'verify all scrub fields are scrubbed': function (err, headers) {
      assert.equal(headers.cookie, '*********');
      assert.equal(headers.password, '******');
      assert.equal(headers.otherHeader, 'test');
    }
  },
  'scrubRequestParams scrubs "password" and "confirm_password" fields by default': {
    topic: function () {
      var callback = this.callback;
      return callback(null,
          notifier._scrubRequestParams(undefined, {
            password: 'secret',
            confirm_password: 'secret',
            otherParam: 'test'
          }));
    },
    'verify fields are scrubbed': function (err, params) {
      assert.equal(params.password, '******');
      assert.equal(params.confirm_password, '******');
      assert.equal(params.otherParam, 'test');
    }
  },
  'scrubRequestParams ignores null or undefined values': {
    topic: function () {
      var callback = this.callback;
      return callback(null,
          notifier._scrubRequestParams(['nullValue', 'undefinedValue', 'emptyValue', 'password'], {
            nullValue: null,
            undefinedValue: undefined,
            emptyValue: '',
            password: 'Sup3rs3kr3T',
            goodValue: 'goodValue'
          }));
    },
    'verify fields are scrubbed': function (err, params) {
      assert.equal(params.nullValue, null);
      assert.equal(params.undefinedValue, undefined);
      assert.equal(params.emptyValue, '');
      assert.equal(params.password, '******');
      assert.equal(params.goodValue, 'goodValue');
    }
  },
  'extractIp returns req.ip first': {
    topic: function () {
      var dummyReq = {
        ip: 'req.ip IP address',
        headers: {
          'x-real-ip': 'X-Real-Ip IP address',
          'x-forwarded-for': 'X-Forwarded-For IP address'
        },
        connection: {
          remoteAddress: 'Connection IP address'
        }
      };
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, 'req.ip IP address');
    }
  },
  'extractIp returns req.header["x-real-ip"] if req.ip doesn\'t exist': {
    topic: function () {
      var dummyReq = {
        headers: {
          'x-real-ip': 'X-Real-Ip IP address',
        },
        connection: {
          remoteAddress: 'Connection IP address'
        }
      };
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, 'X-Real-Ip IP address');
    }
  },
  'extractIp returns req.header["x-forwarded-for"] if req.ip doesn\'t exist': {
    topic: function () {
      var dummyReq = {
        headers: {
          'x-forwarded-for': 'X-Forwarded-For IP address'
        },
        connection: {
          remoteAddress: 'Connection IP address'
        }
      };
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, 'X-Forwarded-For IP address');
    }
  },
  'extractIp returns req.connection.remoteAddress without ip headers': {
    topic: function () {
      var dummyReq = {
        connection: {
          remoteAddress: 'Connection IP address'
        }
      };
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, 'Connection IP address');
    }
  },
  'extractIp returns req.socket.remoteAddress without ip headers': {
    topic: function () {
      var dummyReq = {
        socket: {
          remoteAddress: 'Connection IP address'
        }
      };
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, 'Connection IP address');
    }
  },
  'extractIp returns req.connection.socket.remoteAddress without ip headers': {
    topic: function () {
      var dummyReq = {
        connection: {
          socket: {
            remoteAddress: 'Connection IP address'
          }
        },
      };
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, 'Connection IP address');
    }
  },
  'extractIp returns req.info.remoteAddress without ip headers': {
    topic: function () {
      var dummyReq = {
        info: {
          remoteAddress: 'Connection IP address'
        },
      };
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, 'Connection IP address');
    }
  },
  'extractIp doesn\'t crash if req.connection/req.info/req.socket/req.headers doesn\'t exist': {
    topic: function () {
      var dummyReq = {};
      return this.callback(notifier._extractIp(dummyReq));
    },
    'verify the IP': function (ip) {
      assert.equal(ip, undefined);
    }
  },
  'levelGteMinimum called with default minimum level and "info" in payload': {
    topic: function () {
      var item = {
        payload: {
          level: 'info'
        }
      };
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was not blocked': function (tf) {
      assert.equal(tf, true);
    }
  },
  'levelGteMinimum called with default minimum level and no level in payload': {
    topic: function () {
      var item = {
        payload: {}
      };
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was not blocked': function (tf) {
      assert.equal(tf, true);
    }
  },
  'levelGteMinimum called with default minimum level and no payload': {
    topic: function () {
      var item = {};
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was not blocked': function (tf) {
      assert.equal(tf, true);
    }
  },
  'levelGteMinimum called with "error" minimum level and "info" in payload': {
    topic: function () {
      var item = {
        payload: {
          level: "info"
        }
      };
      notifier.init(api, {minimumLevel: "error"});
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was blocked': function (tf) {
      assert.equal(tf, false);
    }
  },
  'levelGteMinimum called with "info" minimum level and "info" in payload': {
    topic: function () {
      var item = {
        payload: {
          level: "info"
        }
      };
      notifier.init(api, {minimumLevel: "info"});
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was not blocked': function (tf) {
      assert.equal(tf, true);
    }
  },
  'levelGteMinimum called with "FOO" minimum level and "info" in payload': {
    topic: function () {
      var item = {
        payload: {
          level: "info"
        }
      };
      notifier.init(api, {minimumLevel: "FOO"});
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was not blocked': function (tf) {
      assert.equal(tf, true);
    }
  },
  'levelGteMinimum called with "info" minimum level and "FOO" in payload': {
    topic: function () {
      var item = {
        payload: {
          level: "FOO"
        }
      };
      notifier.init(api, {minimumLevel: "info"});
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was blocked': function (tf) {
      assert.equal(tf, false);
    }
  },
  'levelGteMinimum called with "FOO" minimum level and "FOO" in payload': {
    topic: function () {
      var item = {
        payload: {
          level: "FOO"
        }
      };
      notifier.init(api, {minimumLevel: "FOO"});
      return this.callback(notifier._levelGteMinimum(item));
    },
    'verify the item was not blocked': function (tf) {
      assert.equal(tf, true);
    }
  }
}).export(module, {error: false});

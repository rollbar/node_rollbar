/*jslint devel: true, node: true, nomen: true, plusplus: true, indent: 2, maxlen: 100 */

"use strict";

var util = require('util');
var assert = require('assert');
var vows = require('vows');
var sinon = require('sinon');

var rollbar = require('../rollbar');
var api = require('../lib/api');
var notifier = require('../lib/notifier');


var ACCESS_TOKEN = '8802be7c990a4922beadaaefb6e0327b';

rollbar.init(ACCESS_TOKEN, {environment: 'playground'});

function CustomError(message, nested) {
  rollbar.Error.call(this, message, nested);
}

util.inherits(CustomError, rollbar.Error);


var suite = vows.describe('notifier').addBatch({
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

  'handleError with a nested error': {
    topic: function() {
      sinon.spy(api, 'postItem');

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
          notifier._scrubRequestParams(['nullValue', 'undefinedValue', 'emptyValue'], {
            nullValue: null,
            undefinedValue: undefined,
            emptyValue: '',
            goodValue: 'goodValue'
          }));
    },
    'verify fields are scrubbed': function (err, params) {
      assert.equal(params.nullValue, null);
      assert.equal(params.undefinedValue, undefined);
      assert.equal(params.emptyValue, '');
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
          'x-forwarded-for': 'X-Forwarded-For IP address'
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
  'extractIp returns req.header["x-forwarded-for"] if x-real-ip doesn\'t exist': {
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
  'extractIp returns req.connection.remoteAddress x-forwarded-for doesn\'t exist': {
    topic: function () {
      var dummyReq = {
        headers: {
        },
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
  'extractIp doesn\'t crash if req.connection/req.headers doesn\'t exist': {
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

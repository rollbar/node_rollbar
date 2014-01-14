var assert = require('assert');
var vows = require('vows');

var notifier = require('../lib/notifier');
var rollbar = require('../rollbar');

var ACCESS_TOKEN = '8802be7c990a4922beadaaefb6e0327b';

rollbar.init(ACCESS_TOKEN, {environment: 'playground', handler: 'inline'});

var suite = vows.describe('notifier').addBatch({
  'handleError with an Error that has a missing stack': {
    topic: function() {
      var e = new Error('test error');
      e.stack = undefined;
      notifier.handleError(e, this.callback);
    },
    'verify no error is returned': function(err, resp) {
      assert.isNull(err);
      assert.isObject(resp);
      assert.include(resp, 'ids');
    }
  },
  'handleError with an infinite recursion stack limit reached Error': {
    topic: function() {
      var genError = function(counter) {
        return genError(++counter);
      };
      try {
        genError();
      } catch (e) {
        notifier.handleError(e, this.callback);
      }
    },
    'verify the error was sent': function(err, resp) {
      assert.isNull(err);
      assert.isObject(resp);
      assert.include(resp, 'ids');
    }
  },
  'reportMessage with invalid request object': {
    topic: function() {
      notifier.reportMessage('test', 'debug', 1, this.callback);
    },
    'verify an error is returned': function(err) {
      assert.isNotNull(err);
    }
  },
  'reportMessageWithPayloadData with valid level and fingerprint': {
    topic: function() {
      notifier.reportMessageWithPayloadData('test', {level: 'debug', fingerprint: 'custom-fingerprint'}, null, this.callback);
    },
    'verify no error is returned': function(err, resp) {
      assert.isNull(err);
      assert.isObject(resp);
      assert.include(resp, 'ids');
    }
  },
  'scrubRequestHeaders scrubs "cookie" header': {
    topic: function() {
      var callback = this.callback;
      return callback(null, notifier._scrubRequestHeaders(['cookie'], {cookie: 'remove=me', otherHeader: 'test'}));
    },
    'verify cookie is scrubbed': function(err, headers) {
      assert.equal(headers.cookie, '*********');
      assert.equal(headers.otherHeader, 'test');
    }
  },
  'scrubRequestHeaders scrubs multiple headers': {
    topic: function() {
      var callback = this.callback;
      return callback(null,
          notifier._scrubRequestHeaders(['cookie', 'password'],
            {cookie: 'remove=me',
             password: 'secret',
             otherHeader: 'test'}));
    },
    'verify all scrub fields are scrubbed': function(err, headers) {
      assert.equal(headers.cookie, '*********');
      assert.equal(headers.password, '******');
      assert.equal(headers.otherHeader, 'test');
    }
  },
  'scrubRequestParams scrubs "password" and "confirm_password" fields by default': {
    topic: function() {
      var callback = this.callback;
      return callback(null,
          notifier._scrubRequestParams(undefined, 
            {password: 'secret',
             confirm_password: 'secret',
             otherParam: 'test'}));
    },
    'verify fields are scrubbed': function(err, params) {
      assert.equal(params.password, '******');
      assert.equal(params.confirm_password, '******');
      assert.equal(params.otherParam, 'test');
    }
  }
}).export(module, {error: false});

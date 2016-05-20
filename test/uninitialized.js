var util = require('util');
var assert = require('assert');
var vows = require('vows');
var rewire = require('rewire');

var ACCESS_TOKEN = '8802be7c990a4922beadaaefb6e0327b';



var suite = vows.describe('rollbar.reportMessage').addBatch({
  'without init()': {
    topic: function() {
      var notifier = rewire('../lib/notifier');

      var callback = this.callback;
      notifier.__with__({initialized: false, apiClient: undefined})(function () {
        notifier.handleError(new Error('hello world'), null, callback);
      });

    },

    'should return a Rollbar uninitialized error': function(err) {
      assert.equal(err.message, 'Rollbar is not initialized');
    },

    'now initialize and call reportMessage()': {
      topic: function() {
        var notifier = rewire('../lib/notifier');
        var api = rewire('../lib/api');

        api.init(ACCESS_TOKEN, {});
        notifier.init(api, {});
        notifier.handleError(new Error('hello world'), null, this.callback);
      },

      'verify no error is returned': function (err) {
        assert.isNull(err);
      }
    }
  }
}).export(module, {error: false});

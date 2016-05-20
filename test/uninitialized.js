var util = require('util');
var assert = require('assert');
var vows = require('vows');
var rollbar = require('../rollbar');

var ACCESS_TOKEN = '8802be7c990a4922beadaaefb6e0327b';


var suite = vows.describe('rollbar.reportMessage').addBatch({
  'without init()': {
    topic: function() {
      rollbar.reportMessage('hello world', 'error', null, this.callback);
    },

    'should return a Rollbar uninitialized error': function(err) {
      assert.equal(err.message, 'Rollbar is not initialized');
    },

    'now initialize and call reportMessage()': {
      topic: function() {
        rollbar.init(ACCESS_TOKEN);
        rollbar.reportMessage('hello world', 'error', null, this.callback);
      },

      'verify no error is returned': function (err) {
        assert.isNull(err);
      }
    }
  }
}).export(module, {error: false});

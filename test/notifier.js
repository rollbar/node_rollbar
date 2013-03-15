var assert = require('assert');
var vows = require('vows');

var notifier = require('../lib/notifier');

var suite = vows.describe('notifier').addBatch({
  'handleError with an Error that has a missing stack': {
    topic: function() {
      var e = new Error();
      e.stack = undefined;
      notifier.handleError(e, this.callback);
    },
    'verify the an error is returned': function(err) {
      assert.isNotNull(err);
    }
  },
  'reportMessage with invalid request object': {
    topic: function() {
      notifier.reportMessage('test', 'debug', 1, this.callback);
    },
    'verify an error is returned': function(err) {
      assert.isNotNull(err);
    }
  }
}).export(module, {error: false});

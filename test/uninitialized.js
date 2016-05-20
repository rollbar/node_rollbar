var unsupportedNodeVersions = ['0.6', '0.8', '0.9', '0.12'];
var version = process.version.substr(1);
var doTest = true;

for (var i = 0; i < unsupportedNodeVersions.length; ++i) {
  if (version.indexOf(unsupportedNodeVersions[i]) === 0) {
    console.log('Skipping uninitialized tests due to unsupported node version');
    doTest = false;
    break;
  }
}

if (doTest) {
  var util = require('util');
  var assert = require('assert');
  var vows = require('vows');
  var decache = require('decache');

  var ACCESS_TOKEN = '8802be7c990a4922beadaaefb6e0327b';



  var suite = vows.describe('Uninitialized rollbar').addBatch({
    'without init()': {
      topic: function() {
        decache('../lib/notifier');
        var notifier = require('../lib/notifier');

        notifier.handleError(new Error('hello world'), null, this.callback);
      },

      'should return a Rollbar uninitialized error': function(err) {
        assert.equal(err.message, 'Rollbar is not initialized');
      },

      'now initialize and call reportMessage()': {
        topic: function() {
          decache('../lib/notifier');
          decache('../lib/api');

          var notifier = require('../lib/notifier');
          var api = require('../lib/api');

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
}

var util = require('util');
var assert = require('assert');
var vows = require('vows');
var rollbar = require('../rollbar');


function CustomError(message, nested) {
  rollbar.Error.call(this, message, nested);
}

util.inherits(CustomError, rollbar.Error);

var nested = new Error('nested-message');


var suite = vows.describe('rollbar.Error').addBatch({
  'with no nested error': {
    topic: function() {
      return new CustomError('the-message');
    },

    'has correct properties': function(err) {
      assert.equal(err.message, 'the-message');
      assert.equal(err.name, 'CustomError');
      assert.equal(err.constructor.name, 'CustomError');
    },

    'with no nested error': {
      topic: function() {
        return new CustomError('the-message', nested);
      },

      'has correct properties': function(err) {
        assert.equal(err.message, 'the-message');
        assert.equal(err.name, 'CustomError');
        assert.equal(err.constructor.name, 'CustomError');
        assert.equal(err.nested, nested);
      }
    }
  }
}).export(module, {error: false});

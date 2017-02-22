/*jslint devel: true, node: true, nomen: true, plusplus: true, indent: 2, maxlen: 100 */

"use strict";

var assert = require('assert');
var vows = require('vows');
var sinon = require('sinon');

var deploy = require('../deploy');

var ACCESS_TOKEN = '8802be7c990a4922beadaaefb6e0327b';
var READ_TOKEN = '5bd281baadec492fbf5e443e82d0fc20';

// sinon.spy(api, 'postItem');

var suite = vows.describe('deploy').addBatch({

  'creating a deploy without the correct parameters': {
    topic: function () {
      deploy.createDeploy(ACCESS_TOKEN, {}, {}, this.callback);
    },
    'verify that the correct validation occurs': function (response) {
      assert.match(response.message, /Missing 'environment'/);
      assert.match(response.message, /Missing 'revision'/);
    }
  },

  'creating a deploy with the correct parameters': {
    topic: function () {
      deploy.createDeploy(ACCESS_TOKEN, {environment: 'production', revision: '123'}, {}, this.callback);
    },
    'verify that no errors were thrown': function (response) {
      assert.deepEqual(response.data, {});
    }
  },


  'listing an error is thrown without the correct token': {
    topic: function () {
      deploy.listDeploys(ACCESS_TOKEN, 1, {}, this.callback);
    },
    'verify that a page of deploys is returned': function (response) {
      assert.match(response.message, /insufficient privileges/);
    }
  },

  'listing a page of deploys and retrieving a single deploy': {
    topic: function () {
      var cb = this.callback;
      deploy.listDeploys(READ_TOKEN, 1, {}, function(listResponse) {
        deploy.getDeploy(READ_TOKEN, listResponse.result.deploys[0].id, {}, function(getResponse) {
          cb(listResponse, getResponse);
        });
      });
    },
    'verify that a page of deploys is returned': function (listResponse, getResponse) {
      assert(listResponse.result.deploys.length > 1);
      assert(getResponse.result.id);
      assert(getResponse.result.start_time);
    }
  }

}).export(module, {error: false});

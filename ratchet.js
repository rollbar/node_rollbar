var util = require('util');

var api = require('./lib/api');
var notifier = require('./lib/notifier');
var parser = require('./lib/parser');

var initialized = false;

/**
 *
 * Ratchet:
 *
 *  Handle caught and uncaught exceptions, and report messages back to ratchet.
 *
 *  This library requires an account at http://ratchet.io/.
 *
 * Example usage:
 *
 *  Express - 
 *
 *     var express = require('express');
 *     var ratchet = require('node-ratchet');
 * 
 *     var app = express();
 *    
 *     app.get('/', function(req, res) {
 *       ...
 *     });
 *    
 *     // Use the ratchet error handler to send exceptions to your ratchet.io account
 *     app.use(ratchet.errorHandler('RATCHET_ACCESS_TOKEN'));
 * 
 *     app.listen(6943);
 *
 *  Standalone - 
 *
 *     var ratchet = require('node-ratchet');
 *     ratchet.init('RATCHET_ACCESS_TOKEN');
 *     ratchet.reportMessage('Hello world', 'debug');
 *     ratchet.shutdown(); // Processes any remaining items and stops any running timers
 *
 *  Uncaught exceptions - 
 *
 *     var ratchet = require('node-ratchet');
 *     ratchet.handleUncaughtExceptions('RATCHET_ACCESS_TOKEN');
 *
 *  Send exceptions and request data -
 *
 *     app.get('/', function(req, res) {
 *       try {
 *         ...
 *       } catch (e) {
 *         ratchet.handleError(e, req);
 *       }
 *     });
 *
 *  Track people - 
 *
 *     app.get('/', function(req, res) {
 *       req.userId = 12345; // or req.user_id
 *       ratchet.reportMessage('Interesting event', req);
 *     });
 */

exports.init = function(accessToken, options) {
  /*
   * Initialize the ratchet library.
   *
   * For more information on each option, see http://ratchet.io/docs/api_items/
   *
   * Supported options, (all optional):
   *
   *  host - Default: os.hostname() - the hostname of the server the node.js process is running on
   *  environment - Default: 'production' - the environment the code is running in. e.g. 'staging'
   *  handler - Default: 'setInterval' - the method that the notifier will use to report exceptions,
   *    choices:
   *      setInterval: all items that are queued up are sent to ratchet.io in batches in a setInterval callback
   *      nextTick: all items that are queued up are sent to ratchet.io in a process.nextTick callback
   *      inline: items are sent to ratchet.io as they are queued up, one at-a-time
   *  handlerInterval - Default: 3 - if handler=setInterval, this is the number of seconds between batch posts of items to ratchet.io
   *  batchSize - Default: 10 - the max number of items sent to ratchet.io at a time
   *  endpoint - Default: 'https://submit.ratchet.io/api/1/' - the url to send items to
   *  root - the path to your code, (not including any trailing slash) which will be used to link source files on ratchet.io
   *  branch - the branch in your version control system for this code
   *  
   */
  if (!initialized) {
    api.init(accessToken, options);
    notifier.init(api, options);
    initialized = true;
  }
};


/*
 * reportMessage(message, level, request, callback)
 *
 * Sends a message to ratchet.io with optional level, request and callback.
 * The callback should take a single parameter to indicate if there was an
 * error.
 *
 * Parameters:
 *  message - a string to send to ratchet.io
 *  level - Default: 'error' - optional level, 'debug', 'info', 'warning', 'error', 'critical'
 *  request - optional request object to send along with the message
 *  callback - optional callback that will be invoked depending on the handler method used.
 *    Should take a single parameter to denote if there was an error.
 *
 * Examples:
 *
 *  ratchet.reportMessage("User purchased something awesome!", "info");
 *
 *  ratchet.reportMessage("Something suspicious...", "debug", null, function(err) {
 *    // message was queued/sent to ratchet.io
 *  });
 *
 */
exports.reportMessage = notifier.reportMessage;

/*
 * handleError(err, request, callback)
 *
 * Send a details about the error to ratchet.io along with optional request information.
 *
 * Parameters:
 *  err - an Exception/Error instance
 *  request - an optional request object to send along with the error
 *  callback - optional callback that will be invoked depending on the handler method used.
 *    Should take a single parameter to denote if there was an error.
 *
 * Examples:
 *
 *  ratchet.handleError(new Error("Could not connect to the database"));
 *
 *  ratchet.handleError(new Error("it's just foobar..."), function(err) {
 *    // error was queued/sent to ratchet.io
 *  });
 *
 *  ratchet.handleError(new Error("invalid request!"), req);
 *
 */
exports.handleError = notifier.handleError;


exports.shutdown = function(callback) {
  notifier.shutdown(callback);
};


exports.errorHandler = function(accessToken, options) {
  /*
   * A middleware handler for connect and express.js apps. For a list
   * of supported options, see the init() docs above.
   *
   * All exceptions thrown from inside an express or connect get/post/etc... handler
   * will be sent to ratchet.io when this middleware is installed.
   */
  exports.init(accessToken, options);
  return function(err, req, res, next) {
    if (err) {
      notifier.handleError(err, req, function(ratchetErr) {
        if (ratchetErr) {
          util.error('error reporting to ratchet, ignoring: %s', ratchetErr);
        }
        return next(err, req, res);
      });
    } else {
      return next(err, req, res);
    }
  };
};


exports.handleUncaughtExceptions = function(accessToken, options) {
  /*
   * Registers a handler for the process.uncaughtException event. The handler
   * will immediately send the uncaught exception + all queued items to ratchet.io
   * and then shut down the ratchet library via ratchet.shutdown().
   *
   * Note: The node.js authors advise against using these type of handlers.
   * More info: http://nodejs.org/api/process.html#process_event_uncaughtexception
   *
   */
  exports.init(accessToken, options);
  process.on('uncaughtException', function(err) {
    notifier.changeHandler('inline');
    notifier.handleError(err, function(err) {
      exports.shutdown(function(e) {
        process.exit(1);
      });
    });
  });
};


exports.api = api;
exports.notifier = notifier;

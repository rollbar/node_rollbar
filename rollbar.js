var api = require('./lib/api');
var notifier = require('./lib/notifier');
var parser = require('./lib/parser');

var initialized = false;

/**
 *
 * Rollbar:
 *
 *  Handle caught and uncaught exceptions, and report messages back to rollbar.
 *
 *  This library requires an account at http://rollbar.com/.
 *
 * Example usage:
 *
 *  Express - 
 *
 *     var express = require('express');
 *     var rollbar = require('rollbar');
 * 
 *     var app = express();
 *    
 *     app.get('/', function(req, res) {
 *       ...
 *     });
 *    
 *     // Use the rollbar error handler to send exceptions to your rollbar account
 *     app.use(rollbar.errorHandler('ROLLBAR_ACCESS_TOKEN'));
 * 
 *     app.listen(6943);
 *
 *  Standalone - 
 *
 *     var rollbar = require('rollbar');
 *     rollbar.init('ROLLBAR_ACCESS_TOKEN');
 *     rollbar.reportMessage('Hello world', 'debug');
 *     rollbar.shutdown(); // Processes any remaining items and stops any running timers
 *
 *  Uncaught exceptions - 
 *
 *     var rollbar = require('rollbar');
 *     rollbar.handleUncaughtExceptions('ROLLBAR_ACCESS_TOKEN');
 *
 *  Send exceptions and request data -
 *
 *     app.get('/', function(req, res) {
 *       try {
 *         ...
 *       } catch (e) {
 *         rollbar.handleError(e, req);
 *       }
 *     });
 *
 *  Track people - 
 *
 *     app.get('/', function(req, res) {
 *       req.userId = 12345; // or req.user_id
 *       rollbar.reportMessage('Interesting event', req);
 *     });
 */

exports.init = function(accessToken, options) {
  /*
   * Initialize the rollbar library.
   *
   * For more information on each option, see http://rollbar.com/docs/api_items/
   *
   * Supported options, (all optional):
   *
   *  host - Default: os.hostname() - the hostname of the server the node.js process is running on
   *  environment - Default: 'unspecified' - the environment the code is running in. e.g. 'staging'
   *  handler - Default: 'setInterval' - the method that the notifier will use to report exceptions,
   *    choices:
   *      setInterval: all items that are queued up are sent to rollbar in batches in a setInterval callback
   *      nextTick: all items that are queued up are sent to rollbar in a process.nextTick callback
   *      inline: items are sent to rollbar as they are queued up, one at-a-time
   *  handlerInterval - Default: 3 - if handler=setInterval, this is the number of seconds between batch posts of items to rollbar
   *  batchSize - Default: 10 - the max number of items sent to rollbar at a time
   *  endpoint - Default: 'https://api.rollbar.com/api/1/' - the url to send items to
   *  root - the path to your code, (not including any trailing slash) which will be used to link source files on rollbar
   *  branch - the branch in your version control system for this code
   *  codeVersion - the version or revision of your code
   *  
   */
  if (!initialized) {
    if (!accessToken) {
      console.error('[Rollbar] Missing access_token.');
      return;
    }

    options = options || {};
    options.environment = options.environment || process.env.NODE_ENV || 'unspecified';

    api.init(accessToken, options);
    notifier.init(api, options);
    initialized = true;
  }
};


/*
 * reportMessage(message, level, request, callback)
 *
 * Sends a message to rollbar with optional level, request and callback.
 * The callback should take a single parameter to indicate if there was an
 * error.
 *
 * Parameters:
 *  message - a string to send to rollbar
 *  level - Default: 'error' - optional level, 'debug', 'info', 'warning', 'error', 'critical'
 *  request - optional request object to send along with the message
 *  callback - optional callback that will be invoked depending on the handler method used.
 *    Should take a single parameter to denote if there was an error.
 *
 * Examples:
 *
 *  rollbar.reportMessage("User purchased something awesome!", "info");
 *
 *  rollbar.reportMessage("Something suspicious...", "debug", null, function(err) {
 *    // message was queued/sent to rollbar
 *  });
 *
 */
exports.reportMessage = notifier.reportMessage;


/*
 * reportMessageWithPayloadData(message, payloadData, request, callback)
 *
 * The same as reportMessage() but allows you to specify extra data along with the message.
 *
 * Parameters:
 *  message - a string to send to rollbar
 *  payloadData - an object containing key/values to be sent along with the message.
 *    e.g. {level: "warning", fingerprint: "CustomerFingerPrint"}
 *  request - optional request object to send along with the message
 *  callback - optional callback that will be invoked depending on the handler method used.
 *    Should take a single parameter to denote if there was an error.
 *
 * Examples:
 *
 *  rollbar.reportMessageWithPayloadData("Memcache miss",
 *    {level: "debug", fingerprint: "Memcache-miss"}, null, function(err) {
 *    // message was queued/sent to rollbar
 *  });
 *
 */
exports.reportMessageWithPayloadData = notifier.reportMessageWithPayloadData;

/*
 * handleError(err, request, callback)
 *
 * Send a details about the error to rollbar along with optional request information.
 *
 * Parameters:
 *  err - an Exception/Error instance
 *  request - an optional request object to send along with the error
 *  callback - optional callback that will be invoked depending on the handler method used.
 *    Should take a single parameter to denote if there was an error.
 *
 * Examples:
 *
 *  rollbar.handleError(new Error("Could not connect to the database"));
 *
 *  rollbar.handleError(new Error("it's just foobar..."), function(err) {
 *    // error was queued/sent to rollbar
 *  });
 *
 *  rollbar.handleError(new Error("invalid request!"), req);
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
   * will be sent to rollbar when this middleware is installed.
   */
  exports.init(accessToken, options);
  return function(err, req, res, next) {
    var cb = function(rollbarErr) {
      if (rollbarErr) {
        console.error('[Rollbar] Error reporting to rollbar, ignoring: ' + rollbarErr);
      }
      return next(err, req, res);
    };
    if (!err) {
      return next(err, req, res);
    } else if (err instanceof Error) {
      return notifier.handleError(err, req, cb);
    } else {
      return notifier.reportMessage('Error: ' + err, 'error', req, cb);
    }
  };
};


exports.handleUncaughtExceptions = function(accessToken, options) {
  /*
   * Registers a handler for the process.uncaughtException event. The handler
   * will immediately send the uncaught exception + all queued items to rollbar
   * and then shut down the rollbar library via rollbar.shutdown().
   *
   * If options.exitOnUncaught is set, the notifier will optionally call process.exit(1)
   * once the rollbar items are processed.
   *
   * Note: The node.js authors advise against using these type of handlers.
   * More info: http://nodejs.org/api/process.html#process_event_uncaughtexception
   *
   */

  // Default to exiting on uncaught exceptions unless options.exitOnUncaughtException is set
  options = options || {};
  var exitOnUncaught = options.exitOnUncaughtException === undefined ? false : !!options.exitOnUncaughtException;
  delete options.exitOnUncaughtException;

  exports.init(accessToken, options);

  if (initialized) {
    process.once('uncaughtException', function(err) {
      notifier.changeHandler('inline');
      notifier.handleError(err, function(err) {
        exports.shutdown(function(e) {
          if (exitOnUncaught) {
            process.exit(1);
          }
        });
      });
    });
  } else {
    console.error('[Rollbar] Rollbar is not initialized. Uncaught exceptions will not be tracked.');
  }
};


exports.api = api;
exports.notifier = notifier;

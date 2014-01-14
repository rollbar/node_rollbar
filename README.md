# Rollbar notifier for Node.js [![Build Status](https://secure.travis-ci.org/rollbar/node_rollbar.png?branch=master)](https://travis-ci.org/rollbar/node_rollbar)

<!-- RemoveNext -->
Generic library for reporting exceptions and other messages to [Rollbar](https://rollbar.com). Requires a Rollbar account.

<!-- Sub:[TOC] -->

##Quick start

```js
// include and initialize the rollbar library with your access token
var rollbar = require("rollbar");
rollbar.init("POST_SERVER_ITEM_ACCESS_TOKEN");

// record a generic message and send to rollbar
rollbar.reportMessage("Hello world!");
```

<!-- RemoveNextIfProject -->
Be sure to replace ```POST_SERVER_ITEM_ACCESS_TOKEN``` with your project's ```post_server_item``` access token, which you can find in the Rollbar.com interface.

## Installation

Install using the node package manager, npm:

    $ npm install --save rollbar


## Configuration

### Using Express

```js
var express = require('express');
var rollbar = require('rollbar');

var app = express();

app.get('/', function(req, res) {
  // ...
});

// Use the rollbar error handler to send exceptions to your rollbar account
app.use(rollbar.errorHandler('POST_SERVER_ITEM_ACCESS_TOKEN'));

app.listen(6943);
```


### Standalone

In your main application, require and initialize using your access_token::

```js
var rollbar = require("rollbar");
rollbar.init("POST_SERVER_ITEM_ACCESS_TOKEN");
```
    
Other options can be passed into the init() function using a second parameter. E.g.:

```js
// Queue up and report messages/exceptions to rollbar every 5 seconds
rollbar.init("POST_SERVER_ITEM_ACCESS_TOKEN", {handler: "setInterval", handlerInterval: 5});
```

When you are finished using rollbar, clean up any remaining items in the queue using the shutdown function:

```js
rollbar.shutdown();
```


### Uncaught exceptions

```js
var options = {
  // Call process.exit(1) when an uncaught exception occurs but after reporting all
  // pending errors to Rollbar.
  //
  // Default: true
  exitOnUncaughtException: true
};
rollbar.handleUncaughtExceptions("POST_SERVER_ITEM_ACCESS_TOKEN", options);
```


### Configuration reference

`rollbar.init()` takes the following configuration options (pass in the second parameter):

  <dl>
  <dt>host</dt>
  <dd>The hostname of the server the node.js process is running on.

Default: `os.hostname()`
  </dd>
  
  <dt>environment</dt>
  <dd>The environment the code is running in.

Default: `'unspecified'`
  </dd>
  
  <dt>handler</dt>
  <dd>The method that the notifier will use to report exceptions.
  Supported values:

- setInterval -- all items that are queued up are sent to rollbar in batches in a setInterval callback
  - NOTE: using this mode will mean that items are queued internally before being sent. For applications that send a very large amount of items, it is possible to use up too much memory and crash the node process. If this starts to happen, try lowering the handlerInterval setting or switch to a different handler, e.g. 'nextTick'.
- nextTick -- all items that are queued up are sent to rollbar in a process.nextTick callback
- inline -- items are sent to rollbar as they are queued up, one at-a-time

Default: `setInterval`
  </dd>
  
  <dt>handlerInterval</dt>
  <dd>If the handler is `setInterval`, this is the number of seconds between batch posts of items to rollbar.

Default: `3`
  </dd>
  
  <dt>batchSize</dt>
  <dd>The max number of items sent to rollbar at a time.

Default: `10`
  </dd>
  
  <dt>endpoint</dt>
  <dd>The rollbar API base url.

Default: `'https://api.rollbar.com/api/1/'`
  </dd>
  
  <dt>root</dt>
  <dd>The path to your code, (not including any trailing slash) which will be used to link source files on Rollbar.

e.g. `'/Users/bob/Development'`
  </dd>
  
  <dt>branch</dt>
  <dd>The branch in your version control system for this code.

e.g. `'master'`
  </dd>
  
  <dt>codeVersion</dt>
  <dd>The version or revision of your code.

e.g. `'868ff435d6a480929103452e5ebe8671c5c89f77'`
  </dd>
  
  <dt>scrubFields</dt>
  <dd>List of field names to scrub out of POST. Values will be replaced with astrickses. If overriding, make sure to list all fields you want to scrub, not just fields you want to add to the default. Param names are converted to lowercase before comparing against the scrub list.

Default: `['passwd', 'password', 'secret', 'confirm_password', 'password_confirmation']`
  </dd>
  </dl>

## Contributing

Contributions are welcome. The project is hosted on github at http://github.com/rollbar/node_rollbar


## Examples

See the examples directory for more uses.


## Additional Help
If you have any questions, feedback, etc., drop us a line at support@rollbar.com


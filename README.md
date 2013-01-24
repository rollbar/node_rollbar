# ratchetio [![Build Status](https://secure.travis-ci.org/ratchetio/node_ratchet.png?branch=master)](https://travis-ci.org/ratchetio/node_ratchet)

Generic library for reporting exceptions and other messages to [Ratchet.io](https://ratchet.io). Requires a Ratchet.io account.

```js
// include and initialize the ratchet library with your access token
var ratchet = require("ratchetio");
ratchet.init("ACCESS_TOKEN");

// record a generic message and send to ratchet.io
ratchet.reportMessage("Hello world!");
```


## Installation

Install using the node package manager, npm:

    $ npm install --save ratchetio


## Configuration

### Using Express

```js
var express = require('express');
var ratchet = require('ratchetio');

var app = express();

app.get('/', function(req, res) {
  // ...
});

// Use the ratchet error handler to send exceptions to your ratchet.io account
app.use(ratchet.errorHandler('RATCHET_ACCESS_TOKEN'));

app.listen(6943);
```


### Standalone

In your main application, require and initialize using your access_token::

```js
var ratchet = require("ratchetio");
ratchet.init("ACCESS_TOKEN");
```
    
Other options can be passed into the init() function using a second parameter. E.g.:

```js
// Queue up and report messages/exceptions to ratchet every 5 seconds
ratchet.init("ACCESS_TOKEN", {handler: "setInterval", handlerInterval: 5});
```

When you are finished using ratchet, clean up any remaining items in the queue using the shutdown function:

```js
ratchet.shutdown();
```


### Configuration reference

`ratchet.init()` takes the following configuration options (pass in the second parameter):

- **host**: The hostname of the server the node.js process is running on
    
    _default:_ `os.hostname()`

- **environment**: The environment the code is running in.

    _default:_ `production`

- **handler**: The method that the notifier will use to report exceptions.

    Supported values:

    - setInterval -- all items that are queued up are sent to ratchet.io in batches in a setInterval callback
      - NOTE: using this mode will mean that items are queued internally before being sent. For applications that send a very large amount of items, it is possible to use up too much memory and crash the node process. If this starts to happen, try lowering the handlerInterval setting or switch to a different handler, e.g. 'nextTick'.
    - nextTick -- all items that are queued up are sent to ratchet.io in a process.nextTick callback
    - inline -- items are sent to ratchet.io as they are queued up, one at-a-time

    _default:_ `setInterval`

- **handlerInterval**: If the handler is `setInterval`, this is the number of seconds between batch posts of items to ratchet.io.

    _default:_ `3`

- **batchSize**: The max number of items sent to ratchet.io at a time.

    _default:_ `10`

- **endpoint**: The Ratchet.io API base url.

    _default:_ `https://submit.ratchet.io/api/1/`

- **root**: The path to your code, (not including any trailing slash) which will be used to link source files on ratchet.io.

    e.g. `/Users/bob/Development`

- **branch**: The branch in your version control system for this code

    e.g. `master`

- **scrubFields**: List of field names to scrub out of POST. Values will be replaced with astrickses. If overriding, make sure to list all fields you want to scrub, not just fields you want to add to the default. Param names are converted to lowercase before comparing against the scrub list.

    _default:_ `['passwd', 'password', 'secret', 'confirm_password', 'password_confirmation']`


## Contributing

Contributions are welcome. The project is hosted on github at http://github.com/ratchetio/node_ratchet


## Examples

See the examples directory for more uses.


## Additional Help
If you have any questions, feedback, etc., drop us a line at support@ratchet.io


node_ratchet
===============

node_ratchet is a generic library for reporting exceptions and other messages to Ratchet.io_::

    // include and initialize the ratchet library with your access token
    var ratchet = require("ratchet");
    ratchet.init("ACCESS_TOKEN");

    // record a generic message and send to ratchet.io
    ratchet.reportMessage("Hello world!");

Requirements
------------
node_ratchet requires:

node-uuid


Installation
------------
Install using the node package manager, npm::

    npm install --save ratchet

Configuration
-------------
In your main application, require and initialize using your access_token::

    var ratchet = require("ratchet");
    ratchet.init("ACCESS_TOKEN");
    
Other options can be passed into the init() function using a second parameter. E.g.::

    // Queue up and report messages/exceptions to ratchet every 5 seconds
    ratchet.init("ACCESS_TOKEN", {handler: "setInterval", handlerInterval: 5});

When you are finished using ratchet, clean up any remaining items in the queue using the shutdown function::

    ratchet.shutdown();


Configuration regerence
-----------------------

ratchet.init() takes the following configuration options::

host
    The hostname of the server the node.js process is running on

    **default:** ``os.hostname()``
environment
    The environment the code is running in.

    **default:** ``production``
handler
    The method that the notifier will use to report exceptions.

    Supported values:

    - setInterval -- all items that are queued up are sent to ratchet.io in batches in a setInterval callback
    - nextTick -- all items that are queued up are sent to ratchet.io in a process.nextTick callback
    - inline -- items are sent to ratchet.io as they are queued up, one at-a-time

    **default:** ``setInterval``
handlerInterval
    If the handler is `setInterval`, this is the number of seconds between batch posts of items to ratchet.io.

    **default:** ``3``
batchSize
    The max number of items sent to ratchet.io at a time.

    **default:** ``10``
endpoint
    The url to send items to.

    **default:** ``https://submit.ratchet.io/api/1/``
root
    The path to your code, (not including any trailing slash) which will be used to link source files on ratchet.io.

    E.g. ``/Users/bob/Development``
branch
    The branch in your version control system for this code

    E.g. ``master``


Contributing
------------

Contributions are welcome. The project is hosted on github at http://github.com/ratchetio/node_ratchet


Additional Help
---------------
If you have any questions, feedback, etc., drop me a line at cory@ratchet.io


.. _Ratchet.io: http://ratchet.io/
.. _`download the zip`: https://github.com/ratchetio/node_ratchet/zipball/master

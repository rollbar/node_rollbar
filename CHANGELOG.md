# Change Log

**0.6.6**
  This repo is deprecated in favor of the upcoming 2.0.0 release found
  [here](https://github.com/rollbar/rollbar.js). That library will be a universal javascript library
  that can be used both in the browser and in a nodejs environment. This release is only to move the
  latest pointer on npm back to a known good state in master before the release of rollbar.js 2.0
  happens.

**0.6.5**
- Bug fix for uuid dependency

**0.6.4**
- Replace deprecated `node-uuid` package with `uuid`.  See [#102](https://github.com/rollbar/node_rollbar/pull/102) — thanks, [@gastonelhordoy](https://github.com/gastonelhordoy)!
- Added support for Rollbar deploys. See [#57](https://github.com/rollbar/node_rollbar/issues/57)
- Added an option to show manually-reported errors on the console.  See [#94](https://github.com/rollbar/node_rollbar/issues/94)
- Fixed a bug that accidentally exposed the length of scrubbed values.  See [#98](https://github.com/rollbar/node_rollbar/issues/98)
- Serialize object/array values for data.context instead of throwing an error.  See [#73](https://github.com/rollbar/node_rollbar/issues/73)
- Added the `retryInterval` option.  In the event of a connection failure, queue up errors and push them to the Rollbar API later.  See [#49](https://github.com/rollbar/node_rollbar/issues/49)
- Added a `wait(cb)` function that executes the callback when there are no pending items in flight being sent to Rollbar [#39](https://github.com/rollbar/node_rollbar/issues/39) 
- Fixed a bug in how we were extracting the client's IP address from requests. See [#104](https://github.com/rollbar/node_rollbar/issues/104) - thanks, [@modosc](https://github.com/modosc)!

**0.6.3**
- Fix a bug which caused the exception class to not be properly reported. See [#95](https://github.com/rollbar/node_rollbar/pull/95), [#96](https://github.com/rollbar/node_rollbar/pull/96)

**0.6.2**
- Added support for unhandled rejections. See [#85](https://github.com/rollbar/node_rollbar/pull/85)

**0.6.1**
- Fix a bug which was causing an error to be thrown when Rollbar was used before being initialized. See [#86](https://github.com/rollbar/node_rollbar/pull/86)

**0.6.0**
- Support nested errors. See [#81](https://github.com/rollbar/node_rollbar/pull/81)
- Add istanbul and codeclimate-test-reporter. See [#83](https://github.com/rollbar/node_rollbar/pull/83)

**0.5.16**
- Added a bunch of auth headers to the list of default scrubbed headers. See [#71](https://github.com/rollbar/node_rollbar/pull/71)

**0.5.15**
- Replaces `console.log/error()` calls with the `debug` library. See [#74](https://github.com/rollbar/node_rollbar/pull/74)
- Adds a new configuration option for `minimumLevel`. See [#76](https://github.com/rollbar/node_rollbar/pull/76)

**0.5.14**
- Fix jslint warnings. See [#75](https://github.com/rollbar/node_rollbar/pull/75)

**0.5.13**
- Fix buildRequestData when req.body is a plain object. See [#72](https://github.com/rollbar/node_rollbar/pull/72)

**0.5.12**
- Added link into verbose logging output to Rollbar item. See [#70](https://github.com/rollbar/node_rollbar/pull/70)

**0.5.11**
- Send more useful data when `handleError()` is called with a plain Object. See [#65](https://github.com/rollbar/node_rollbar/pull/65)
- Expose `parser` instance. See [#64](https://github.com/rollbar/node_rollbar/pull/64)

**0.5.10**
- Fixes a bug with the `enabled` option. See [#63](https://github.com/rollbar/node_rollbar/pull/63)

**0.5.9**
- Adds an `enabled` option. See [#54](https://github.com/rollbar/node_rollbar/pull/54)

**0.5.8**
- Fix bug that caused some frames to not report context lines. See [#52](https://github.com/rollbar/node_rollbar/pull/52)

**0.5.7**
- Fix bug fetching request protocol. See [#56](https://github.com/rollbar/node_rollbar/pull/56)

**0.5.6**
- Describe the original error a bit better when `handleErrorWithPayloadData()` couldn't recognize the err type.

**0.5.5**
- Bugfix: Fix `handleError()` to work with Strings.

**0.5.4**
- Bugfix: Cast `error.message` to `String`. Test objects as Error arguments.

**0.5.3**
- Fix bug that was causing an infinite loop while building the payload for request objects.

**0.5.2**
- Collect `process.argv` and `process.pid` as part of the 'server' metadata

**0.5.1**
- Fixed a bug that occurred if `exitOnUncaught` was set to true and an unhandled exception occurred, ([#38](https://github.com/rollbar/node_rollbar/issues/38))

**0.5.0**
- Refactored most of the notifier code to use the async library.
  - Fixed myriad JSLint warnings/errors.
- Fixed various bugs related to the different `handler` options.
- Added `X-Rollbar-Access-Token` header for faster responses from the server.
- Fix bug where the app could shut down before all data was sent to Rollbar and/or the callbacks called, ([#34](https://github.com/rollbar/node_rollbar/issues/34))

### Backwards incompatible changes

- Removed `handler`, `handlerInterval` options
  - There is only a single handler type now which will send the error/message
    as soon as it can. The communication is all done via asynchronous calls and will
    not block IO.
- Removed `batchSize` option
  - The notifier no longer batches together data before sending it. This was error prone and could lead to loss of
    errors if there was a problem reporting any in the batch.
- Removed rollbar.shutdown()
  - Now that there are no longer any `setInterval()` calls, there is no need to wait for anything from the Rollbar
    library in order to shutdown cleanly.


**0.4.5**
- Fix a bug that was causing the notifier to not catch all uncaught exceptions. ([#36](https://github.com/rollbar/node_rollbar/pull/36))

**0.4.4**
- Fix a bug when `req.socket` was undefined. ([#33](https://github.com/rollbar/node_rollbar/pull/33))

**0.4.3**
- Support HTTP proxies. ([#32](https://github.com/rollbar/node_rollbar/pull/32))

**0.4.2**
- Fixed a bug that caused the library to crash if a request was provided but did not have a `headers` object. ([#31](https://github.com/rollbar/node_rollbar/pull/31))

**0.4.1**
- Fixed a bug that caused the library to crash if a request was provided but did not have a `connection` object.
- Added some error logging to the `uncaughtException` handler to output uncaught exceptions to the log and to log if there were any problems handling the uncaught exception.

**0.4.0**
- Set the default handler to be `inline` so that if the program crashes since some configurations will shut down before the `setInterval()` is fired.
  - To maintain v0.3 behavior, simply add `handler: 'setInterval'` to the config object passed to `rollbar.init()`.

**0.3.13**
- Allow environment and framework to be overridden by payload data.

**0.3.12**
- Fix param scrubbing failing when the value is null/undefined ([#30](https://github.com/rollbar/node_rollbar/pull/30))

**0.3.11**
- Add `handleErrorWithPayloadData` function, exposing more of the Rollbar API when reporting errors. ([#29](https://github.com/rollbar/node_rollbar/pull/29))

**0.3.10**
- Fix edge case where multiple errors were not handled correctly. ([#28](https://github.com/rollbar/node_rollbar/issues/28))

**0.3.9**
- Add `verbose` configuration option, `true` by default.

**0.3.8**
- Revert JSON escape change and fix bug with content-length header.

**0.3.7**
- Properly escape unicode in payloads to fix server-side json parsing

**0.3.6**
- Allow addRequestData to be overridden. ([#24](https://github.com/rollbar/node_rollbar/pull/24))

**0.3.5**
- Handles a situation where circular references could likely exist which may result in no payload being sent at all.

**0.3.4**
- Fix bug that was not properly serializing JSON when there were multiple references to the same object in the payload.

**0.3.3**
- Fix bug that caused error reports to be swallowed when the stacktrace contains files that cannot be read ([#22](https://github.com/rollbar/node_rollbar/pull/22))
- Parse CoffeeScript stack traces ([#23](https://github.com/rollbar/node_rollbar/pull/23))

**0.3.2**
- Added `json-stringify-safe` to handle circular object references properly in payload construction
- Use `console.error` instead of `util.error` due to deprecation

**0.3.1**
- Don't require options to be passed into `handleUncaughtExceptions`

**0.3.0**
- Change default environment to 'unspecified' instead of 'production'

**0.2.11**
- Optionally `process.exit()` in uncaught error handler and change default environment to 'production'

**0.2.10**
- Generate context using the request's route instead of using the path

**0.2.9**
- Save request context in item payload

**0.2.8**
- Add support for req.body parsing for all http methods and not just POST

**0.2.7**
- Add code_version configuration option

**0.2.6**
- Add ability to scrub request headers

**0.2.5**
- Added in `rollbar.reportMessageWithPayloadData() export for rollbar.js`

**0.2.4**
- Adding reportMessageWithPayloadData

**0.2.3**
- Allow setting the person using Passport convention

**0.2.2**
- Return the last API response

**0.2.1**
- Never allow notifier code to crash

**0.2.0**
- Rename to Rollbar

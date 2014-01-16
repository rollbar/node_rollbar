# Change Log

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

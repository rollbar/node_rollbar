var ratchet = require('../ratchet');

var accessToken = "ACCESS_TOKEN";
ratchet.init(accessToken, {environment: 'playground'});
ratchet.handleUncaughtExceptions();

function foo() {
  return bar();
}

foo();

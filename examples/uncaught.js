var ratchet = require('../ratchet');

var accessToken = "8802be7c990a4922beadaaefb6e0327b";
ratchet.init(accessToken, {environment: 'playground'});
ratchet.handleUncaughtExceptions();

function foo() {
  return bar();
}

foo();

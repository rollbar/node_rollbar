var rollbar = require('../rollbar');

var accessToken = "ACCESS_TOKEN";
rollbar.init(accessToken, {environment: 'playground'});
rollbar.handleUncaughtExceptionsAndRejections();

function foo() {
  return bar();
}

if (typeof Promise === "undefined") {
  foo();
} else {
  new Promise(function(resolve, reject) {
    setTimeout(foo, 10);
    reject("Oh snap!");
  });
}


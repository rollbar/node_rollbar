/**
 * Created by coryvirok on 4/17/15.
 */
var raven = require('raven');
var client = new raven.Client('http://foo:bar@localhost:8000/api');

client.captureMessage('hello world!', function (result) {
  console.log('>>>>>', result);
});

setTimeout(function () {
  client.captureMessage("Oh snap", function(result) {
    console.log('2nd callback', result);
  })
}, 10);
console.log('Goodbye');
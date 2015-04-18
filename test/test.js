/**
 * Created by coryvirok on 4/9/15.
 */
var rollbar = require('../rollbar');
rollbar.init('8802be7c990a4922beadaaefb6e0327b', {verbose: true});


rollbar.handleError(new Error('Illustrate crasher 1'), function(err) {console.log('callback 1')});

setTimeout(function() {
  rollbar.handleError(new Error('Illustrate crasher 2'), function (err) {
    console.log('callback 2')
  });
}, 30);
console.log('Goodbye');

//rollbar.shutdown(function() {
//  console.log('shutdown, everything should be flushed/posted');
//});
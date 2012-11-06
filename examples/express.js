var express = require('express');
var ratchet = require('../ratchet');

var app = express();

app.get('/', function(req, res) {
  req.user_id = "test-user";
  throw new Error('Hello World');
});

app.use(ratchet.errorHandler("ACCESS_TOKEN",
                             {environment: 'playground'}));

console.log('browse to http://localhost:9876/ then go to your ratchet.io account: http://ratchet.io/');
app.listen(9876);

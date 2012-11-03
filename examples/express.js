var express = require('express');
var ratchet = require('../ratchet');

var app = express();

app.get('/', function(req, res) {
  req.user_id = "test-user";
  throw new Error('Hello World');
});

app.use(ratchet.errorHandler("8802be7c990a4922beadaaefb6e0327b",
                             {environment: 'playground'}));

console.log('browse to http://localhost:9876/');
app.listen(9876);

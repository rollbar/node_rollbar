var express = require('express');
var ratchet = require('../ratchet');

var app = express();
app.set('view engine', 'jade');

app.get('/', function(req, res) {
  return res.render('jadetest', {breakme: true});
});

app.use(ratchet.errorHandler("ACCESS_TOKEN",
                             {environment: 'playground'}));

console.log('browse to http://localhost:9876/ then go to your ratchet.io account: http://ratchet.io/');
app.listen(9876);

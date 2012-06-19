var notifier = require('./lib/notifier');
var express = require('./lib/middleware/connect');
var app = require('express').createServer();
function mainHandler(req, res) {
  throw new Error('Broke!');
}
app.error(express('893916d7644bd3b0743da13e784105b7', 'http://localhost:6943/api/item/'));
app.get('/', function mainHandler(req, res) {
  throw new Error('Broke!');
});
app.listen(6943);

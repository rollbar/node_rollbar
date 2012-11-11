var ratchet = require('../../ratchet');

exports.command = 'user';

// New user
var newUserDescription = 'Create a new ratchet.io user account';

function newUser(cmdName, username, email) {
  console.log('called newUser', cmdName, username, email);
  var pw = 'password';
  var confirm = 'password';
  ratchet.api.provisionUser(username, email, pw, confirm, function(err, data) {
    console.log('err', err);
    console.log('data', data);
  });
}

exports.actions = {
  'new <username> <email>': {
    fn: newUser,
    description: newUserDescription
  }
};

exports.init = function(config) {
  ratchet.init(null, {endpoint: 'http://localhost:8000/api/1/'});
};

exports.shutdown = function() {
  ratchet.shutdown();
};

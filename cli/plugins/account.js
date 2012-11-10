exports.command = 'account';

// New account
var newAccountDescription = 'Create a new ratchet.io account';

function newAccount(username, email) {
  ratchetLib.newAccount(username, email, pw);
  console.log('>>> username: %s email: %s', username, email);
}

exports.actions = {
  'new <username> <email>': {
    fn: newAccount,
    description: newAccountDescription
  }
};

exports.init = function(config) {
};

var notifier = require('../notifier'),
    parsers = require('../parsers');

module.exports = function connectMiddleware(notifier) {
    notifier = (notifier instanceof ratchet.Notifier) ? notifier : new ratchet.Notifier(notifier);
    return function(err, req, res, next) {
        if (err) {
          client.addWebRequestError(req, err, function(result) {
            next(err, req, res);
          });
        } else {
          next(err, req, res);
        }
    };
};

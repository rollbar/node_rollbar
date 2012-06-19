module.exports = require('./lib/notifier');
module.exports.middleware = {
    connect: require('./lib/middleware/connect')
};
// friendly alias for "ratchet.middleware.express"
module.exports.middleware.express = module.exports.middleware.connect;

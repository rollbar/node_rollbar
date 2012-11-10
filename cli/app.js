var commander = require('commander');
var ratchetio = require('ratchetio');
var plugin = require('./plugin');
var packageJson = require('../package.json');

var config = {};
ratchetio.init(config.access_token);

commander.version(packageJson.version);

function hookupPlugins(mods) {
  var i;
  var curMod;

  for (i = 0; i < mods.length; ++i) {
    curMod = mods[i];
    try {
      var cmd = commander.command(curMod.command);
      var actionName;
      var actionData;
      var fn;
      var desc;
      for (actionName in curMod.actions) {
        actionData = curMod.actions[actionName];
        fn = actionData.fn;
        desc = actionData.description;
        cmd.description(desc).action(fn);
      }
      console.log(cmd);
    } catch (e) {
      ratchetio.handleError(e);
    }
  }
}

plugin.init(ratchetio, config, function(err, pluginModules) {
  if (err) {
    console.error('could not initialize plugins');
    ratchetio.handleError(err);
    process.exit(1);
  } else {
    hookupPlugins(pluginModules);
    commander.parse(process.argv);
  }
});

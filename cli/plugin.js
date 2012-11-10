var fs = require('fs');

// Map of plugin name to plugin module
var loadedPluginModules = {};

exports.init = function(config, callback) {
  // Resolves the plugins directory path and loads all of the
  // plugin modules. 
  var cache = {};

  console.log('loading plugin modules');
  var loadAllPluginModules = function() {
    fs.realpath('./plugins', cache, function(err, path) {
      console.log(path);
      if (err) {
        console.error('could not resolve the plugins path, err: %s', err);
        return callback(err);
      } else {
        fs.readdir(path, function(err2, files) {
          console.log(files);
          if (err2) {
            console.error('could not read contents of plugins directory, %s, err: %s',
              path, err2);
            return callback(err2);
          } else {
            var modules = [];
            var i;
            var file;
            for (i = 0; i < files.length; ++i) {
              file = files[i];
              if (file.match(/^[a-zA-Z]+[a-zA-Z0-9_\-]*\.js$/)) {
                modules.push(loadPluginModule(path, file));
              }
            }
            console.log(modules);
            return initializeAllPlugins(modules);
          }
        });
      }
    });
  };

  var initializeAllPlugins = function(modules) {
    var i;
    for (i = 0; i < modules.length; ++i) {
      modules[i].init(config);
    }
    return callback(null, modules);
  };

  loadAllPluginModules();
};


var loadPluginModule = function(pluginsPath, moduleName) {
  // Calls require("./plugins/pluginName")
  try {
    mod = require(pluginsPath + "/" + moduleName);
  } catch (e) {
    console.error('could not load plugin module %s, err: %s', moduleName, e);
    return null;
  }
  loadedPluginModules[mod.SERVICE_NAME] = mod;
  return mod;
};

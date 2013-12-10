//
// Implements a FRCP library and client
//

var _ = require('underscore');
var resource = require('./resource');

DEFAULTS = {
};

var connection = null;
var addressPreFix = null;
var eventEmitter = new (require('events').EventEmitter)();


// Initialise the FRCP context
//
// @param opts host
// @param opts port
// @param opts domain
// @param opts sender_id
// @param opts app_name
//
// @returns true if successful, false otherwise (need a better solution to signal errors)
//
module.exports.init = function(opts, cfgFunc) {
  var l = module.exports.logger;

  if (connection) {
    l.warn('Already initialised.');
    return false;
  }

  if (! opts) { opts = {}; };
  parseArgv(opts);
  if (cfgFunc && _.isFunction(cfgFunc)) {
    cfgFunc();
  }

  var uri = opts.uri.replace(/\/+$/, ''); // replace trailing '/'
  addressPreFix = uri + '/';

  l.debug("Connecting to '" + opts.uri + "'.");
  connection = require('./connection')({uri: uri});

  return true;
};

function parseArgv(opts) {
  var argv = process.argv;
  for (var i = 0; i < argv.length; i++) {
    var p = argv[i];
    var consume = 0;

    if (p.indexOf("--frcp-uri") == 0) {
      opts.uri = argv[i + 1];
      consume = 2;
    } else if (p.indexOf("--frcp-help") == 0) {
      console.log("OML options:\n");
      console.log("\t--frcp-uri URI            URI of server to send measurements to [file:-]");
      console.log("\t--frcp-help                   Show this message");
      process.exit(0);
    }
    if (consume > 0) {
      argv.splice(i, consume);
      i--;
    }
  }

}


var resource_f = module.exports.resource = function(name, subFunc) {
  if (!connection) {
    module.exports.logger.warn('Need to first call init().');
    throw new Error('Need to first call init().');
  }

  return resource("frcp." + name, subFunc, addressPreFix, connection);
};

var proxy = require('./proxy');
module.exports.proxy = function(name, instance, context) {
  if (!connection) {
    module.exports.logger.warn('Need to first call init().');
    throw new Error('Need to first call init().');
  }

  var r = resource_f(name);
  return proxy(r, instance, context, eventEmitter);
};

module.exports.on = function(name, callback) {
  eventEmitter.on(name, callback);
};


module.exports.logger = function() {
  var my = {};
  my.debug = function(msg) { console.log('DEBUG(frcp): ' + msg); };
  my.info = function(msg) { console.log(' INFO(frcp): ' + msg); };
  my.warn = function(msg) { console.log(' WARN(frcp): ' + msg); };
  my.error = function(msg) { console.log('ERROR(frcp): ' + msg); };
  my.fatal = function(msg) {
    console.log('FATAL(frcp): ' + msg);
    process.exit(1);
  };

  return my;
}();

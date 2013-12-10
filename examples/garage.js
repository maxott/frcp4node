
var frcp = require('../src/frcp');
var u = require('util');
var l = frcp.logger;
var _ = require('underscore');

frcp.init({uri: process.argv[2] || 'amqp://localhost'});

//
//
var Garage = function() {
  var my = function() {};
  var name = "Max's Garage";
  var engines = [];

  my.garageName = function(v) { // my.name doesn't work'
    if (!arguments.length) { return name; }
    name = v;
    return my;
  };

  my.engines = function() {
    return engines;
  };

  my.createEngine = function(opts) {
    var engine = require('./engine')(opts);
    engines.push(engine);
    return engine;
  };

  my.releaseEngine = function(engine) {
    engines = _.without(engines, engine);
    return my;
  };

  return my;
};

context = {
  tut: 'http://schema.mytestbed.net/tut01/',
  type: 'tut:garage',
//  vocab: 'tut:garage#',
  xsd: "http://www.w3.org/2001/XMLSchema#",
  name: {
    _getSet: 'garageName'
  },
  engines: {
    type: 'tut:engine',
    container: 'set',
    _get: 'engines'
  },
  _factory: {
    engine: ['createEngine', 'releaseEngine']
  }
};

// Create an initial garage and make it available through 'garage'
frcp.proxy('garage', Garage(), context);




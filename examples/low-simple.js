
// Tests the low-level API implementing a simple RP.
//

var frcp = require('../src/frcp');
var u = require('util');
var l = frcp.logger;
var _ = require('underscore');

frcp.init({uri: process.argv[2] || 'amqp://localhost'});

// The low-level API

var state = {
  propA: 23,
  propB: 'hi'
};
var propNames = _.keys(state);

// Monitoring a resource
//
var r = frcp.resource('foo')
  .onRequest(function(props) {
    if (!props) { return state; } // return everything
    var reply = {};
    _.each(_.intersection(_.keys(props), propNames), function(p) {
      reply[p] = state[p];
    });
    return reply;
  })
  .onConfigure(function(props) {
    var reply = {};
    _.each(_.intersection(_.keys(props), propNames), function(p) {
      reply[p] = state[p] = props[p];
    });
    return reply;
  })
  .onCreate(function(type, props, frcpProxy) {
    frcpProxy.onRequest(function() { return {propC: 64}; });
    return props;
  })
  ;

// Send an INFORM message
r.inform({propA: 1, propB: 2});

// Stop monitoring after some time
//setTimeout(function() { r.cancel(); console.log('CANCEL'); }, 5000);

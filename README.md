# FRCP library for Node.JS

[![Build Status](https://travis-ci.org/squaremo/frcp.node.png)](https://travis-ci.org/squaremo/frcp.node)

    npm install frcp

 * [GitHub pages][gh-pages]
 * [API reference][gh-pages-apiref]

An implementaiotn of the FRCP protocol for node.

Project status:

 - Expected to work
 - A fair few tests

Not yet:

 - Measured test coverage
 - Completely stable APIs
 - Comprehensive documentation
 - Known to be used in production (if anyone *is* using it in
   production, do let me know)

## Client API example

```javascript

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
setTimeout(function() { r.cancel(); }, 3000);

// The high-level API

var Engine = function(opts) {
  var rpm = opts.rpm || 0;
  
  var my = function() {};
  
  my.rpm = function(val) {
    if (!arguments.length) return rpm;
    rpm = val;
    return my;
  };
}
  
frcp.bind('eng1', Engine({rpm: 2000}));
    
    
```

## Running tests

    npm test

Best run with a locally-installed RabbitMQ, but you can point it at
another using the environment variable `URL`; e.g.,

    URL=amqp://dev.rabbitmq.com npm test

**NB** You may experience test failures due to timeouts if using the
dev.rabbitmq.com instance.

Lastly, setting the environment variable `LOG_ERRORS` will cause the
tests to output error messages encountered, to the console; this is
really only useful for checking the kind and formatting of the errors.

    LOG_ERRORS=true npm test

## Test coverage

    make coverage
    open file://`pwd`/coverage/lcov-report/index.html

[gh-pages]: http://maxott.github.com/frcp4node/
[gh-pages-apiref]: http://maxott.github.com/frcp4node/doc/channel_api.html
[nave]: https://github.com/isaacs/nave
[tutes]: http://maxott.github.com/frcp4node/tree/master/examples/tutorials

# FRCP library for Node.JS

[![Build Status](https://travis-ci.org/squaremo/frcp.node.png)](https://travis-ci.org/squaremo/frcp.node)

    npm install frcp

 * [GitHub pages][gh-pages]
 * [API reference][gh-pages-apiref]

An implementation of the FRCP protocol for node.

Project status:

 - Expected to work

Not yet:

 - RELEASE not implemented
 - Completely stable APIs
 - Comprehensive tests
 - Measured test coverage
 - Comprehensive documentation
 - Known to be used in production (if anyone *is* using it in
   production, do let me know)

## Client API example

More extended examples can be found in the [example directory][example-readme]

### Low-level API

```javascript
var _ = require('underscore');
var frcp = require('frcp');

frcp.init({uri: process.argv[2] || 'amqp://localhost'});

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
    var s = {propC: 64};
    frcpProxy.onRequest(function() { return s; });
    return s;
  })
  ;

// Send an immediate INFORM message
r.inform(state);

// Stop monitoring after some time
setTimeout(function() { r.cancel(); }, 3000);
```

### High-level API

```javascript
var frcp = require('frcp');

frcp.init({uri: process.argv[2] || 'amqp://localhost'});

// Define a simple object with a single property 'rpm'
var Engine = function(opts) {
  var rpm = opts.rpm || 2000;
  var my = function() {};
  
  my.rpm = function(val) {
    if (!arguments.length) return rpm;
    rpm = val;
    return my;
  };
  return my;
}
// Describe object
context =  {
  type: 'http://schema.mytestbed.net/tut01/engine',
  rpm: {
    type: 'http://www.w3.org/2001/XMLSchema#integer',
    _getSet: 'rpm'
  }
}
// Create an engine and make it available as 'eng1'
frcp.proxy('eng1', Engine(), context);
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
[example-readme]: http://maxott.github.com/frcp4node/examples/README.md

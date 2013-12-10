
var frcp = require('./frcp');
var _ = require('underscore');
var u = require('util');

var ctxtNames = {id: '@id', type: '@type', vocab: '@vocab', container: '@container'};

// keep track of instances and their addresses to resolve them when they appear
// as property values.
//
var instances = {};

var proxy = module.exports = function(resource, instance, context, eventEmitter) {
  var ctxt = context || instance['@context'];
  if (!ctxt) {
    throw new Error("[" + resource.address() + "] Missing context.");
  }
  instance['@inform'] = function(itype, props) {
    resource.inform(props, null, itype);
  };


  var evCtxt = {ctxt: ctxt, instance: instance}; // event emitter context

  var my = {};

  my.configure = function(props) {
    var reply = {};
    _.each(_.intersection(_.keys(props), setterNames), function(pn) {
      var iVal = props[pn];
      // var cf = ctxt[pn]._convF; // check if we have a casting function
      // if (cf) {
        // iVal = cf(iVal);
      // }
      try {
        setters[pn](iVal);
        // As the return value of setters is undefined, return the response of
        // the respective getter. If there is no getter, don't return anything.
        if (getters[pn]) {
          var oVal = getters[pn]();
          oVal = resolveValue(oVal);
          if (oVal != null) { reply[pn] = oVal; }
        }
      } catch(err) {
        eventEmitter.emit('proxy.configure', 'While calling setter', err);
        return;
      }
    });
    return reply;
  };

  var getters = {};
  var setters = {};
  var creator = {};
  var destroyer = {};

  function bindFunc(fn, name) {
    if (_.isFunction(fn)) {
      return fn;
    }
    if (! _.isString(fn)) {
      throw new Error("[" + resource.address() + "] Not sure how to handle '" + fn + "' for '" + name + "'.");
    }
    var f = instance[fn];
    if (! f) {
      throw new Error("[" + resource.address() + "] Can't resolve function for '" + fn + "'.");
    }
    return _.bind(f, resource);
  };

  function onRequest(props) {
    var pnames = props ? _.intersection(_.keys(props), getterNames) : getterNames;
    var reply = {};
    _.each(pnames, function(pn) {
      try {
        var value = getters[pn]();
        value = resolveValue(value);
        if (value != null) { reply[pn] = value; }
      } catch(err) {
        eventEmitter.emit('proxy.request', 'While calling getter', err);
        return;
      }
    });
    reply['@context'] = ldContext(props == null);
    return reply;
  };

  function onConfigure(props) {
    var reply = {};
    _.each(_.intersection(_.keys(props), setterNames), function(pn) {
      var iVal = props[pn];
      try {
        setters[pn](iVal);
        // As the return value of setters is undefined, return the response of
        // the respective getter. If there is no getter, don't return anything.
        if (getters[pn]) {
          var oVal = getters[pn]();
          oVal = resolveValue(oVal);
          if (oVal != null) { reply[pn] = oVal; }
        }
      } catch(err) {
        eventEmitter.emit('proxy.configure', 'While calling setter', err);
        return;
      }
    });
    return reply;
  };

  function onCreate(type, props, resource) {
    var proto = creator[type];
    if (! proto) {
      eventEmitter.emit('proxy.create', 'Request ot create unknown type \'' + type + '\'.');
      throw new Error("Unknown type '" + type + "'.");
    }
    var membership = props.membership;
    delete props.membership;
    try {
      // we can't configure directly as we don't know casting information
      var child = proto({});
      var childProxy = proxy(resource, child, null, eventEmitter);
      childProxy.configure(props);
    } catch(err) {
      eventEmitter.emit('proxy.create', 'While creating \'' + type + '\'.', err);
      throw err;
    }
    return;
  };

  function bindResource(resource) {
    resource
      .onRequest(onRequest)
      .onConfigure(onConfigure)
      .onCreate(onCreate)
      ;
  }

  var ldCtxt = null;
  var ldCtxURI = null;
  function ldContext(urlOnly) {
    if (urlOnly) {
      return ldCtxURI;
    }
    if (! ldCtxt) {
      ldCtxt = {};
      _.each(ctxt, _.partial(processContextLine, ldCtxt));
      if (ldCtxt['@type'] && !ldCtxt['@vocab']) {
        // Default @vocab is @type ns
        var vocab = ldCtxt['@type'];
        if (! _.contains(['/', '#'], vocab.slice(-1))) {
          // make sure there is a useful separator between expanded NS and the value;
          vocab = vocab + '#';
        }
        ldCtxt['@vocab'] = vocab;
      }
    }
    return ldCtxt;
  };


  function processContextLine(ctxt, value, key) {
    if (key[0] == '_') { return; }

    if (_.isObject(value)) {
      var dc = ctxt[key] = {};
      _.each(value, _.partial(processContextLine, dc));
      if (_.isEmpty(dc)) {
        // Add at least an '@id'
        dc['@id'] = key;
      }
      return;
    }
    if (! _.isString(value)) {
      eventEmitter.emit('proxy.contextLD', "Don't know how to process '" + value + "' in '" + key + "'.");
      return;
    }
    var k = ctxtNames[key] || key;
    if (k == '@container') {
      // Should we check for 'set' and 'list' specifically?
      if (value[0] != '@') {
        value = '@' + value;
      }
    }
    ctxt[k] = value;
  }

  // Return a 'serialised' version of 'value' to send back
  // in an FRCP message.
  //
  function resolveValue(value) {
    if (value == null) { return null; }

    if (_.isArray(value)) {
      return _.map(value, resolveValue);
    }
    if (_.isObject(value)) {
      // Should be reference to previously proxied resource
      var ref = instances[value];
      if (! ref) {
        eventEmitter.emit('proxy.resolveValue', "Don't know how to seralize value", value, evCtxt);
        return null;
      }
      return ref;
    }
    return value;
  };

  function resolveCtxtURI(value) {
    if (! value) { return null; }

    var p = value.split(':');
    var ctxt = ldContext(false);
    var ns = null;
    if (p.length == 1) {
      // use vocab or
      ns = ctxt['@vocab'] || ctxt['@type'];
    } else {
      var prefix = p.shift();
      if (p[0][0] == '/') {
        // this is already a fully qualified name
        return value;
      }
      value = p.join(':');
      ns = ctxt[prefix];
    }

    if (! ns) {
      ns = 'UNKNOWN_NS';
      eventEmitter.emit('proxy.resolveCtxtURI', "Missing base namespace for '" + ctxt['@type'] + "'.");
    }
    if (! _.contains(['/', '#'], ns.slice(-1))) {
      // make sure there is a useful separator between expanded NS and the value;
      ns = ns + '#';
    }
    var u = ns + value;
    return u;
  }

  // INIT

  _.each(ctxt, function(v, k) {
    if (! _.isObject(v)) { return; }
    var f = null;
    if (f = v._get || v._getSet) {
      getters[k] = bindFunc(f, k);
    }
    if (f = v._set || v._getSet) {
      var convF = null;
      if (v.type) {
        var type = resolveCtxtURI(v.type);
        switch (type) {
          case 'http://www.w3.org/2001/XMLSchema#string':
            convF = v._convF = function(val) { f("" + val); };
            break; // don't do anything
          case 'http://www.w3.org/2001/XMLSchema#integer':
          case 'http://www.w3.org/2001/XMLSchema#int':
          case 'http://www.w3.org/2001/XMLSchema#long':
          case 'http://www.w3.org/2001/XMLSchema#short':
          case 'http://www.w3.org/2001/XMLSchema#decimal':
            convF = v._convF = function(val) { f(parseInt(val)); };
            break;
          case 'http://www.w3.org/2001/XMLSchema#boolean':
            convF = v._convF = function(val) { f(val[0] == 't' || val[0] == 'T'); };
            break;
          case 'http://www.w3.org/2001/XMLSchema#double':
          case 'http://www.w3.org/2001/XMLSchema#float':
            convF = v._convF = function(val) { f(parseFloat(val)); };
            break;
          case 'http://www.w3.org/2001/XMLSchema#date':
          case 'http://www.w3.org/2001/XMLSchema#dateTime':
            convF = v._convF = function(val) { f(Date.parse(val)); };
            break;

          // case 'http://www.w3.org/2001/XMLSchema#time:
          // case 'http://www.w3.org/2001/XMLSchema#duration':

          default:
            eventEmitter.emit('proxy.typeConv', "Can convert unknown type '" + type + "'.", evCtxt);
        }
      }
      setters[k] = bindFunc(convF || f, k);
    }
  });

  var getterNames = _.keys(getters);
  var setterNames = _.keys(setters);

  if (! (ldCtxURI = resolveCtxtURI(ctxt.type))) {
    ldCtxURI = 'UNKNOWN';
    eventEmitter.emit('proxy.contextLD', "Can't resolve type URI.", evCtxt);
  }

  _.each(ctxt._factory, function(v, k) {
    creator[k] = bindFunc(v[0], k);
    destroyer[k] = bindFunc(v[1], k);
  });

  bindResource(resource);
  instances[instance] = {
    '@id': resource.address(),
    '@type': ldCtxURI
  };


  return my;
};

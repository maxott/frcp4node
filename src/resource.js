
var frcp = require('./frcp');
var u = require('util');
var uuid = require('node-uuid');
//uuid.v1();

module.exports = function(name, subFunc, addressPrefix, connection) {
  var publisher = connection.publish(name, {contentType: 'text/json'});
  var src = addressPrefix + name;
  var my = {};

  my.inform = function(props, context, itype) {
    if (!context) { context = {}; };
    var msg = {
      src: src,
      op: 'inform',
      itype: itype || 'status',
      props: props
    };
    if (context.mid) {
      msg.cid = context.mid;
    }
    msg.mid = uuid.v1();

    frcp.logger.debug("[" + name + "] Sending: " + u.inspect(msg));
    publisher(msg);
    return my;
  };

  my.onRequest = function(callback) {
    my._subscribe(function(msg) {
      if (msg.op != 'request') { return; }
      var props = msg.props;
      if (Object.keys(props).length == 0) {
        // make it easier to discover that all properties are requested
        props = null;
      }
      var reply = callback(props, msg); // hash of props
      if (reply) {
        msg.reply(reply);
      }
    });
    return my;
  };

  my.onConfigure = function(callback) {
    my._subscribe(function(msg) {
      if (msg.op != 'configure') { return; }
      var props = msg.props;
      if (Object.keys(props).length == 0) {
        // Nothing to configure. Not sure what should happen. IGNORE.
        return;
      }
      var reply = callback(props, msg); // hash of props
      if (reply) {
        msg.reply(reply);
      }
    });
    return my;
  };

  my.onCreate = function(callback) {
    my._subscribe(function(msg) {
      if (msg.op != 'create') { return; }
      var props = msg.props;
      var type = props.type;
      if (! type) {
        return;  // TODO: Send error message?
      }
      delete props.type;
      var uid = props.uid || uuid.v1();
      delete props.uid;
      var newRes = frcp.resource(uid);
      var reply = callback(type, props, newRes, msg);
      if (! reply) { reply = {}; }
      reply.res_id = newRes.address();
      reply.uid = uid;
      if (! reply.type) { reply.type = type; }
      msg.reply(reply, 'CREATION.OK');
    });
    return my;
  };

  // Cancel all subscriptions
  my.cancel = function() {
    if (subscription) {
      subscription.cancel();
    }
    subscription = null;
    subscriptionHandlers = [];
    return my;
  };

  my.address = function() {
    return src;
  };

  // PRIVATE

  var subscriptionHandlers = [];
  var subscription = null;

  my._subscribe = function(callback) {
    if (! subscription) {
      // Subscribe to 'topic' and have 'callback' called for every incoming message.
      // Returns an object to further control the subscription. Primarily a
      // 'cancel' function to cancel the subscription and an 'event' property which
      // holds an EventEmitter for events, such as 'error', ???
      //
      subscription = connection.subscribe(name, function(msgString) {
        var msg = JSON.parse(msgString);
        if (msg.src == src) { return; } // my own message
        msg.reply = reply;
        msg.__inform = my.inform;
        frcp.logger.debug("[" + name + "] Incoming: " + msgString);
        subscriptionHandlers.forEach(function(handler) {
          handler(msg);
        });
      });
    }
    subscriptionHandlers.push(callback);
    return my;
  };


  // INIT

  if (subFunc) {
    my.subscribe(subFunc);
  }

  return my;
};

function reply(properties, itype) {
  this.__inform(properties, this, itype);
}


var amqp = require('amqplib');
var when = require('when');
var _ = require('underscore');
var events = require('events');
var u = require('util');

// Creates an AMQP connection to an AMQP broker whose address is
// given by 'opts.uri'. Defaults to 'amqp://localhost'
// Setting 'opts.noop' to true will create a dummy interface which
// silently ignores all subscriptions and publications, even internal
// ones.
//
module.exports = function(opts) {
  if (!opts) { opts = {}; }
  function my() {};
  var uri = opts.uri || 'amqp://localhost';
  var channel;
  var noop = (opts.noop == true);
  var closed = false;


  // Return a function which publishes the first argument given
  // to 'topic'
  //
  my.publish = function(topic, publishOpts) {
    if (noop) { return function() {}; }

    var ex = topic;
    var ok = channel.then(function(ch) {
                return ch.assertExchange(ex, 'topic', {durable: false, autoDelete: true});
              });

    var q = queue(ok.then(function() { return channel; }), function(msg, ch) {
                    //console.log("PUBLISH(%s): %s", topic, msg);
                    ch.publish(ex, "", new Buffer(msg), publishOpts);
              });
    return q;
  };

  // Subscribe to 'topic' and have 'callback' called for every incoming message.
  // Returns an object to further control the subscription. Primarily a
  // 'cancel' function to cancel the subscription and an 'event' property which
  // holds an EventEmitter for events, such as 'error', ???
  //
  my.subscribe = function(topic, callback) {
    var em = new events.EventEmitter();
    var queue = null;

    function pub() {};
    pub.event = em;

    ok = channel.then(function(ch) {
      ch.assertQueue('', {exclusive: true}).then(function (qok) {
        queue = qok.queue;
        return when.all([
          ch.assertExchange(topic, 'topic', {durable: false, autoDelete: true}),
          ch.bindQueue(queue, topic, ''),
          ch.consume(queue, handleMessage)
        ]);
      }, handleError);

      pub.cancel = function() {
        return when.all([
          ch.unbindQueue(queue, topic, ''),
          ch.deleteQueue(queue)
        ]);
      };
    }, handleError);

    function handleMessage(msg) {
      if (! (msg && callback)) { return; }

      try {
        callback(msg.content.toString(), msg);
      } catch(err) {
        handleError(err);
      }
    }

    function handleError(msg) {
      em.emit('error', msg);
    }

    //em.on('error', function(msg) { console.log('ERROR: ' + msg); });
    return pub;
  };

  my.on = function(type, callback) {
    channel.then(function(ch) {
      ch.on(type, callback);
    });
    return my;
  };

  // Close the connection.
  //
  // NOTE: redefined below duing init
  //
  my.close = function() {
    closed = true;
  };

  // INIT
  if (noop) {
    // stub out all methods

    my.publish = function(topic) {
      return function() {};
    };

    my.subscribe = function(topic, callback) {
      function pub() {};
      pub.event = new events.EventEmitter();
      pub.cancel = function() {};
      return pub;
    };

    my.on = function(type, callback) { return my; };
    return my;
  }

  channel = amqp.connect(uri).then(function(conn) {
    my.close = function() {
      //conn.close.bind(conn);
      conn.close();
    };
    process.once('SIGINT', my.close);
    return conn.createChannel();
  });

  return my;
};


function queue(promise, func) {
  var q = [];
  var direct = null;
  promise.then(function(d) {
    _.each(q, function(e) { func(e, d); });
    direct = d;
  });

  function my(msg) {
    var m = JSON.stringify(msg);
    //console.log("PPPP>> " + m);
    if (direct) {
      func(m, direct);
    } else {
      q.push(m);
    }
    return my;
  };

  my.isEmpty = function() {
    return (!direct);  // when 'direct' is set, we have no queue
  };

  return my;
};


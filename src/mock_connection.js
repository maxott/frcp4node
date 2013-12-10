
var _ = require('underscore');
var events = require('events');
var u = require('util');

module.exports = function() {
  var subscriptions = {};

  my.publish = function(topic) {
    return (function() {
      function my(msg) {
        var sa = subscriptions[topic];
        if (sa) {
          _.each(sa, function(cbk) {
            cbk(msg);
          });
        }
        return my;
      };

      my.isEmpty = function() {
        return true;
      };

      return my;
    })();
  };

  my.subscribe = function(topic, callback) {
    function sub() {};
    sub.event = new events.EventEmitter();
    sub.cancel = function() {
      // remove from list
      subscriptions[topic] = _.without(subscriptions[topic], callback);
    };
    if (!subscriptions[topic]) { subscriptions[topic] = []; }
    subscriptions[topic].push(callback);
    return sub;
  };

  my.on = function(type, callback) { return my; };

  my.close = function() {};

  return my;
}();



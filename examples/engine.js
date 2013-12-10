

module.exports = function(opts) {
  var my = function() {};

  var maxPower = opts.maxPower || 676; // Set the engine maximum power to 676 bhp
  var provider = opts.provider || "Honda";
  var maxRPM = opts.maxRPM || 12500; // Maximum RPM of the engine is 12,500
  var rpm = opts.rpm || 1000; // Engine starts, RPM will stay at 1000 (i.e. engine is idle)
  var throttle = opts.throttle || 0.0; // Throttle is 0% initially
  var blownUp = false;

  my.maxPower = function(v) {
    if (!arguments.length) { return maxPower; }
    maxPower = v;
    return my;
  };

  my.provider = function(v) {
    return provider;
  };

  my.maxRPM = function(v) {
    if (!arguments.length) { return maxRPM; }
    maxRPM = v;
    return my;
  };

  my.rpm = function() {
    return rpm;
  };

  my.throttle = function(v) {
    if (!arguments.length) { return throttle; }
    if (! blownUp) throttle = v;
    return my;
  };

  my['@context'] = {
    tut: 'http://schema.mytestbed.net/tut01/',
    type: 'tut:engine',
    xsd: "http://www.w3.org/2001/XMLSchema#",
    max_power: {
      type: 'xsd:integer',
      _getSet: my.maxPower
    },
    provider: {
      _get: my.provider
    },
    max_rpm: {
      type: 'xsd:integer',
      _getSet: my.maxRPM
    },
    rpm: {
      type: 'xsd:integer',
      _get: my.rpm
    },
    throttle: {
      type: 'xsd:integer',
      _getSet: my.throttle
    },
  };

  // INIT

  var timer = setInterval(function() {
    if (rpm <= 0) return;

    if (rpm > maxRPM) {
      // blown up
      blownUp = true;
      rpm = throttle = 0;
      clearInterval(timer);
      my['@inform']('status', {rpm: 0, throttle: 0});
      return;
    }

    rpm += throttle * 1000 - 250;
    if (rpm < 1000) rpm = 1000; //idle

    if (rpm > 4000) {
      my['@inform']('status', {rpm: rpm, throttle: throttle});
    }
  }, 1000);

  return my;
};
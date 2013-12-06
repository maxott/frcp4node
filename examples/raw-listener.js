
var conn = require('../src/connection');

var argv = process.argv;
if (argv.length != 4) {
  console.log("ERROR: Missing arguments");
  console.log("USAGE: %s amqp-uri topic-name", argv[1]);
  process.exit(-1);
}

var uri = argv[2];
var topic = argv[3];

var connection = require('../src/connection')({uri: uri});

connection.subscribe(topic, function(msg) {
  console.log("%s: %s", topic, msg);
});


'use strict';

var wrapper = require('mongodb-perf-wrapper');

function createStatsClient() {
  var StatsD = require('node-statsd');
  var client = new StatsD({ host: '127.0.0.1', port: 8125 });
  return client;
}

function install(mongodb, options) {
  if (!options) options = {};

  var statsClient = options.statsClient || createStatsClient();
  var metric = options.metric || 'mongodb.client.query';
  var sampleRate = options.sampleRate || 1;

  wrapper.wrap(mongodb, function(collection, operation, timeMicroSeconds, query, responseErr) {
    var tags = ['coll:' + collection, 'op:' + operation];

    if (responseErr) {
      tags.push('error:1');
      statsClient.increment(metric + '.error', 1, sampleRate, tags);
    }

    statsClient.histogram(metric, timeMicroSeconds, sampleRate, tags);
  });

}

module.exports = {
  install: install
};


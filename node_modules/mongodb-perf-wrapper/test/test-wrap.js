
var mongodb = require('mongodb');
var wrapper = require('../lib/wrap');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

describe('wrap', function() {
  var db;
  var counts;

  describe('it should wrap the library', function() {
    beforeEach(function(done) {
      wrapper.wrap(mongodb, function(collection, operation, timeMicroSeconds, query, err) {
        assert(collection);
        assert(operation);
        assert(timeMicroSeconds >= 0);
        assert(timeMicroSeconds < 100000);
        assert(query);
        assert(!err);

        var key = collection + '.' + operation;

        if(!counts[key]) {
          counts[key] = 1;
        } else {
          counts[key]++;
        }
      });

      db = null;
      counts = {};

      MongoClient.connect('mongodb://localhost:27017/test', function(err, returnedDb) {
        if (err) return done(err);
        db = returnedDb;
        done();
      });

    });

    afterEach(function(done) {
      wrapper.unwrap(mongodb);
      if (!db) return done();
      db.close(done);
      db = null;
    });

    it('should wrap the library', function(done) {
      db.collection('t').insert({ a: 1, b: 2}, function(err) {
        if (err) return done(err);

        db.collection('t').findOne({}, function(err) {

          assert.deepEqual({
            't.insert': 1,
            't.findOne': 1
          }, counts);

          done(err);
        });
      });
    });

  });


});

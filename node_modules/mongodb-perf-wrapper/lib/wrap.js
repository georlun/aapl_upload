'use strict';

var COLLECTION_METHODS = [
  'aggregate',
  'bulkWrite',
  'count',
  'createIndex',
  'deleteMany',
  'deleteOne',
  'distinct',
  'drop',
  'dropAllIndexes',
  'dropIndex',
  'ensureIndex',
  'find',
  'findAndModify',
  'findAndRemove',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'geoHaystackSearch',
  'geoNear',
  'group',
  'indexes',
  'indexExists',
  'indexInformation',
  'initializeOrderedBulkOp',
  'initializeUnorderedBulkOp',
  'insert',
  'insertMany',
  'insertOne',
  'isCapped',
  'listIndexes',
  'mapReduce',
  'options',
  'parallelCollectionScan',
  'reIndex',
  'remove',
  'rename',
  'replaceOne',
  'save',
  'stats',
  'update',
  'updateMany',
  'updateOne'
];

function wrapFunction(proto, fnName, interceptor) {
  var original = proto[fnName];

  if (!original) return;

  proto["_wrap_" + fnName] = original;

  proto[fnName] = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    var startTime = process.hrtime();

    var callback = args[args.length - 1];
    var self = this;

    function timingCallback(err) {
      var time = process.hrtime(startTime);
      var timeMicroSeconds = time[0] * 1000000 + Math.round(time[1] / 1000);
      var callArgs = args[0];

      interceptor(self.collectionName, fnName, timeMicroSeconds, callArgs, err);
      if (callback) return callback.apply(null, arguments);
    }

    if (typeof callback !== 'function') {
      callback = null;
    } else {
      args[args.length - 1] = timingCallback;
    }

    return original.apply(this, args);
  };
}

function wrap(mongoLibrary, interceptor) {
  var CollectionPrototype = mongoLibrary.Collection.prototype;

  COLLECTION_METHODS.forEach(function(fnName) {
    wrapFunction(CollectionPrototype, fnName, interceptor);
  });
}

function unwrap(mongoLibrary) {
  var CollectionPrototype = mongoLibrary.Collection.prototype;

  COLLECTION_METHODS.forEach(function(fnName) {
    if (CollectionPrototype["_wrap_" + fnName]) {
      CollectionPrototype[fnName] = CollectionPrototype["_wrap_" + fnName];
      delete CollectionPrototype["_wrap_" + fnName];
    }
  });
}

module.exports = {
  wrap: wrap,
  unwrap: unwrap
};

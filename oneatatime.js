var isFunction = require('lodash.isfunction');

function oneAtATime(func) {
  var running = false;
  var queue = [];
  function done() {
    for (var i=0, n=queue.length; i<n; i++)
      queue[i].apply(this, arguments);
    running = false;
    queue = [];
  }
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.slice(-1)[0];
    if (isFunction(callback)) {
      queue.push(callback);
      args = args.slice(0, -1);
    }
    if (!running) {
      running = true;
      args.push(done);
      func.apply(this, args);
    }
  };
}

oneAtATime.justCallFirst = function callFirst(func) {
  var running = false;
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.slice(-1)[0];
    if (isFunction(callback))
      args = args.slice(0, -1);
    else
      callback = null;
    if (!running) {
      running = true;
      args.push(function() {
        if (callback)
          callback.apply(this, arguments);
        running = false;
      });
      func.apply(this, args);
    }
  };
};

module.exports = oneAtATime;

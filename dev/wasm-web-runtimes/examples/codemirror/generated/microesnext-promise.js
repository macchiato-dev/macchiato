(() => {
  // dev/wasm-web-runtimes/examples/codemirror/src/microesnext-promise.js
  function MicroPromise(executor) {
    if (!(this instanceof MicroPromise)) throw new TypeError("Promise requires new");
    if (typeof executor !== "function") throw new TypeError("Promise executor");
    this.state = 0;
    this.value = void 0;
    this.handlers = [];
    var self = this;
    var settled = false;
    function resolve(value) {
      if (settled) return;
      settled = true;
      settle(self, 1, value);
    }
    function reject(reason) {
      if (settled) return;
      settled = true;
      settle(self, 2, reason);
    }
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  function settle(promise, state, value) {
    if (state === 1 && value && typeof value.then === "function") {
      value.then(
        function(next) {
          settle(promise, 1, next);
        },
        function(error) {
          settle(promise, 2, error);
        }
      );
      return;
    }
    promise.state = state;
    promise.value = value;
    flush(promise);
  }
  function flush(promise) {
    if (promise.state === 0) return;
    var handlers = promise.handlers;
    promise.handlers = [];
    setTimeout(function() {
      for (var index = 0; index < handlers.length; index++) {
        run(promise, handlers[index]);
      }
    }, 0);
  }
  function run(promise, handler) {
    var callback = promise.state === 1 ? handler.fulfilled : handler.rejected;
    if (typeof callback !== "function") {
      if (promise.state === 1) handler.resolve(promise.value);
      else handler.reject(promise.value);
      return;
    }
    try {
      handler.resolve(callback(promise.value));
    } catch (error) {
      handler.reject(error);
    }
  }
  MicroPromise.prototype.then = function(fulfilled, rejected) {
    var source = this;
    return new MicroPromise(function(resolve, reject) {
      source.handlers.push({
        fulfilled,
        rejected,
        resolve,
        reject
      });
      flush(source);
    });
  };
  MicroPromise.prototype["catch"] = function(rejected) {
    return this.then(null, rejected);
  };
  MicroPromise.resolve = function(value) {
    if (value instanceof MicroPromise) return value;
    return new MicroPromise(function(resolve) {
      resolve(value);
    });
  };
  MicroPromise.reject = function(reason) {
    return new MicroPromise(function(_resolve, reject) {
      reject(reason);
    });
  };
  MicroPromise.all = function(values) {
    return new MicroPromise(function(resolve, reject) {
      var results = [];
      var remaining = values.length;
      if (remaining === 0) {
        resolve(results);
        return;
      }
      function receive(index2, value) {
        results[index2] = value;
        remaining = remaining - 1;
        if (remaining === 0) resolve(results);
      }
      for (var index = 0; index < values.length; index++) {
        (function(position) {
          MicroPromise.resolve(values[position]).then(function(value) {
            receive(position, value);
          }, reject);
        })(index);
      }
    });
  };
  globalThis.Promise = MicroPromise;
})();

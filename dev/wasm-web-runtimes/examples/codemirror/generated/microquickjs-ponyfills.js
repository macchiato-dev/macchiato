(() => {
  // dev/wasm-web-runtimes/examples/codemirror/vendor/ungap/map.js
  function sameValueZero(left, right) {
    return left === right || left !== left && right !== right;
  }
  function indexOf(keys, key) {
    for (var index = 0; index < keys.length; index++) {
      if (sameValueZero(keys[index], key)) return index;
    }
    return -1;
  }
  function iterator(values) {
    var index = 0;
    return { next: function() {
      return index < values.length ? { done: false, value: values[index++] } : { done: true };
    } };
  }
  function MapPonyfill(iterable) {
    this._keys = [];
    this._values = [];
    if (iterable) iterable.forEach(function(pair) {
      this.set(pair[0], pair[1]);
    }, this);
  }
  Object.defineProperty(MapPonyfill.prototype, "size", {
    configurable: true,
    get: function() {
      return this._keys.length;
    }
  });
  MapPonyfill.prototype.clear = function() {
    this._keys.length = this._values.length = 0;
  };
  MapPonyfill.prototype.delete = function(key) {
    var index = indexOf(this._keys, key);
    if (index < 0) return false;
    this._keys.splice(index, 1);
    this._values.splice(index, 1);
    return true;
  };
  MapPonyfill.prototype.entries = function() {
    return this._keys.map(function(key, index) {
      return [key, this._values[index]];
    }, this);
  };
  MapPonyfill.prototype.forEach = function(callback, receiver) {
    this._keys.forEach(function(key, index) {
      callback.call(receiver, this._values[index], key, this);
    }, this);
  };
  MapPonyfill.prototype.get = function(key) {
    var index = indexOf(this._keys, key);
    return index < 0 ? void 0 : this._values[index];
  };
  MapPonyfill.prototype.has = function(key) {
    return indexOf(this._keys, key) >= 0;
  };
  MapPonyfill.prototype.keys = function() {
    return this._keys.slice();
  };
  MapPonyfill.prototype.set = function(key, value) {
    var index = indexOf(this._keys, key);
    if (index < 0) index = this._keys.push(key) - 1;
    this._values[index] = value;
    return this;
  };
  MapPonyfill.prototype.values = function() {
    return this._values.slice();
  };
  MapPonyfill.prototype["@@iterator"] = function() {
    return iterator(this.entries());
  };

  // dev/wasm-web-runtimes/examples/codemirror/vendor/ungap/set.js
  function sameValueZero2(left, right) {
    return left === right || left !== left && right !== right;
  }
  function indexOf2(values, value) {
    for (var index = 0; index < values.length; index++) {
      if (sameValueZero2(values[index], value)) return index;
    }
    return -1;
  }
  function iterator2(values) {
    var index = 0;
    return { next: function() {
      return index < values.length ? { done: false, value: values[index++] } : { done: true };
    } };
  }
  function SetPonyfill(iterable) {
    this._values = [];
    if (iterable) iterable.forEach(this.add, this);
  }
  Object.defineProperty(SetPonyfill.prototype, "size", {
    configurable: true,
    get: function() {
      return this._values.length;
    }
  });
  SetPonyfill.prototype.add = function(value) {
    if (indexOf2(this._values, value) < 0) this._values.push(value);
    return this;
  };
  SetPonyfill.prototype.clear = function() {
    this._values.length = 0;
  };
  SetPonyfill.prototype.delete = function(value) {
    var index = indexOf2(this._values, value);
    if (index < 0) return false;
    this._values.splice(index, 1);
    return true;
  };
  SetPonyfill.prototype.entries = function() {
    return this._values.map(function(value) {
      return [value, value];
    });
  };
  SetPonyfill.prototype.forEach = function(callback, receiver) {
    this._values.forEach(function(value) {
      callback.call(receiver, value, value, this);
    }, this);
  };
  SetPonyfill.prototype.has = function(value) {
    return indexOf2(this._values, value) >= 0;
  };
  SetPonyfill.prototype.keys = SetPonyfill.prototype.values = function() {
    return this._values.slice();
  };
  SetPonyfill.prototype["@@iterator"] = function() {
    return iterator2(this.values());
  };

  // dev/wasm-web-runtimes/examples/codemirror/vendor/ungap/weakmap.js
  var nextWeakMap = 0;
  var hasOwn = Object.prototype.hasOwnProperty;
  function WeakMapPonyfill(iterable) {
    this._name = "__ungap_weakmap_" + nextWeakMap++;
    if (iterable) iterable.forEach(function(pair) {
      this.set(pair[0], pair[1]);
    }, this);
  }
  WeakMapPonyfill.prototype.delete = function(key) {
    return this.has(key) && delete key[this._name];
  };
  WeakMapPonyfill.prototype.get = function(key) {
    return this.has(key) ? key[this._name] : void 0;
  };
  WeakMapPonyfill.prototype.has = function(key) {
    return key != null && (typeof key === "object" || typeof key === "function") && hasOwn.call(key, this._name);
  };
  WeakMapPonyfill.prototype.set = function(key, value) {
    if (key == null || typeof key !== "object" && typeof key !== "function") {
      throw new TypeError("Invalid value used as weak map key");
    }
    Object.defineProperty(key, this._name, {
      configurable: true,
      value
    });
    return this;
  };

  // dev/wasm-web-runtimes/examples/codemirror/vendor/ungap/weakset.js
  var members = new WeakMapPonyfill();
  function WeakSetPonyfill(iterable) {
    members.set(this, new WeakMapPonyfill());
    if (iterable) iterable.forEach(this.add, this);
  }
  WeakSetPonyfill.prototype.add = function(value) {
    members.get(this).set(value, true);
    return this;
  };
  WeakSetPonyfill.prototype.delete = function(value) {
    return members.get(this).delete(value);
  };
  WeakSetPonyfill.prototype.has = function(value) {
    return members.get(this).has(value);
  };

  // dev/wasm-web-runtimes/examples/codemirror/node_modules/promise-polyfill/src/finally.js
  function finallyConstructor(callback) {
    var constructor = this.constructor;
    return this.then(
      function(value) {
        return constructor.resolve(callback()).then(function() {
          return value;
        });
      },
      function(reason) {
        return constructor.resolve(callback()).then(function() {
          return constructor.reject(reason);
        });
      }
    );
  }
  var finally_default = finallyConstructor;

  // dev/wasm-web-runtimes/examples/codemirror/node_modules/promise-polyfill/src/allSettled.js
  function allSettled(arr) {
    var P = this;
    return new P(function(resolve2, reject2) {
      if (!(arr && typeof arr.length !== "undefined")) {
        return reject2(
          new TypeError(
            typeof arr + " " + arr + " is not iterable(cannot read property Symbol(Symbol.iterator))"
          )
        );
      }
      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return resolve2([]);
      var remaining = args.length;
      function res(i2, val) {
        if (val && (typeof val === "object" || typeof val === "function")) {
          var then = val.then;
          if (typeof then === "function") {
            then.call(
              val,
              function(val2) {
                res(i2, val2);
              },
              function(e) {
                args[i2] = { status: "rejected", reason: e };
                if (--remaining === 0) {
                  resolve2(args);
                }
              }
            );
            return;
          }
        }
        args[i2] = { status: "fulfilled", value: val };
        if (--remaining === 0) {
          resolve2(args);
        }
      }
      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  }
  var allSettled_default = allSettled;

  // dev/wasm-web-runtimes/examples/codemirror/node_modules/promise-polyfill/src/any.js
  function AggregateError(errors, message) {
    this.name = "AggregateError", this.errors = errors;
    this.message = message || "";
  }
  AggregateError.prototype = Error.prototype;
  function any(arr) {
    var P = this;
    return new P(function(resolve2, reject2) {
      if (!(arr && typeof arr.length !== "undefined")) {
        return reject2(new TypeError("Promise.any accepts an array"));
      }
      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return reject2();
      var rejectionReasons = [];
      for (var i = 0; i < args.length; i++) {
        try {
          P.resolve(args[i]).then(resolve2).catch(function(error) {
            rejectionReasons.push(error);
            if (rejectionReasons.length === args.length) {
              reject2(
                new AggregateError(
                  rejectionReasons,
                  "All promises were rejected"
                )
              );
            }
          });
        } catch (ex) {
          reject2(ex);
        }
      }
    });
  }
  var any_default = any;

  // dev/wasm-web-runtimes/examples/codemirror/node_modules/promise-polyfill/src/index.js
  var setTimeoutFunc = setTimeout;
  function isArray(x) {
    return Boolean(x && typeof x.length !== "undefined");
  }
  function noop() {
  }
  function bind(fn, thisArg) {
    return function() {
      fn.apply(thisArg, arguments);
    };
  }
  function Promise2(fn) {
    if (!(this instanceof Promise2))
      throw new TypeError("Promises must be constructed via new");
    if (typeof fn !== "function") throw new TypeError("not a function");
    this._state = 0;
    this._handled = false;
    this._value = void 0;
    this._deferreds = [];
    doResolve(fn, this);
  }
  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    Promise2._immediateFn(function() {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }
  function resolve(self, newValue) {
    try {
      if (newValue === self)
        throw new TypeError("A promise cannot be resolved with itself.");
      if (newValue && (typeof newValue === "object" || typeof newValue === "function")) {
        var then = newValue.then;
        if (newValue instanceof Promise2) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === "function") {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }
  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }
  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      Promise2._immediateFn(function() {
        if (!self._handled) {
          Promise2._unhandledRejectionFn(self._value);
        }
      });
    }
    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }
  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === "function" ? onFulfilled : null;
    this.onRejected = typeof onRejected === "function" ? onRejected : null;
    this.promise = promise;
  }
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(
        function(value) {
          if (done) return;
          done = true;
          resolve(self, value);
        },
        function(reason) {
          if (done) return;
          done = true;
          reject(self, reason);
        }
      );
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }
  Promise2.prototype["catch"] = function(onRejected) {
    return this.then(null, onRejected);
  };
  Promise2.prototype.then = function(onFulfilled, onRejected) {
    var prom = new this.constructor(noop);
    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };
  Promise2.prototype["finally"] = finally_default;
  Promise2.all = function(arr) {
    return new Promise2(function(resolve2, reject2) {
      if (!isArray(arr)) {
        return reject2(new TypeError("Promise.all accepts an array"));
      }
      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return resolve2([]);
      var remaining = args.length;
      function res(i2, val) {
        try {
          if (val && (typeof val === "object" || typeof val === "function")) {
            var then = val.then;
            if (typeof then === "function") {
              then.call(
                val,
                function(val2) {
                  res(i2, val2);
                },
                reject2
              );
              return;
            }
          }
          args[i2] = val;
          if (--remaining === 0) {
            resolve2(args);
          }
        } catch (ex) {
          reject2(ex);
        }
      }
      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };
  Promise2.any = any_default;
  Promise2.allSettled = allSettled_default;
  Promise2.resolve = function(value) {
    if (value && typeof value === "object" && value.constructor === Promise2) {
      return value;
    }
    return new Promise2(function(resolve2) {
      resolve2(value);
    });
  };
  Promise2.reject = function(value) {
    return new Promise2(function(resolve2, reject2) {
      reject2(value);
    });
  };
  Promise2.race = function(arr) {
    return new Promise2(function(resolve2, reject2) {
      if (!isArray(arr)) {
        return reject2(new TypeError("Promise.race accepts an array"));
      }
      for (var i = 0, len = arr.length; i < len; i++) {
        Promise2.resolve(arr[i]).then(resolve2, reject2);
      }
    });
  };
  Promise2._immediateFn = // @ts-ignore
  typeof setImmediate === "function" && function(fn) {
    setImmediate(fn);
  } || function(fn) {
    setTimeoutFunc(fn, 0);
  };
  Promise2._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== "undefined" && console) {
      console.warn("Possible Unhandled Promise Rejection:", err);
    }
  };
  var src_default = Promise2;

  // dev/wasm-web-runtimes/examples/codemirror/src/microquickjs-platform.js
  globalThis.__microQuickJS = true;
  if (typeof Symbol === "undefined") {
    nextSymbol = 0;
    symbolRegistry = /* @__PURE__ */ Object.create(null);
    SymbolPonyfill = function(description) {
      return "@@symbol:" + String(description || "") + ":" + nextSymbol++;
    };
    SymbolPonyfill.iterator = "@@iterator";
    SymbolPonyfill.hasInstance = "@@hasInstance";
    SymbolPonyfill.toPrimitive = "@@toPrimitive";
    SymbolPonyfill.for = function(name) {
      return symbolRegistry[name] || (symbolRegistry[name] = SymbolPonyfill(name));
    };
    globalThis.Symbol = SymbolPonyfill;
  }
  var nextSymbol;
  var symbolRegistry;
  var SymbolPonyfill;
  if (typeof WeakRef === "undefined") {
    globalThis.WeakRef = function WeakRefPonyfill(value) {
      this.value = value;
    };
    WeakRef.prototype.deref = function() {
      return this.value;
    };
  }
  if (!Array.prototype.find) {
    Array.prototype.find = function(predicate, receiver) {
      for (var index = 0; index < this.length; index++) {
        if (predicate.call(receiver, this[index], index, this)) return this[index];
      }
    };
  }
  if (!Object.assign) {
    Object.assign = function(target) {
      if (target == null) throw new TypeError("Cannot convert null to object");
      for (var sourceIndex = 1; sourceIndex < arguments.length; sourceIndex++) {
        var source = arguments[sourceIndex];
        if (source == null) continue;
        Object.keys(source).forEach(function(key) {
          target[key] = source[key];
        });
      }
      return target;
    };
  }
  if (typeof encodeURIComponent === "undefined") {
    globalThis.encodeURIComponent = function(text) {
      var output = "";
      for (var index = 0; index < text.length; index++) {
        var scalar = text.charCodeAt(index);
        if (scalar >= 55296 && scalar <= 56319 && index + 1 < text.length) {
          scalar = 65536 + (scalar - 55296 << 10) + (text.charCodeAt(++index) - 56320);
        }
        if (scalar < 128 && /[A-Za-z0-9_.!~*'()-]/.test(String.fromCharCode(scalar))) {
          output += String.fromCharCode(scalar);
          continue;
        }
        var bytes = scalar < 128 ? [scalar] : scalar < 2048 ? [192 | scalar >> 6, 128 | scalar & 63] : scalar < 65536 ? [224 | scalar >> 12, 128 | scalar >> 6 & 63, 128 | scalar & 63] : [
          240 | scalar >> 18,
          128 | scalar >> 12 & 63,
          128 | scalar >> 6 & 63,
          128 | scalar & 63
        ];
        for (var byte = 0; byte < bytes.length; byte++) {
          output += "%" + (bytes[byte] < 16 ? "0" : "") + bytes[byte].toString(16).toUpperCase();
        }
      }
      return output;
    };
  }
  if (!Object.defineProperties) {
    Object.defineProperties = function(target, descriptors) {
      Object.keys(descriptors).forEach(function(name) {
        Object.defineProperty(target, name, descriptors[name]);
      });
      return target;
    };
  }
  if (!Number.isInteger) {
    Number.isInteger = function(value) {
      return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };
  }
  if (!String.prototype.localeCompare) {
    String.prototype.localeCompare = function(other) {
      var left = String(this);
      var right = String(other);
      return left < right ? -1 : left > right ? 1 : 0;
    };
  }
  [["global", "g"], ["ignoreCase", "i"], ["multiline", "m"]].forEach(
    function(entry) {
      if (!(entry[0] in RegExp.prototype)) {
        Object.defineProperty(RegExp.prototype, entry[0], {
          get: function() {
            return this.toString().slice(this.toString().lastIndexOf("/") + 1).indexOf(entry[1]) >= 0;
          }
        });
      }
    }
  );

  // dev/wasm-web-runtimes/examples/codemirror/src/microquickjs-ponyfills.js
  if (typeof globalThis.Map !== "function") globalThis.Map = MapPonyfill;
  if (typeof globalThis.Set !== "function") globalThis.Set = SetPonyfill;
  if (typeof globalThis.WeakMap !== "function") globalThis.WeakMap = WeakMapPonyfill;
  if (typeof globalThis.WeakSet !== "function") globalThis.WeakSet = WeakSetPonyfill;
  globalThis.Promise = src_default;
  if (globalThis.__microQuickJS) {
    const orderedMap = /* @__PURE__ */ new Map([["first", 1], [NaN, 2]]);
    const orderedSet = /* @__PURE__ */ new Set(["first", NaN]);
    if (orderedMap.size !== 2 || orderedMap.get(NaN) !== 2 || orderedMap.keys().join(",") !== "first,NaN") {
      throw new Error("native Map failed its bootstrap check");
    }
    if (orderedSet.size !== 2 || !orderedSet.has(NaN) || orderedSet.values().join(",") !== "first,NaN") {
      throw new Error("native Set failed its bootstrap check");
    }
    const key = {};
    const value = {};
    const map = /* @__PURE__ */ new WeakMap();
    const set = /* @__PURE__ */ new WeakSet();
    if (map.set(key, value) !== map || map.get(key) !== value || !map.has(key)) {
      throw new Error("native WeakMap failed its bootstrap check");
    }
    if (set.add(key) !== set || !set.has(key)) {
      throw new Error("native WeakSet failed its bootstrap check");
    }
    gc();
    if (!map.has(key)) throw new Error("native WeakMap key moved incorrectly");
    if (map.get(key) !== value) throw new Error("native WeakMap value moved incorrectly");
    if (!map.delete(key) || map.has(key)) throw new Error("native WeakMap delete failed");
    if (!set.delete(key) || set.has(key)) throw new Error("native WeakSet delete failed");
    const deadMap = /* @__PURE__ */ new WeakMap();
    for (let cycle = 0; cycle < 8; cycle++) {
      (function addTemporaryKey() {
        deadMap.set({}, cycle);
      })();
      gc();
      if (deadMap.has({})) throw new Error("native WeakMap retained a dead key");
    }
  }
})();
/*! Derived from @ungap/map; (c) Andrea Giammarchi - ISC */
/*! Derived from @ungap/set; (c) Andrea Giammarchi - ISC */
/*! Derived from @ungap/weakmap; (c) Andrea Giammarchi - ISC */
/*! Derived from @ungap/weakset; (c) Andrea Giammarchi - ISC */

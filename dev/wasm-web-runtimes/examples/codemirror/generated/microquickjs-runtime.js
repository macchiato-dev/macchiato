(function () {
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
    return {
      next: function next() {
        return index < values.length ? {
          done: false,
          value: values[index++]
        } : {
          done: true
        };
      }
    };
  }
  function MapPonyfill(iterable) {
    this._keys = [];
    this._values = [];
    if (iterable) iterable.forEach(function (pair) {
      this.set(pair[0], pair[1]);
    }, this);
  }
  Object.defineProperty(MapPonyfill.prototype, "size", {
    configurable: true,
    get: function get() {
      return this._keys.length;
    }
  });
  MapPonyfill.prototype.clear = function () {
    this._keys.length = this._values.length = 0;
  };
  MapPonyfill.prototype.delete = function (key) {
    var index = indexOf(this._keys, key);
    if (index < 0) return false;
    this._keys.splice(index, 1);
    this._values.splice(index, 1);
    return true;
  };
  MapPonyfill.prototype.entries = function () {
    return this._keys.map(function (key, index) {
      return [key, this._values[index]];
    }, this);
  };
  MapPonyfill.prototype.forEach = function (callback, receiver) {
    this._keys.forEach(function (key, index) {
      callback.call(receiver, this._values[index], key, this);
    }, this);
  };
  MapPonyfill.prototype.get = function (key) {
    var index = indexOf(this._keys, key);
    return index < 0 ? void 0 : this._values[index];
  };
  MapPonyfill.prototype.has = function (key) {
    return indexOf(this._keys, key) >= 0;
  };
  MapPonyfill.prototype.keys = function () {
    return this._keys.slice();
  };
  MapPonyfill.prototype.set = function (key, value) {
    var index = indexOf(this._keys, key);
    if (index < 0) index = this._keys.push(key) - 1;
    this._values[index] = value;
    return this;
  };
  MapPonyfill.prototype.values = function () {
    return this._values.slice();
  };
  MapPonyfill.prototype["@@iterator"] = function () {
    return iterator(this.entries());
  };
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
    return {
      next: function next() {
        return index < values.length ? {
          done: false,
          value: values[index++]
        } : {
          done: true
        };
      }
    };
  }
  function SetPonyfill(iterable) {
    this._values = [];
    if (iterable) iterable.forEach(this.add, this);
  }
  Object.defineProperty(SetPonyfill.prototype, "size", {
    configurable: true,
    get: function get() {
      return this._values.length;
    }
  });
  SetPonyfill.prototype.add = function (value) {
    if (indexOf2(this._values, value) < 0) this._values.push(value);
    return this;
  };
  SetPonyfill.prototype.clear = function () {
    this._values.length = 0;
  };
  SetPonyfill.prototype.delete = function (value) {
    var index = indexOf2(this._values, value);
    if (index < 0) return false;
    this._values.splice(index, 1);
    return true;
  };
  SetPonyfill.prototype.entries = function () {
    return this._values.map(function (value) {
      return [value, value];
    });
  };
  SetPonyfill.prototype.forEach = function (callback, receiver) {
    this._values.forEach(function (value) {
      callback.call(receiver, value, value, this);
    }, this);
  };
  SetPonyfill.prototype.has = function (value) {
    return indexOf2(this._values, value) >= 0;
  };
  SetPonyfill.prototype.keys = SetPonyfill.prototype.values = function () {
    return this._values.slice();
  };
  SetPonyfill.prototype["@@iterator"] = function () {
    return iterator2(this.values());
  };
  var nextWeakMap = 0;
  var hasOwn = Object.prototype.hasOwnProperty;
  function WeakMapPonyfill(iterable) {
    this._name = "__ungap_weakmap_" + nextWeakMap++;
    if (iterable) iterable.forEach(function (pair) {
      this.set(pair[0], pair[1]);
    }, this);
  }
  WeakMapPonyfill.prototype.delete = function (key) {
    return this.has(key) && delete key[this._name];
  };
  WeakMapPonyfill.prototype.get = function (key) {
    return this.has(key) ? key[this._name] : void 0;
  };
  WeakMapPonyfill.prototype.has = function (key) {
    return key != null && (typeof key === "object" || typeof key === "function") && hasOwn.call(key, this._name);
  };
  WeakMapPonyfill.prototype.set = function (key, value) {
    if (key == null || typeof key !== "object" && typeof key !== "function") {
      throw new TypeError("Invalid value used as weak map key");
    }
    Object.defineProperty(key, this._name, {
      configurable: true,
      value: value
    });
    return this;
  };
  var members = new WeakMapPonyfill();
  function WeakSetPonyfill(iterable) {
    members.set(this, new WeakMapPonyfill());
    if (iterable) iterable.forEach(this.add, this);
  }
  WeakSetPonyfill.prototype.add = function (value) {
    members.get(this).set(value, true);
    return this;
  };
  WeakSetPonyfill.prototype.delete = function (value) {
    return members.get(this).delete(value);
  };
  WeakSetPonyfill.prototype.has = function (value) {
    return members.get(this).has(value);
  };
  function finallyConstructor(callback) {
    var constructor = this.constructor;
    return this.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        return constructor.reject(reason);
      });
    });
  }
  var finally_default = finallyConstructor;
  function allSettled(arr) {
    var P = this;
    return new P(function (resolve2, reject2) {
      if (!(arr && typeof arr.length !== "undefined")) {
        return reject2(new TypeError(typeof arr + " " + arr + " is not iterable(cannot read property Symbol(Symbol.iterator))"));
      }
      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return resolve2([]);
      var remaining = args.length;
      function res(i2, val) {
        if (val && (typeof val === "object" || typeof val === "function")) {
          var then = val.then;
          if (typeof then === "function") {
            then.call(val, function (val2) {
              res(i2, val2);
            }, function (e) {
              args[i2] = {
                status: "rejected",
                reason: e
              };
              if (--remaining === 0) {
                resolve2(args);
              }
            });
            return;
          }
        }
        args[i2] = {
          status: "fulfilled",
          value: val
        };
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
  function AggregateError(errors, message) {
    this.name = "AggregateError", this.errors = errors;
    this.message = message || "";
  }
  AggregateError.prototype = Error.prototype;
  function any(arr) {
    var P = this;
    return new P(function (resolve2, reject2) {
      if (!(arr && typeof arr.length !== "undefined")) {
        return reject2(new TypeError("Promise.any accepts an array"));
      }
      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return reject2();
      var rejectionReasons = [];
      for (var i = 0; i < args.length; i++) {
        try {
          P.resolve(args[i]).then(resolve2).catch(function (error) {
            rejectionReasons.push(error);
            if (rejectionReasons.length === args.length) {
              reject2(new AggregateError(rejectionReasons, "All promises were rejected"));
            }
          });
        } catch (_ex) {
          reject2(_ex);
        }
      }
    });
  }
  var any_default = any;
  var setTimeoutFunc = setTimeout;
  function isArray(x) {
    return Boolean(x && typeof x.length !== "undefined");
  }
  function noop() {}
  function bind(fn, thisArg) {
    return function () {
      fn.apply(thisArg, arguments);
    };
  }
  function Promise2(fn) {
    if (!(this instanceof Promise2)) throw new TypeError("Promises must be constructed via new");
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
    Promise2._immediateFn(function () {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (_e) {
        reject(deferred.promise, _e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }
  function resolve(self, newValue) {
    try {
      if (newValue === self) throw new TypeError("A promise cannot be resolved with itself.");
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
    } catch (_e2) {
      reject(self, _e2);
    }
  }
  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }
  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      Promise2._immediateFn(function () {
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
      fn(function (value) {
        if (done) return;
        done = true;
        resolve(self, value);
      }, function (reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      });
    } catch (_ex2) {
      if (done) return;
      done = true;
      reject(self, _ex2);
    }
  }
  Promise2.prototype["catch"] = function (onRejected) {
    return this.then(null, onRejected);
  };
  Promise2.prototype.then = function (onFulfilled, onRejected) {
    var prom = new this.constructor(noop);
    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };
  Promise2.prototype["finally"] = finally_default;
  Promise2.all = function (arr) {
    return new Promise2(function (resolve2, reject2) {
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
              then.call(val, function (val2) {
                res(i2, val2);
              }, reject2);
              return;
            }
          }
          args[i2] = val;
          if (--remaining === 0) {
            resolve2(args);
          }
        } catch (_ex3) {
          reject2(_ex3);
        }
      }
      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };
  Promise2.any = any_default;
  Promise2.allSettled = allSettled_default;
  Promise2.resolve = function (value) {
    if (value && typeof value === "object" && value.constructor === Promise2) {
      return value;
    }
    return new Promise2(function (resolve2) {
      resolve2(value);
    });
  };
  Promise2.reject = function (value) {
    return new Promise2(function (resolve2, reject2) {
      reject2(value);
    });
  };
  Promise2.race = function (arr) {
    return new Promise2(function (resolve2, reject2) {
      if (!isArray(arr)) {
        return reject2(new TypeError("Promise.race accepts an array"));
      }
      for (var i = 0, len = arr.length; i < len; i++) {
        Promise2.resolve(arr[i]).then(resolve2, reject2);
      }
    });
  };
  Promise2._immediateFn = typeof setImmediate === "function" && function (fn) {
    setImmediate(fn);
  } || function (fn) {
    setTimeoutFunc(fn, 0);
  };
  Promise2._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== "undefined" && console) {
      console.warn("Possible Unhandled Promise Rejection:", err);
    }
  };
  var src_default = Promise2;
  globalThis.__microQuickJS = true;
  if (typeof Symbol === "undefined") {
    nextSymbol = 0;
    symbolRegistry = Object.create(null);
    SymbolPonyfill = function SymbolPonyfill(description) {
      return "@@symbol:" + String(description || "") + ":" + nextSymbol++;
    };
    SymbolPonyfill.iterator = "@@iterator";
    SymbolPonyfill.hasInstance = "@@hasInstance";
    SymbolPonyfill.toPrimitive = "@@toPrimitive";
    SymbolPonyfill.for = function (name) {
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
    WeakRef.prototype.deref = function () {
      return this.value;
    };
  }
  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate, receiver) {
      for (var index = 0; index < this.length; index++) {
        if (predicate.call(receiver, this[index], index, this)) return this[index];
      }
    };
  }
  if (!Object.assign) {
    Object.assign = function (target) {
      if (target == null) throw new TypeError("Cannot convert null to object");
      for (var sourceIndex = 1; sourceIndex < arguments.length; sourceIndex++) {
        var source = arguments[sourceIndex];
        if (source == null) continue;
        Object.keys(source).forEach(function (key) {
          target[key] = source[key];
        });
      }
      return target;
    };
  }
  if (typeof encodeURIComponent === "undefined") {
    globalThis.encodeURIComponent = function (text) {
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
        var bytes = scalar < 128 ? [scalar] : scalar < 2048 ? [192 | scalar >> 6, 128 | scalar & 63] : scalar < 65536 ? [224 | scalar >> 12, 128 | scalar >> 6 & 63, 128 | scalar & 63] : [240 | scalar >> 18, 128 | scalar >> 12 & 63, 128 | scalar >> 6 & 63, 128 | scalar & 63];
        for (var byte = 0; byte < bytes.length; byte++) {
          output += "%" + (bytes[byte] < 16 ? "0" : "") + bytes[byte].toString(16).toUpperCase();
        }
      }
      return output;
    };
  }
  if (!Object.defineProperties) {
    Object.defineProperties = function (target, descriptors) {
      Object.keys(descriptors).forEach(function (name) {
        Object.defineProperty(target, name, descriptors[name]);
      });
      return target;
    };
  }
  if (!Number.isInteger) {
    Number.isInteger = function (value) {
      return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };
  }
  if (!String.prototype.localeCompare) {
    String.prototype.localeCompare = function (other) {
      var left = String(this);
      var right = String(other);
      return left < right ? -1 : left > right ? 1 : 0;
    };
  }
  [["global", "g"], ["ignoreCase", "i"], ["multiline", "m"]].forEach(function (entry) {
    if (!(entry[0] in RegExp.prototype)) {
      Object.defineProperty(RegExp.prototype, entry[0], {
        get: function get() {
          return this.toString().slice(this.toString().lastIndexOf("/") + 1).indexOf(entry[1]) >= 0;
        }
      });
    }
  });
  if (typeof globalThis.Map !== "function") globalThis.Map = MapPonyfill;
  if (typeof globalThis.Set !== "function") globalThis.Set = SetPonyfill;
  if (typeof globalThis.WeakMap !== "function") globalThis.WeakMap = WeakMapPonyfill;
  if (typeof globalThis.WeakSet !== "function") globalThis.WeakSet = WeakSetPonyfill;
  globalThis.Promise = src_default;
  if (globalThis.__microQuickJS) {
    var orderedMap = new Map([["first", 1], [NaN, 2]]);
    var orderedSet = new Set(["first", NaN]);
    if (orderedMap.size !== 2 || orderedMap.get(NaN) !== 2 || orderedMap.keys().join(",") !== "first,NaN") {
      throw new Error("native Map failed its bootstrap check");
    }
    if (orderedSet.size !== 2 || !orderedSet.has(NaN) || orderedSet.values().join(",") !== "first,NaN") {
      throw new Error("native Set failed its bootstrap check");
    }
    var key = {};
    var value = {};
    var map = new WeakMap();
    var set = new WeakSet();
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
    var deadMap = new WeakMap();
    var _loop = function _loop(cycle) {
      (function addTemporaryKey() {
        deadMap.set({}, cycle);
      })();
      gc();
      if (deadMap.has({})) throw new Error("native WeakMap retained a dead key");
    };
    for (var cycle = 0; cycle < 8; cycle++) {
      _loop(cycle);
    }
  }
})();
function releaseHostReferenceLease(reference) {
  new HostReference(reference);
}
function releaseHostReference(reference) {
  void reference;
}
var devicePixelRatio, innerHeight, innerWidth, pageXOffset, pageYOffset;
var FONT_RESOURCES = {};
var RUNTIME_RESOURCES = {
  files: {}
};
var bridge = print;
var wireStrings = [];
var wireIndexes = Object.create(null);
var pendingStrings = [];
var pendingOperations = [];
var callbacks = [];
var callbackStates = [];
var freeCallbacks = [];
var wireBuffer = new Uint8Array(2 * 1024 * 1024);
function allocateCallback(callback, once) {
  var index = freeCallbacks.length ? freeCallbacks.pop() : callbacks.length;
  if (index >= 4096) throw new RangeError("event callback space exhausted");
  var state = {
    active: true,
    once: Boolean(once)
  };
  callbackStates[index] = state;
  callbacks[index] = function (event) {
    try {
      if (state.active) callback(event);
    } finally {
      if (state.once) releaseCallback(index);
    }
  };
  return index;
}
function releaseCallback(index) {
  if (!callbackStates[index]) return;
  callbackStates[index] = undefined;
  callbacks[index] = undefined;
  freeCallbacks.push(index);
}
function retireOneShotCallback(index) {
  var state = callbackStates[index];
  if (state && state.once) state.active = false;
}
function stringIndex(text) {
  var known = wireIndexes[text];
  if (known !== undefined) return known;
  var index = wireStrings.length;
  wireStrings.push(text);
  wireIndexes[text] = index;
  pendingStrings.push(text);
  return index;
}
function encode(value) {
  if (value instanceof GuestObject) return ["r", value.reference];
  if (typeof value === "string") return ["s", stringIndex(value)];
  return value;
}
function Writer(bytes) {
  this.bytes = bytes;
  this.at = 4;
}
Writer.prototype.byte = function (value) {
  if (this.at >= this.bytes.length) throw new RangeError("wire message too large");
  this.bytes[this.at++] = value;
};
Writer.prototype.uint = function (value) {
  do {
    var next = value % 128;
    value = Math.floor(value / 128);
    this.byte(next | (value ? 128 : 0));
  } while (value);
};
Writer.prototype.text = function (text) {
  var length = 0;
  for (var index = 0; index < text.length; index++) {
    var code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      code = 0x10000 + (code - 0xd800 << 10) + (text.charCodeAt(++index) - 0xdc00);
    }
    length += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  this.uint(length);
  for (var cursor = 0; cursor < text.length; cursor++) {
    var scalar = text.charCodeAt(cursor);
    if (scalar >= 0xd800 && scalar <= 0xdbff && cursor + 1 < text.length) {
      scalar = 0x10000 + (scalar - 0xd800 << 10) + (text.charCodeAt(++cursor) - 0xdc00);
    }
    if (scalar < 0x80) this.byte(scalar);else if (scalar < 0x800) {
      this.byte(0xc0 | scalar >> 6);
      this.byte(0x80 | scalar & 63);
    } else if (scalar < 0x10000) {
      this.byte(0xe0 | scalar >> 12);
      this.byte(0x80 | scalar >> 6 & 63);
      this.byte(0x80 | scalar & 63);
    } else {
      this.byte(0xf0 | scalar >> 18);
      this.byte(0x80 | scalar >> 12 & 63);
      this.byte(0x80 | scalar >> 6 & 63);
      this.byte(0x80 | scalar & 63);
    }
  }
};
function writeValue(writer, value) {
  if (value === null) return writer.byte(0);
  if (value === false) return writer.byte(1);
  if (value === true) return writer.byte(2);
  if (typeof value === "number") {
    if (value % 1 !== 0 || !isFinite(value)) {
      throw new TypeError("wire number must be an integer");
    }
    if (value >= 0) {
      writer.byte(3);
      return writer.uint(value);
    }
    writer.byte(8);
    return writer.uint(-value * 2 - 1);
  }
  if (value[0] === "r") {
    writer.byte(4);
    return writer.uint(value[1]);
  }
  if (value[0] === "s") {
    writer.byte(5);
    return writer.uint(value[1]);
  }
  if (value instanceof Uint8Array) {
    writer.byte(6);
    writer.uint(value.length);
    for (var index = 0; index < value.length; index++) writer.byte(value[index]);
    return;
  }
  throw new TypeError("unsupported wire value");
}
function Reader(bytes, length) {
  this.bytes = bytes;
  this.at = 4;
  this.length = length;
}
Reader.prototype.byte = function () {
  if (this.at >= this.length) throw new RangeError("truncated wire message");
  return this.bytes[this.at++];
};
Reader.prototype.uint = function () {
  var value = 0,
    scale = 1,
    byte;
  do {
    byte = this.byte();
    value += (byte & 127) * scale;
    scale *= 128;
  } while (byte & 128);
  return value;
};
Reader.prototype.text = function () {
  var length = this.uint(),
    end = this.at + length,
    text = "";
  if (end > this.length) throw new RangeError("truncated wire text");
  while (this.at < end) {
    var first = this.byte(),
      scalar;
    if (first < 0x80) scalar = first;else if (first < 0xe0) scalar = (first & 31) << 6 | this.byte() & 63;else if (first < 0xf0) {
      scalar = (first & 15) << 12 | (this.byte() & 63) << 6 | this.byte() & 63;
    } else {
      scalar = (first & 7) << 18 | (this.byte() & 63) << 12 | (this.byte() & 63) << 6 | this.byte() & 63;
    }
    if (scalar < 0x10000) text += String.fromCharCode(scalar);else {
      scalar -= 0x10000;
      text += String.fromCharCode(0xd800 | scalar >> 10, 0xdc00 | scalar & 1023);
    }
  }
  return text;
};
function readValue(reader) {
  var tag = reader.byte();
  if (tag === 0) return null;
  if (tag === 1) return false;
  if (tag === 2) return true;
  if (tag === 3) return reader.uint();
  if (tag === 4) return ["r", reader.uint()];
  if (tag === 5) return ["s", reader.uint()];
  if (tag === 6) {
    var length = reader.uint(),
      bytes = new Uint8Array(length);
    for (var index = 0; index < length; index++) bytes[index] = reader.byte();
    return bytes;
  }
  if (tag === 7) return reader.text();
  if (tag === 8) return -(reader.uint() + 1) / 2;
  throw new TypeError("unknown wire value");
}
function exchange(operations) {
  var writer = new Writer(wireBuffer);
  writer.uint(pendingStrings.length);
  pendingStrings.forEach(function (text) {
    writer.text(text);
  });
  writer.uint(operations.length);
  operations.forEach(function (operation) {
    writer.byte(operation[0]);
    if (operation[0] === 0) return;
    writer.uint(operation[1]);
    writer.uint(operation[2]);
    if (operation[0] === 2) writeValue(writer, operation[3]);
    if (operation[0] === 3) {
      writer.uint(operation[3].length);
      for (var argument = 0; argument < operation[3].length; argument++) {
        writeValue(writer, operation[3][argument]);
      }
    }
    if (operation[0] === 4) {
      writer.uint(operation[3]);
      writer.byte(operation[4] === true ? 1 : 0);
    }
    if (operation[0] === 5) writer.uint(operation[3]);
  });
  wireBuffer[0] = writer.at - 4;
  wireBuffer[1] = writer.at - 4 >> 8;
  wireBuffer[2] = writer.at - 4 >> 16;
  wireBuffer[3] = writer.at - 4 >> 24;
  pendingStrings = [];
  var length = bridge(wireBuffer, writer.at);
  var reader = new Reader(wireBuffer, length);
  var count = reader.uint(),
    result = [];
  while (result.length < count) result.push(readValue(reader));
  return result;
}
function flush() {
  if (!pendingOperations.length) return;
  var operations = pendingOperations;
  pendingOperations = [];
  exchange(operations).forEach(function (result) {
    if (result && result[0] === "r") releaseHostReferenceLease(result[1]);
  });
}
function immediate(operation) {
  flush();
  return exchange([operation])[0];
}
function GuestObject(reference) {
  this.reference = reference;
  this._hostReference = new HostReference(reference);
}
function GuestStyle(reference) {
  GuestObject.call(this, reference);
}
GuestStyle.prototype = Object.create(GuestObject.prototype);
["display", "flexBasis", "height", "inset", "left", "marginTop", "minHeight", "objectFit", "position", "top", "width", "zIndex"].forEach(function (name) {
  Object.defineProperty(GuestStyle.prototype, name, {
    set: function set(value) {
      var property = name.replace(/[A-Z]/g, function (letter) {
        return "-" + letter.toLowerCase();
      });
      if (value === "") {
        immediate([3, this.reference, stringIndex("removeProperty"), [encode(property)]]);
        return;
      }
      immediate([3, this.reference, stringIndex("applyDeclarations"), [encode(encodeCss(".wwc-inline { " + property + ": " + value + "; }"))]]);
    }
  });
});
function GuestElement(reference) {
  GuestObject.call(this, reference);
  this._style = null;
}
GuestElement.prototype = Object.create(GuestObject.prototype);
["className", "hidden", "src", "textContent", "title", "value"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    configurable: true,
    get: name === "value" ? function () {
      return immediate([1, this.reference, stringIndex(name)]);
    } : undefined,
    set: function set(value) {
      if (name === "textContent" && globalThis.__wwcSetElementTextContent && globalThis.__wwcSetElementTextContent(this, String(value))) return;
      var projected = name === "className" && globalThis.__wwcProjectClassName ? globalThis.__wwcProjectClassName(String(value)) : value;
      pendingOperations.push([2, this.reference, stringIndex(name), encode(projected)]);
    }
  });
});
Object.defineProperty(GuestElement.prototype, "style", {
  get: function get() {
    if (!this._style) {
      var result = immediate([1, this.reference, stringIndex("style")]);
      this._style = new GuestStyle(result[1]);
    }
    return this._style;
  }
});
["selectionEnd", "selectionStart"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    }
  });
});
GuestElement.prototype.append = function () {
  var args = [];
  for (var index = 0; index < arguments.length; index++) args.push(encode(arguments[index]));
  pendingOperations.push([3, this.reference, stringIndex("append"), args]);
};
GuestElement.prototype.replaceChildren = function () {
  var args = [];
  for (var index = 0; index < arguments.length; index++) args.push(encode(arguments[index]));
  pendingOperations.push([3, this.reference, stringIndex("replaceChildren"), args]);
};
GuestElement.prototype.setAttribute = function (name, value) {
  pendingOperations.push([3, this.reference, stringIndex("setAttribute"), [encode(name), encode(value)]]);
};
GuestElement.prototype.scrollIntoView = function () {
  immediate([3, this.reference, stringIndex("scrollIntoView"), []]);
};
GuestElement.prototype.focus = function () {
  immediate([3, this.reference, stringIndex("focus"), []]);
};
GuestElement.prototype.select = function () {
  immediate([3, this.reference, stringIndex("select"), []]);
};
GuestElement.prototype.remove = function () {
  pendingOperations.push([3, this.reference, stringIndex("remove"), []]);
};
GuestElement.prototype.addEventListener = function (type, callback) {
  var index = allocateCallback(callback, false);
  pendingOperations.push([4, this.reference, stringIndex(type), index]);
};
function GuestEvent(reference) {
  GuestObject.call(this, reference);
}
GuestEvent.prototype = Object.create(GuestObject.prototype);
GuestEvent.prototype.preventDefault = function () {
  immediate([3, this.reference, stringIndex("preventDefault"), []]);
};
GuestEvent.prototype.stopPropagation = function () {
  immediate([3, this.reference, stringIndex("stopPropagation"), []]);
};
GuestEvent.prototype.stopImmediatePropagation = function () {
  immediate([3, this.reference, stringIndex("stopImmediatePropagation"), []]);
};
["altKey", "button", "buttons", "charCode", "clientX", "clientY", "code", "ctrlKey", "data", "defaultPrevented", "detail", "inputType", "isComposing", "key", "keyCode", "metaKey", "repeat", "shiftKey", "type"].forEach(function (name) {
  Object.defineProperty(GuestEvent.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    }
  });
});
Object.defineProperty(GuestEvent.prototype, "target", {
  get: function get() {
    var result = immediate([1, this.reference, stringIndex("target")]);
    if (result === null) return null;
    return globalThis.__wwcNodeForReference ? globalThis.__wwcNodeForReference(result[1]) : new GuestElement(result[1]);
  }
});
function GuestDocument(reference) {
  GuestObject.call(this, reference);
  this._head = null;
  this._body = null;
}
GuestDocument.prototype = Object.create(GuestObject.prototype);
GuestDocument.prototype.createElement = function (tag) {
  var result = immediate([3, this.reference, stringIndex("createElement"), [encode(tag)]]);
  return new GuestElement(result[1]);
};
GuestDocument.prototype.createElementNS = function (namespace, tag) {
  var result = immediate([3, this.reference, stringIndex("createElementNS"), [encode(namespace), encode(tag)]]);
  return new GuestElement(result[1]);
};
GuestDocument.prototype.createComment = function (text) {
  var result = immediate([3, this.reference, stringIndex("createComment"), [encode(text)]]);
  return new GuestElement(result[1]);
};
GuestDocument.prototype.getElementById = function (id) {
  var result = immediate([3, this.reference, stringIndex("getElementById"), [encode(id)]]);
  return result[0] === null ? null : new GuestElement(result[1]);
};
GuestDocument.prototype.addEventListener = function (type, callback) {
  var index = allocateCallback(callback, false);
  pendingOperations.push([4, this.reference, stringIndex(type), index]);
};
function decodeBase64(source) {
  var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var length = source.length - (source.slice(-2) === "==" ? 2 : source.slice(-1) === "=" ? 1 : 0);
  var bytes = new Uint8Array(Math.floor(length * 6 / 8));
  var bits = 0,
    bitCount = 0,
    offset = 0;
  for (var index = 0; index < source.length && source[index] !== "="; index++) {
    var value = alphabet.indexOf(source[index]);
    if (value < 0) throw new TypeError("invalid embedded base64");
    bits = bits * 64 + value;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes[offset++] = bits >> bitCount & 255;
      bits &= (1 << bitCount) - 1;
    }
  }
  return bytes;
}
function setInterval(callback, delay) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var index = allocateCallback(callback, false);
  pendingOperations.push([3, document.reference, stringIndex("timer"), [encode(delay), encode(index)]]);
  return index;
}
function setTimeout(callback, delay) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var index = allocateCallback(callback, true);
  pendingOperations.push([3, document.reference, stringIndex("timerOnce"), [encode(delay), encode(index)]]);
  return index;
}
function GuestStorage(kind) {
  this.kind = kind;
}
GuestStorage.prototype.getItem = function (name) {
  return immediate([3, document.reference, stringIndex("storageGet"), [encode(this.kind), encode(String(name))]]);
};
GuestStorage.prototype.setItem = function (name, value) {
  immediate([3, document.reference, stringIndex("storageSet"), [encode(this.kind), encode(String(name)), encode(String(value))]]);
};
GuestStorage.prototype.removeItem = function (name) {
  immediate([3, document.reference, stringIndex("storageDelete"), [encode(this.kind), encode(String(name))]]);
};
GuestStorage.prototype.listen = function (name, callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var index = allocateCallback(callback, false);
  immediate([3, document.reference, stringIndex("storageListen"), [encode(this.kind), encode(String(name)), encode(index)]]);
};
function resolved(value) {
  return {
    then: function then(callback) {
      var next = callback(value);
      return next && typeof next.then === "function" ? next : resolved(next);
    }
  };
}
function fetch(url) {
  var source = RUNTIME_RESOURCES.files[url] || (url.slice(0, 2) === "./" ? RUNTIME_RESOURCES.files[url.slice(2)] : undefined);
  if (source === undefined && typeof globalThis.__wwcFetchMissing === "function") {
    return globalThis.__wwcFetchMissing(String(url));
  }
  return resolved({
    ok: source !== undefined,
    status: source === undefined ? 404 : 200,
    text: function text() {
      if (source !== undefined && typeof source !== "string") {
        throw new TypeError("resource is not text");
      }
      return resolved(source === undefined ? "" : source);
    },
    arrayBuffer: function arrayBuffer() {
      if (!(source instanceof Uint8Array)) throw new TypeError("resource is not bytes");
      return resolved(source);
    }
  });
}
function cssSpace(source, at) {
  while (at < source.length && /\s/.test(source[at])) at++;
  return at;
}
function cssTrivia(source, at) {
  var comments = [];
  while (at < source.length) {
    if (/\s/.test(source[at])) {
      at = cssSpace(source, at);
      continue;
    }
    if (source.slice(at, at + 2) !== "/*") break;
    var end = source.indexOf("*/", at + 2);
    if (end < 0) throw new SyntaxError("CSS comment is incomplete at " + at);
    comments.push(source.slice(at + 2, end));
    at = end + 2;
  }
  return {
    at: at,
    comments: comments
  };
}
function cssParts(value) {
  var result = [],
    start = 0,
    depth = 0,
    quote = "";
  for (var index = 0; index <= value.length; index++) {
    var character = value[index] || " ";
    if (quote) {
      if (character === "\\") index++;else if (character === quote) quote = "";
    } else if (character === "\"" || character === "'") quote = character;else if (character === "(") depth++;else if (character === ")") {
      if (!depth) throw new SyntaxError("CSS function syntax does not balance");
      depth--;
    } else if (/\s/.test(character) && depth === 0) {
      if (index > start) result.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (quote || depth) throw new SyntaxError("CSS value does not balance");
  return result;
}
function cssEdges(property, value) {
  var parts = cssParts(value);
  if (!parts.length || parts.length > 4) throw new SyntaxError(property + " shorthand is not understood");
  var top = parts[0],
    right = parts[1] || top;
  var bottom = parts[2] || top,
    left = parts[3] || right;
  return [[property + "-top", top], [property + "-right", right], [property + "-bottom", bottom], [property + "-left", left]];
}
function cssBorder(value) {
  if (value === "0" || value === "none") {
    return ["top", "right", "bottom", "left"].map(function (side) {
      return ["border-" + side + (value === "0" ? "-width" : "-style"), value];
    });
  }
  var parts = cssParts(value);
  if (parts.length !== 3 || !/^\d/.test(parts[0]) || !/^(?:solid|dashed|dotted|double|none)$/.test(parts[1])) {
    throw new SyntaxError("border shorthand is not understood: " + value);
  }
  var result = [];
  ["top", "right", "bottom", "left"].forEach(function (side) {
    result.push(["border-" + side + "-width", parts[0]]);
    result.push(["border-" + side + "-style", parts[1]]);
    result.push(["border-" + side + "-color", parts[2]]);
  });
  return result;
}
function cssBorderSide(property, value) {
  var side = property.slice("border-".length);
  if (value === "0") return [[property + "-width", "0"]];
  if (value === "none") return [[property + "-style", "none"]];
  var parts = cssParts(value);
  if (parts.length !== 3 || !/^\d/.test(parts[0]) || !/^(?:solid|dashed|dotted|double|none)$/.test(parts[1])) {
    throw new SyntaxError(property + " shorthand is not understood: " + value);
  }
  return [["border-" + side + "-width", parts[0]], ["border-" + side + "-style", parts[1]], ["border-" + side + "-color", parts[2]]];
}
function cssRadius(value) {
  var parts = cssParts(value);
  if (!parts.length || parts.length > 4) throw new SyntaxError("border radius is not understood");
  return [["border-top-left-radius", parts[0]], ["border-top-right-radius", parts[1] || parts[0]], ["border-bottom-right-radius", parts[2] || parts[0]], ["border-bottom-left-radius", parts[3] || parts[1] || parts[0]]];
}
function canonicalCss(property, value) {
  if (property === "-moz-tab-size") return [];
  if (property === "padding" || property === "margin") return cssEdges(property, value);
  if (property === "border") return cssBorder(value);
  if (/^border-(?:top|right|bottom|left)$/.test(property)) {
    return cssBorderSide(property, value);
  }
  if (property === "border-radius") return cssRadius(value);
  if (property === "gap") return [["row-gap", value], ["column-gap", value]];
  if (property === "overflow") {
    var overflow = cssParts(value);
    if (!overflow.length || overflow.length > 2) {
      throw new SyntaxError("overflow shorthand is not understood: " + value);
    }
    return [["overflow-x", overflow[0]], ["overflow-y", overflow[1] || overflow[0]]];
  }
  if (property === "border-color") return ["top", "right", "bottom", "left"].map(function (side) {
    return ["border-" + side + "-color", value];
  });
  if (property === "inset") return cssEdges("", value).map(function (entry) {
    return [entry[0].slice(1), entry[1]];
  });
  return [[property, value]];
}
function cssTokens(value) {
  var tokens = [],
    at = 0;
  while (at < value.length) {
    if (/\s/.test(value[at])) {
      at = cssSpace(value, at);
      if (tokens.length && tokens[tokens.length - 1][0] !== 0) tokens.push([0]);
      continue;
    }
    var rest = value.slice(at),
      match;
    if (value.slice(at, at + 2) === "/*") {
      var commentEnd = value.indexOf("*/", at + 2);
      if (commentEnd < 0) throw new SyntaxError("CSS value comment is incomplete at " + at);
      tokens.push([9, value.slice(at + 2, commentEnd)]);
      at = commentEnd + 2;
    } else if (value[at] === "\"" || value[at] === "'") {
      var quote = value[at++],
        text = "";
      while (at < value.length && value[at] !== quote) {
        if (value[at] === "\\") {
          if (++at >= value.length) throw new SyntaxError("CSS string escape is incomplete");
        }
        text += value[at++];
      }
      if (value[at++] !== quote) throw new SyntaxError("CSS string is incomplete");
      tokens.push([4, text]);
    } else if (match = /^#([0-9a-f]{3,8})\b/i.exec(rest)) {
      tokens.push([3, match[1]]);
      at += match[0].length;
    } else if (match = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[a-z]+|%)?/i.exec(rest)) {
      tokens.push([2, match[0]]);
      at += match[0].length;
    } else if (match = /^(--?[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)/i.exec(rest)) {
      at += match[0].length;
      if (value[at] === "(") {
        tokens.push([7, match[0]]);
        at++;
      } else tokens.push([1, match[0]]);
    } else if (value[at] === ",") {
      tokens.push([5]);
      at++;
    } else if (value[at] === "/") {
      tokens.push([6]);
      at++;
    } else if (value[at] === ")") {
      tokens.push([8]);
      at++;
    } else throw new SyntaxError("CSS value token is not understood at " + at);
  }
  if (tokens.length && tokens[tokens.length - 1][0] === 0) tokens.pop();
  return tokens;
}
function cssValueTree(value) {
  var tokens = cssTokens(value),
    at = 0;
  function grouped(items, separator, code) {
    var groups = [],
      group = [];
    items.forEach(function (item) {
      if (item.separator === separator) {
        groups.push(group);
        group = [];
      } else group.push(item);
    });
    groups.push(group);
    if (groups.length === 1) return null;
    return [10, code, groups.map(valueList)];
  }
  function valueList(items) {
    while (items.length && items[0].separator === " ") items.shift();
    while (items.length && items[items.length - 1].separator === " ") items.pop();
    var result = grouped(items, ",", 1) || grouped(items, "/", 2) || grouped(items, " ", 0);
    if (result) return result;
    if (items.length !== 1 || items[0].separator) {
      throw new SyntaxError("CSS value list is not understood");
    }
    return items[0];
  }
  function read(end) {
    var items = [];
    while (at < tokens.length) {
      var token = tokens[at++];
      if (token[0] === 8) {
        if (!end) throw new SyntaxError("CSS function closes without opening");
        return valueList(items);
      }
      if (token[0] === 7) items.push([7, token[1], read(true)]);else if (token[0] === 0) {
        if (items.length && !items[items.length - 1].separator) items.push({
          separator: " "
        });
      } else if (token[0] === 5) {
        while (items.length && items[items.length - 1].separator === " ") items.pop();
        items.push({
          separator: ","
        });
      } else if (token[0] === 6) {
        while (items.length && items[items.length - 1].separator === " ") items.pop();
        items.push({
          separator: "/"
        });
      } else items.push(token);
    }
    if (end) throw new SyntaxError("CSS function is incomplete");
    return valueList(items);
  }
  return read(false);
}
function parseCss(source) {
  var rules = [],
    at = 0;
  while (at < source.length) {
    var trivia = cssTrivia(source, at);
    at = trivia.at;
    trivia.comments.forEach(function (comment) {
      rules.push({
        comment: comment
      });
    });
    if (at >= source.length) break;
    var brace = source.indexOf("{", at);
    if (brace < 0) throw new SyntaxError("CSS rule is missing an opening brace");
    var selector = source.slice(at, brace).trim();
    if (!selector || selector.indexOf("@") >= 0 || selector.indexOf("}") >= 0) {
      throw new SyntaxError("CSS selector is not understood: " + selector.slice(0, 120));
    }
    at = brace + 1;
    var declarations = [];
    while (true) {
      var declarationTrivia = cssTrivia(source, at);
      at = declarationTrivia.at;
      declarationTrivia.comments.forEach(function (comment) {
        declarations.push({
          comment: comment
        });
      });
      if (source[at] === "}") {
        at++;
        break;
      }
      var propertyMatch = /^(--?[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)\s*:/i.exec(source.slice(at));
      if (!propertyMatch) throw new SyntaxError("CSS declaration is not understood at " + at);
      var property = propertyMatch[1];
      at += propertyMatch[0].length;
      var start = at,
        depth = 0,
        quote = "";
      while (at < source.length) {
        var character = source[at];
        if (quote) {
          if (character === "\\") at++;else if (character === quote) quote = "";
        } else if (character === "\"" || character === "'") quote = character;else if (character === "(") depth++;else if (character === ")") {
          if (!depth) throw new SyntaxError("CSS function closes without opening");
          depth--;
        } else if (!depth && (character === ";" || character === "}")) break;
        at++;
      }
      if (quote || depth || at >= source.length) throw new SyntaxError("CSS declaration is incomplete");
      var value = source.slice(start, at).trim(),
        important = false;
      if (/\s*!important$/i.test(value)) {
        important = true;
        value = value.replace(/\s*!important$/i, "").trim();
      }
      if (!value) throw new SyntaxError("CSS declaration value is empty");
      try {
        canonicalCss(property, value).forEach(function (entry) {
          var structured = entry[0] === "background" || entry[0] === "background-image";
          declarations.push({
            property: entry[0],
            tokens: structured ? null : cssTokens(entry[1]),
            value: structured ? cssValueTree(entry[1]) : null,
            important: important
          });
        });
      } catch (_error) {
        throw new SyntaxError(property + ": " + value + ": " + _error.message);
      }
      if (source[at] === ";") at++;else {
        at++;
        break;
      }
    }
    rules.push({
      selector: selector,
      declarations: declarations
    });
  }
  if (cssSpace(source, at) !== source.length) throw new SyntaxError("CSS input was not consumed");
  return rules;
}
function encodeCss(source, includeFonts) {
  var phase = "parse";
  try {
    var rules = parseCss(source);
    phase = "encode";
    var writer = new Writer(new Uint8Array(128 * 1024));
    writer.uint(4);
    var fonts = [],
      fontName;
    if (includeFonts) {
      for (fontName in FONT_RESOURCES) fonts.push(FONT_RESOURCES[fontName]);
    }
    writer.uint(fonts.length + rules.length);
    fonts.forEach(function (font) {
      writer.byte(2);
      writer.text(font.family);
      writer.text(font.style);
      writer.text(font.weight);
      writer.text(font.display);
      var bytes = decodeBase64(font.data);
      writer.uint(bytes.length);
      for (var byte = 0; byte < bytes.length; byte++) writer.byte(bytes[byte]);
    });
    rules.forEach(function (rule) {
      if (rule.comment !== undefined) {
        writer.byte(0);
        writer.text(rule.comment);
        return;
      }
      writer.byte(1);
      writer.text(rule.selector);
      writer.uint(rule.declarations.length);
      rule.declarations.forEach(function (declaration) {
        if (declaration.comment !== undefined) {
          writer.byte(0);
          writer.text(declaration.comment);
          return;
        }
        writer.byte(declaration.value ? 2 : 1);
        writer.text(declaration.property);
        writer.byte(declaration.important ? 1 : 0);
        if (declaration.value) {
          (function writeValue(node) {
            writer.byte(node[0]);
            if (node[0] >= 1 && node[0] <= 4 || node[0] === 9) writer.text(node[1]);else if (node[0] === 7) {
              writer.text(node[1]);
              writeValue(node[2]);
            } else if (node[0] === 10) {
              writer.byte(node[1]);
              writer.uint(node[2].length);
              node[2].forEach(writeValue);
            } else throw new TypeError("CSS value node is not understood");
          })(declaration.value);
          return;
        }
        writer.uint(declaration.tokens.length);
        declaration.tokens.forEach(function (token) {
          writer.byte(token[0]);
          if (token.length > 1) writer.text(token[1]);
        });
      });
    });
    var result = new Uint8Array(writer.at - 4);
    for (var index = 4; index < writer.at; index++) result[index - 4] = writer.bytes[index];
    return result;
  } catch (_error2) {
    throw new SyntaxError("CSS " + phase + " failed: " + String(_error2));
  }
}
GuestDocument.prototype.installStylesheet = function (source) {
  immediate([3, this.reference, stringIndex("installStylesheet"), [encode(encodeCss(source, true))]]);
};
function encodeSvg(root) {
  var writer = new Writer(new Uint8Array(128 * 1024));
  writer.uint(1);
  function node(value) {
    writer.text(value[0]);
    var attributes = value[1],
      names = [];
    for (var name in attributes) names.push(name);
    writer.uint(names.length);
    names.forEach(function (name) {
      writer.text(name);
      writer.text(attributes[name]);
    });
    writer.uint(value[2].length);
    value[2].forEach(node);
  }
  node(root);
  var result = new Uint8Array(writer.at - 4);
  for (var index = 4; index < writer.at; index++) result[index - 4] = writer.bytes[index];
  return result;
}
GuestDocument.prototype.renderSvg = function (root) {
  return immediate([3, this.reference, stringIndex("renderSvg"), [encode(encodeSvg(root))]]);
};
Object.defineProperty(GuestDocument.prototype, "head", {
  get: function get() {
    if (!this._head) {
      var result = immediate([1, this.reference, stringIndex("head")]);
      this._head = new GuestElement(result[1]);
    }
    return this._head;
  }
});
Object.defineProperty(GuestDocument.prototype, "body", {
  get: function get() {
    if (!this._body) {
      var result = immediate([1, this.reference, stringIndex("body")]);
      this._body = new GuestElement(result[1]);
    }
    return this._body;
  }
});
Object.defineProperty(GuestDocument.prototype, "hidden", {
  get: function get() {
    return immediate([1, this.reference, stringIndex("hidden")]);
  }
});
var documentReference = immediate([0, null, null]);
var document = new GuestDocument(documentReference[1]);
globalThis.__wwcReportError = function () {};
var navigator = {};
Object.defineProperty(navigator, "platform", {
  get: function get() {
    return immediate([1, document.reference, stringIndex("platform")]);
  }
});
var localStorage = new GuestStorage("local");
var sessionStorage = new GuestStorage("session");
var routeCallbacks = [];
var location = {};
Object.defineProperty(location, "pathname", {
  get: function get() {
    return immediate([3, document.reference, stringIndex("routeGet"), []]);
  }
});
function addEventListener(type, callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  if (type === "blur" || type === "focus") {
    var eventIndex = allocateCallback(callback, false);
    immediate([3, document.reference, stringIndex("windowListen"), [encode(type), encode(eventIndex)]]);
    return;
  }
  if (type !== "hashchange") throw new TypeError("global event is not available");
  routeCallbacks.push(callback);
  if (routeCallbacks.length === 1) {
    var index = allocateCallback(function () {
      routeCallbacks.slice().forEach(function (listener) {
        listener({
          type: "hashchange"
        });
      });
    }, false);
    immediate([3, document.reference, stringIndex("routeListen"), [encode(index)]]);
  }
}
function dispatch(message) {
  var callbackIndex = Math.floor(message / 1048576);
  var eventReference = message % 1048576 - 1;
  var callback = callbacks[callbackIndex];
  if (callback) callback(eventReference < 0 ? undefined : new GuestEvent(eventReference));
  flush();
}
globalThis.document = document;
globalThis.window = globalThis.self = globalThis;
globalThis.__wwcPostMessage = function (message) {
  pendingOperations.push([3, document.reference, stringIndex("postMessage"), [encode(String(message))]]);
};
globalThis.__wwcReportError = function (message) {
  globalThis.__wwcPostMessage("__wwcError:" + String(message));
};
document.defaultView = globalThis;
function HostWindow() {}
Object.defineProperty(HostWindow, Symbol.hasInstance, {
  value: function value(candidate) {
    return candidate === globalThis;
  }
});
globalThis.Window = HostWindow;
globalThis.Node = GuestObject;
globalThis.Element = globalThis.HTMLElement = GuestElement;
globalThis.Document = GuestDocument;
Object.defineProperty(GuestDocument.prototype, "documentElement", {
  get: function get() {
    if (!this._documentElement) {
      var result = immediate([1, this.reference, stringIndex("documentElement")]);
      this._documentElement = nodeForReference(result[1]);
    }
    return this._documentElement;
  }
});
globalThis.navigator = {
  userAgent: "QuickJS",
  platform: "Linux",
  vendor: "",
  maxTouchPoints: 0
};
["devicePixelRatio", "innerHeight", "innerWidth", "pageXOffset", "pageYOffset"].forEach(function (name) {
  if (globalThis.__microQuickJS) {
    globalThis[name] = immediate([1, document.reference, stringIndex(name)]);
  } else {
    Object.defineProperty(globalThis, name, {
      get: function get() {
        return immediate([1, document.reference, stringIndex(name)]);
      }
    });
  }
});
globalThis.visualViewport = null;
globalThis.scrollBy = function (x, y) {
  hostCall(document.reference, "scrollBy", [Math.round(x), Math.round(y)]);
};
var runtimePerformanceNow = typeof hostNow === "function" ? hostNow : globalThis.__microQuickJS && globalThis.performance && globalThis.performance.now;
var runtimePerformanceOrigin = runtimePerformanceNow ? runtimePerformanceNow() : 0;
var runtimeEpochOrigin = hostCall(document.reference, "dateNow", []);
Date.now = function () {
  return runtimePerformanceNow ? runtimeEpochOrigin + runtimePerformanceNow() - runtimePerformanceOrigin : hostCall(document.reference, "dateNow", []);
};
globalThis.performance = {
  now: runtimePerformanceNow || function () {
    return hostCall(document.reference, "performanceNow", []);
  }
};
var projectedClasses = Object.create(null),
  projectedClassCount = 0;
function projectClassToken(token) {
  if (/^[a-z_][a-z0-9_-]*$/i.test(token)) return token;
  return projectedClasses[token] || (projectedClasses[token] = "wwc-c" + ++projectedClassCount);
}
function projectClassName(value) {
  return String(value).split(/\s+/).filter(Boolean).map(projectClassToken).join(" ");
}
globalThis.__wwcProjectClassName = projectClassName;
var guestNodes = Object.create(null);
function rememberNode(node) {
  guestNodes[node.reference] = new WeakRef(node);
  return node;
}
function nodeForReference(reference) {
  var entry = guestNodes[reference];
  var known = entry && entry.deref();
  if (known) {
    releaseHostReferenceLease(reference);
    return known;
  }
  if (entry) delete guestNodes[reference];
  var nodeType = immediate([1, reference, stringIndex("nodeType")]);
  var node = rememberNode(nodeType === 1 ? new GuestElement(reference) : new GuestObject(reference));
  node._nodeType = nodeType;
  var parentResult = immediate([1, reference, stringIndex("parentNode")]);
  if (parentResult !== null) {
    var parent = nodeForReference(parentResult[1]);
    var children = childrenOf(parent);
    if (children.indexOf(node) < 0) children.push(node);
    setParent(node, parent);
  }
  return node;
}
globalThis.__wwcNodeForReference = nodeForReference;
rememberNode(document.head);
rememberNode(document.body);
Object.defineProperty(GuestObject.prototype, "nodeType", {
  get: function get() {
    if (this._nodeType === undefined) {
      this._nodeType = immediate([1, this.reference, stringIndex("nodeType")]);
    }
    return this._nodeType;
  }
});
Object.defineProperty(GuestObject.prototype, "nodeName", {
  get: function get() {
    if (this._nodeName === undefined) {
      this._nodeName = immediate([1, this.reference, stringIndex("nodeName")]);
    }
    return this._nodeName;
  }
});
GuestObject.prototype.contains = function (node) {
  return immediate([3, this.reference, stringIndex("contains"), [encode(node)]]);
};
GuestObject.prototype.closest = function (selector) {
  var result = immediate([3, this.reference, stringIndex("closest"), [encode(String(selector))]]);
  return result === null ? null : nodeForReference(result[1]);
};
Object.defineProperty(GuestObject.prototype, "nodeValue", {
  get: function get() {
    if (this._nodeValue === undefined) {
      this._nodeValue = immediate([1, this.reference, stringIndex("nodeValue")]);
    }
    return this._nodeValue;
  },
  set: function set(value) {
    this._nodeValue = String(value);
    pendingOperations.push([2, this.reference, stringIndex("nodeValue"), encode(this._nodeValue)]);
  }
});
Object.defineProperty(GuestObject.prototype, "textContent", {
  get: function get() {
    if (this._nodeType === 3 && this._nodeValue !== undefined) return this._nodeValue;
    return immediate([1, this.reference, stringIndex("textContent")]);
  },
  set: function set(value) {
    value = String(value);
    if (this._nodeType === 3) this._nodeValue = value;
    pendingOperations.push([2, this.reference, stringIndex("textContent"), encode(value)]);
  }
});
function childrenOf(node) {
  return node._guestChildren || (node._guestChildren = []);
}
function parentOf(node) {
  return node._guestParent || null;
}
function setParent(node, parent) {
  node._guestParent = parent || null;
}
function detachGuestNode(node) {
  var parent = parentOf(node);
  if (parent) {
    var siblings = childrenOf(parent);
    var index = siblings.indexOf(node);
    if (index > -1) siblings.splice(index, 1);
  }
  setParent(node, null);
}
var guestCollectionPending = false,
  guestCleanupPressure = 0;
function requestCleanupOpportunity(callback) {
  var index = allocateCallback(callback, true);
  hostCall(document.reference, "cleanupOpportunity", [1000, index]);
}
globalThis.reconcileGuestConnectivity = function () {
  var bytes = hostCall(document.reference, "detachedRoots", []),
    detached = 0;
  var _subtreeSize = function subtreeSize(node) {
    var size = 1,
      children = childrenOf(node);
    for (var index = 0; index < children.length; index++) size += _subtreeSize(children[index]);
    return size;
  };
  for (var at = 0; at + 3 < bytes.length; at += 4) {
    var reference = bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16 | bytes[at + 3] << 24;
    var entry = guestNodes[reference],
      node = entry && entry.deref();
    if (!node || !parentOf(node)) continue;
    var root = node,
      guard = 0;
    while (parentOf(root) && guard++ < 4096) root = parentOf(root);
    if (root === document.head || root === document.body || root === document.documentElement) {
      detached += _subtreeSize(node);
      detachGuestNode(node);
    }
  }
  guestCleanupPressure += detached;
  if (guestCleanupPressure >= 128) {
    guestCleanupPressure = 0;
    gc();
  } else if (detached && !guestCollectionPending) {
    guestCollectionPending = true;
    requestCleanupOpportunity(function () {
      guestCollectionPending = false;
      guestCleanupPressure = 0;
      gc();
    });
  }
  return detached;
};
globalThis.__wwcSetElementTextContent = function (element, value) {
  element.replaceChildren(value);
  return true;
};
Object.defineProperties(GuestObject.prototype, {
  childNodes: {
    get: function get() {
      return childrenOf(this);
    }
  },
  parentNode: {
    get: function get() {
      return parentOf(this);
    }
  },
  parentElement: {
    get: function get() {
      var parent = parentOf(this);
      return parent instanceof GuestElement ? parent : null;
    }
  },
  firstChild: {
    get: function get() {
      return childrenOf(this)[0] || null;
    }
  },
  lastChild: {
    get: function get() {
      var children = childrenOf(this);
      return children.length ? children[children.length - 1] : null;
    }
  },
  nextSibling: {
    get: function get() {
      var parent = parentOf(this);
      if (!parent) return null;
      var siblings = childrenOf(parent);
      return siblings[siblings.indexOf(this) + 1] || null;
    }
  },
  previousSibling: {
    get: function get() {
      var parent = parentOf(this);
      if (!parent) return null;
      var siblings = childrenOf(parent);
      return siblings[siblings.indexOf(this) - 1] || null;
    }
  }
});
Object.defineProperty(GuestElement.prototype, "children", {
  get: function get() {
    return childrenOf(this).filter(function (node) {
      return node instanceof GuestElement;
    });
  }
});
Object.defineProperty(GuestElement.prototype, "contentEditable", {
  get: function get() {
    return this.getAttribute("contenteditable") || "inherit";
  },
  set: function set(value) {
    this.setAttribute("contenteditable", String(value));
  }
});
Object.defineProperty(GuestElement.prototype, "className", {
  get: function get() {
    return this.getAttribute("class") || "";
  },
  set: function set(value) {
    this.setAttribute("class", String(value));
  }
});
Object.defineProperty(GuestElement.prototype, "innerHTML", {
  set: function set(value) {
    pendingOperations.push([2, this.reference, stringIndex("innerHTML"), encode(String(value))]);
  }
});
function GuestSelection(reference) {
  GuestObject.call(this, reference);
}
GuestSelection.prototype = Object.create(GuestObject.prototype);
["anchorOffset", "focusOffset", "isCollapsed", "rangeCount"].forEach(function (name) {
  Object.defineProperty(GuestSelection.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    }
  });
});
["collapse", "extend"].forEach(function (name) {
  GuestSelection.prototype[name] = function (node, offset) {
    hostCall(this.reference, name, [node, offset]);
  };
});
GuestSelection.prototype.removeAllRanges = function () {
  hostCall(this.reference, "removeAllRanges", []);
};
GuestSelection.prototype.addRange = function (range) {
  hostCall(this.reference, "addRange", [range]);
};
GuestSelection.prototype.getRangeAt = function (index) {
  var result = hostCall(this.reference, "getRangeAt", [index]);
  return new GuestRange(result[1]);
};
function GuestRange(reference) {
  GuestObject.call(this, reference);
}
GuestRange.prototype = Object.create(GuestObject.prototype);
var rectProperties = ["bottom", "height", "left", "right", "top", "width", "x", "y"];
function measuredRects(object, method) {
  var bytes = hostCall(document.reference, method, [object]);
  var count = bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;
  var rects = [];
  for (var index = 0; index < count; index++) {
    var rect = {};
    for (var property = 0; property < rectProperties.length; property++) {
      var at = 4 + index * 32 + property * 4;
      rect[rectProperties[property]] = (bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16 | bytes[at + 3] << 24) / 64;
    }
    rects.push(rect);
  }
  return rects;
}
GuestElement.prototype.getBoundingClientRect = function () {
  return measuredRects(this, "measureRect")[0];
};
function clientRectsFor(object) {
  return measuredRects(object, "measureClientRects");
}
GuestElement.prototype.getClientRects = function () {
  return clientRectsFor(this);
};
function GuestCanvasContext(reference) {
  GuestObject.call(this, reference);
}
GuestCanvasContext.prototype = Object.create(GuestObject.prototype);
GuestElement.prototype.getContext = function (type) {
  var result = immediate([3, this.reference, stringIndex("getContext"), [encode(type)]]);
  return result === null ? null : new GuestCanvasContext(result[1]);
};
["height", "width"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    }
  });
});
["fillStyle", "strokeStyle"].forEach(function (name) {
  Object.defineProperty(GuestCanvasContext.prototype, name, {
    set: function set(value) {
      pendingOperations.push([2, this.reference, stringIndex(name), encode(value)]);
    }
  });
});
Object.defineProperty(GuestCanvasContext.prototype, "lineWidth", {
  set: function set(value) {
    pendingOperations.push([2, this.reference, stringIndex("lineWidth"), encode(Math.round(Number(value) * 1024))]);
  }
});
["arc", "beginPath", "clearRect", "closePath", "fill", "fillRect", "lineTo", "moveTo", "restore", "rotate", "save", "scale", "stroke", "strokeRect", "translate"].forEach(function (name) {
  GuestCanvasContext.prototype[name] = function () {
    var args = [];
    for (var index = 0; index < arguments.length; index++) {
      args.push(encode(Math.round(Number(arguments[index]) * 1024)));
    }
    pendingOperations.push([3, this.reference, stringIndex(name), args]);
  };
});
GuestElement.prototype.focus = function () {
  hostCall(this.reference, "focus", []);
};
GuestElement.prototype.select = function () {
  hostCall(this.reference, "select", []);
};
GuestElement.prototype.querySelector = function (selector) {
  var result = immediate([3, this.reference, stringIndex("querySelector"), [encode(String(selector))]]);
  return result === null ? null : nodeForReference(result[1]);
};
GuestElement.prototype.querySelectorAll = function (selector) {
  var bytes = hostCall(this.reference, "querySelectorAllReferences", [String(selector)]);
  var length = bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;
  var nodes = [];
  for (var index = 0; index < length; index++) {
    var at = 4 + index * 4;
    var reference = bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16 | bytes[at + 3] << 24;
    nodes.push(nodeForReference(reference));
  }
  return nodes;
};
GuestDocument.prototype.querySelector = function (selector) {
  return this.body.querySelector(selector);
};
GuestDocument.prototype.querySelectorAll = function (selector) {
  return this.body.querySelectorAll(selector);
};
GuestElement.prototype.hasAttribute = function (name) {
  return hostCall(this.reference, "hasAttribute", [String(name)]);
};
GuestRange.prototype.getClientRects = function () {
  return clientRectsFor(this);
};
GuestRange.prototype.getBoundingClientRect = function () {
  return measuredRects(this, "measureRect")[0];
};
["clientHeight", "clientWidth", "offsetHeight", "offsetWidth", "scrollHeight", "scrollWidth", "scrollLeft", "scrollTop"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    },
    set: name === "scrollLeft" || name === "scrollTop" ? function (value) {
      immediate([2, this.reference, stringIndex(name), encode(Math.round(value))]);
    } : undefined
  });
});
["setStart", "setEnd"].forEach(function (name) {
  GuestRange.prototype[name] = function (node, offset) {
    hostCall(this.reference, name, [node, offset]);
  };
});
GuestRange.prototype.collapse = function (toStart) {
  hostCall(this.reference, "collapse", [Boolean(toStart)]);
};
["anchorNode", "focusNode"].forEach(function (name) {
  Object.defineProperty(GuestSelection.prototype, name, {
    get: function get() {
      var result = immediate([1, this.reference, stringIndex(name)]);
      return result === null ? null : nodeForReference(result[1]);
    }
  });
});
GuestDocument.prototype.getSelection = function () {
  var result = immediate([3, this.reference, stringIndex("getSelection"), []]);
  if (result === null) return null;
  if (!this._selection) this._selection = new GuestSelection(result[1]);
  return this._selection;
};
GuestDocument.prototype.createTextNode = function (text) {
  text = String(text);
  var result = immediate([3, this.reference, stringIndex("createTextNode"), [encode(text)]]);
  var node = rememberNode(new GuestObject(result[1]));
  node._nodeType = 3;
  node._nodeName = "#text";
  node._nodeValue = text;
  return node;
};
GuestDocument.prototype.createRange = function () {
  var result = immediate([3, this.reference, stringIndex("createRange"), []]);
  return new GuestRange(result[1]);
};
GuestDocument.prototype.hasFocus = function () {
  return immediate([3, this.reference, stringIndex("hasFocus"), []]);
};
Object.defineProperty(GuestDocument.prototype, "activeElement", {
  get: function get() {
    var result = immediate([1, this.reference, stringIndex("activeElement")]);
    return result === null ? null : nodeForReference(result[1]);
  }
});
globalThis.getSelection = function () {
  return document.getSelection();
};
function GuestComputedStyle(reference) {
  GuestObject.call(this, reference);
}
GuestComputedStyle.prototype = Object.create(GuestObject.prototype);
["direction", "height", "overflow", "paddingBottom", "paddingTop", "position", "whiteSpace", "width"].forEach(function (name) {
  Object.defineProperty(GuestComputedStyle.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    }
  });
});
globalThis.getComputedStyle = function (element) {
  var result = immediate([3, document.reference, stringIndex("getComputedStyle"), [encode(element)]]);
  return new GuestComputedStyle(result[1]);
};
function GuestStylesheetNode() {
  this.parentNode = null;
  this._text = "";
}
function projectStylesheet(source) {
  var output = "",
    at = 0;
  var pattern = /(?:@(?:-webkit-)?keyframes\s+[-_a-z0-9]+|@media\s+print)\s*\{/ig;
  while (true) {
    pattern.lastIndex = at;
    var match = pattern.exec(source);
    if (!match) {
      output += source.slice(at);
      output = output.replace(/\.([^\d\s.#:\[\]{};>+~(),][^\s.#:\[\]{};>+~(),]*)/g, function (_, token) {
        return "." + projectClassToken(token);
      });
      return omitCssUrls(output);
    }
    output += source.slice(at, match.index);
    var cursor = pattern.lastIndex,
      depth = 1,
      quote = "";
    while (cursor < source.length && depth) {
      var character = source[cursor++];
      if (quote) {
        if (character === "\\") cursor++;else if (character === quote) quote = "";
      } else if (character === '"' || character === "'") quote = character;else if (character === "/" && source[cursor] === "*") {
        var end = source.indexOf("*/", cursor + 1);
        if (end < 0) throw new SyntaxError("CSS at-rule comment is incomplete");
        cursor = end + 2;
      } else if (character === "{") depth++;else if (character === "}") depth--;
    }
    if (depth) throw new SyntaxError("CSS at-rule block is incomplete");
    at = cursor;
  }
}
function omitCssUrls(source) {
  var output = "",
    at = 0,
    pattern = /url\s*\(/ig;
  while (true) {
    pattern.lastIndex = at;
    var match = pattern.exec(source);
    if (!match) return output + source.slice(at);
    output += source.slice(at, match.index) + "none";
    var cursor = pattern.lastIndex,
      depth = 1,
      quote = "";
    while (cursor < source.length && depth) {
      var character = source[cursor++];
      if (quote) {
        if (character === "\\") cursor++;else if (character === quote) quote = "";
      } else if (character === '"' || character === "'") quote = character;else if (character === "(") depth++;else if (character === ")") depth--;
    }
    if (depth) throw new SyntaxError("CSS url() is incomplete");
    at = cursor;
  }
}
Object.defineProperty(GuestStylesheetNode.prototype, "textContent", {
  get: function get() {
    return this._text;
  },
  set: function set(value) {
    this._text = String(value);
    if (this.parentNode) document.installStylesheet(projectStylesheet(this._text));
  }
});
GuestStylesheetNode.prototype.setAttribute = function () {
  throw new TypeError("stylesheet attributes are not available");
};
GuestDocument.prototype.createElement = function (tag) {
  if (String(tag).toLowerCase() === "style") return new GuestStylesheetNode();
  tag = String(tag);
  var result = immediate([3, this.reference, stringIndex("createElement"), [encode(tag)]]);
  var node = rememberNode(new GuestElement(result[1]));
  node._nodeType = 1;
  node._nodeName = tag.toUpperCase();
  return node;
};
GuestDocument.prototype.getElementById = function (id) {
  var result = immediate([3, this.reference, stringIndex("getElementById"), [encode(String(id))]]);
  return result === null ? null : nodeForReference(result[1]);
};
function inlineCssBytes(source) {
  return encodeCss(".wwc-inline { " + source + " }");
}
Object.defineProperty(GuestStyle.prototype, "cssText", {
  get: function get() {
    return immediate([1, this.reference, stringIndex("cssText")]);
  },
  set: function set(value) {
    this._cssText = String(value);
    pendingOperations.push([3, this.reference, stringIndex("replaceDeclarations"), [encode(inlineCssBytes(this._cssText))]]);
  }
});
GuestStyle.prototype.setProperty = function (name, value, priority) {
  var suffix = priority ? " !" + priority : "";
  pendingOperations.push([3, this.reference, stringIndex("applyDeclarations"), [encode(inlineCssBytes(String(name) + ": " + String(value) + suffix + ";"))]]);
};
GuestStyle.prototype.removeProperty = function (name) {
  pendingOperations.push([3, this.reference, stringIndex("removeProperty"), [encode(String(name))]]);
  return "";
};
function hostCall(reference, name, args) {
  return immediate([3, reference, stringIndex(name), (args || []).map(encode)]);
}
function hostGet(reference, name) {
  return immediate([1, reference, stringIndex(name)]);
}
function mutationNode(recordReference, kind, index) {
  var result = hostCall(recordReference, kind, [index]);
  return nodeForReference(result[1]);
}
function synchronizeGuestChildren(target) {
  var bytes = hostCall(target.reference, "childNodeReferences", []);
  var length = bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;
  var next = [];
  for (var index = 0; index < length; index++) {
    var at = 4 + index * 4;
    var reference = bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16 | bytes[at + 3] << 24;
    next.push(nodeForReference(reference));
  }
  var previous = childrenOf(target).slice();
  for (var old = 0; old < previous.length; old++) {
    if (next.indexOf(previous[old]) < 0 && parentOf(previous[old]) === target) {
      setParent(previous[old], null);
    }
  }
  for (var child = 0; child < next.length; child++) {
    if (parentOf(next[child]) && parentOf(next[child]) !== target) {
      detachGuestNode(next[child]);
    }
    setParent(next[child], target);
  }
  target._guestChildren = next;
}
function readMutationBatch(batchReference, batchToken) {
  var length = hostGet(batchReference, "length"),
    records = [],
    changedParents = [];
  for (var index = 0; index < length; index++) {
    var result = hostCall(batchReference, "item", [index]);
    var reference = result[1],
      type = hostGet(reference, "type");
    var targetResult = hostGet(reference, "target");
    var record = {
      type: type,
      target: nodeForReference(targetResult[1])
    };
    if (type === "childList") {
      var added = hostGet(reference, "addedNodeCount");
      var removed = hostGet(reference, "removedNodeCount");
      record.addedNodes = [];
      record.removedNodes = [];
      for (var add = 0; add < added; add++) {
        record.addedNodes.push(mutationNode(reference, "addedNodeAt", add));
      }
      for (var remove = 0; remove < removed; remove++) {
        var removedNode = mutationNode(reference, "removedNodeAt", remove);
        record.removedNodes.push(removedNode);
        detachGuestNode(removedNode);
      }
      var previous = hostGet(reference, "previousSibling");
      var next = hostGet(reference, "nextSibling");
      record.previousSibling = previous === null ? null : nodeForReference(previous[1]);
      record.nextSibling = next === null ? null : nodeForReference(next[1]);
      if (changedParents.indexOf(record.target) < 0) changedParents.push(record.target);
    } else if (type === "characterData") {
      record.oldValue = hostGet(reference, "oldValue");
    } else if (type === "attributes") {
      record.attributeName = hostGet(reference, "attributeName");
      record.oldValue = hostGet(reference, "oldValue");
      var attribute = hostCall(record.target.reference, "getAttribute", [record.attributeName]);
      var values = record.target._attributeValues || (record.target._attributeValues = Object.create(null));
      if (attribute === null) delete values[record.attributeName];else values[record.attributeName] = attribute;
    }
    records.push(record);
    releaseHostReferenceLease(reference);
  }
  changedParents.forEach(synchronizeGuestChildren);
  if (batchToken) releaseHostReference(batchToken);else releaseHostReferenceLease(batchReference);
  return records;
}
function GuestMutationObserver(callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  this.callback = callback;
  this.reference = null;
  this._hostReference = null;
  this.callbackIndex = null;
}
GuestMutationObserver.prototype.observe = function (target, options) {
  this.disconnect();
  var flags = (options.attributes ? 1 : 0) | (options.attributeOldValue ? 2 : 0) | (options.characterData ? 4 : 0) | (options.characterDataOldValue ? 8 : 0) | (options.subtree ? 16 : 0);
  var self = this,
    callbackIndex = allocateCallback(function (batch) {
      self.callback(readMutationBatch(batch.reference, batch._hostReference), self);
    }, false);
  this.callbackIndex = callbackIndex;
  var result = immediate([3, document.reference, stringIndex("mutationObserve"), [encode(target), encode(flags), encode(callbackIndex)]]);
  this.reference = result[1];
  this._hostReference = new HostReference(this.reference);
};
GuestMutationObserver.prototype.disconnect = function () {
  if (this.reference !== null) {
    hostCall(this.reference, "disconnect", []);
    releaseHostReference(this._hostReference);
    this.reference = null;
    this._hostReference = null;
    releaseCallback(this.callbackIndex);
    this.callbackIndex = null;
  }
};
GuestMutationObserver.prototype.takeRecords = function () {
  if (this.reference === null) return [];
  var result = hostCall(this.reference, "takeRecords", []);
  return readMutationBatch(result[1]);
};
function EmptyObserver() {}
EmptyObserver.prototype.observe = EmptyObserver.prototype.unobserve = EmptyObserver.prototype.disconnect = function () {};
EmptyObserver.prototype.takeRecords = function () {
  return [];
};
function GuestIntersectionObserver(callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  this.callback = callback;
  this.active = true;
}
GuestIntersectionObserver.prototype.observe = function (target) {
  var observer = this;
  setTimeout(function () {
    if (observer.active) observer.callback([{
      target: target,
      isIntersecting: true,
      intersectionRatio: 1
    }], observer);
  }, 0);
};
GuestIntersectionObserver.prototype.unobserve = function () {};
GuestIntersectionObserver.prototype.disconnect = function () {
  this.active = false;
};
GuestIntersectionObserver.prototype.takeRecords = function () {
  return [];
};
globalThis.MutationObserver = GuestMutationObserver;
globalThis.ResizeObserver = EmptyObserver;
globalThis.IntersectionObserver = GuestIntersectionObserver;
globalThis.getComputedStyle = function () {
  return {
    direction: "ltr",
    whiteSpace: "pre",
    getPropertyValue: function getPropertyValue() {
      return "";
    }
  };
};
var animationCallbacks = Object.create(null);
globalThis.requestAnimationFrame = function (callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var handle;
  var index = allocateCallback(function () {
    delete animationCallbacks[handle];
    callback(Date.now());
  }, true);
  handle = immediate([3, document.reference, stringIndex("animationFrame"), [encode(index)]]);
  animationCallbacks[handle] = index;
  return handle;
};
globalThis.cancelAnimationFrame = function (handle) {
  var index = animationCallbacks[handle];
  if (index === undefined) return;
  releaseCallback(index);
  delete animationCallbacks[handle];
  immediate([3, document.reference, stringIndex("cancelAnimationFrame"), [encode(handle)]]);
};
globalThis.setImmediate = function (callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var token = {
    active: true,
    index: -1
  };
  var index = allocateCallback(function () {
    token.active = false;
    callback();
  }, true);
  token.index = index;
  immediate([3, document.reference, stringIndex("task"), [encode(index)]]);
  return token;
};
globalThis.setTimeout = function (callback, delay) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var token = {
    active: true,
    index: -1
  };
  var index = allocateCallback(function () {
    token.active = false;
    callback();
  }, true);
  token.index = index;
  hostCall(document.reference, "timerOnce", [Math.round(delay), index]);
  return token;
};
var intervalCallbacks = Object.create(null);
globalThis.setInterval = function (callback, delay) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var index = allocateCallback(callback, false);
  var handle = hostCall(document.reference, "timer", [Math.round(delay), index]);
  intervalCallbacks[handle] = index;
  return handle;
};
globalThis.clearInterval = function (handle) {
  var index = intervalCallbacks[handle];
  if (index === undefined) return;
  releaseCallback(index);
  delete intervalCallbacks[handle];
  hostCall(document.reference, "timerCancel", [handle]);
};
globalThis.matchMedia = function () {
  return {
    matches: false,
    addListener: function addListener() {},
    removeListener: function removeListener() {}
  };
};
globalThis.clearTimeout = function (handle) {
  if (!handle || handle.active !== true || !Number.isInteger(handle.index)) return;
  handle.active = false;
  retireOneShotCallback(handle.index);
};
globalThis.clearImmediate = globalThis.clearTimeout;
globalThis.requestIdleCallback = function (callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var started = Date.now();
  return setTimeout(function () {
    callback({
      didTimeout: false,
      timeRemaining: function timeRemaining() {
        return Math.max(0, 50 - (Date.now() - started));
      }
    });
  }, 0);
};
globalThis.cancelIdleCallback = globalThis.clearTimeout;
function reportConsole() {
  var parts = [];
  for (var index = 0; index < arguments.length; index++) {
    var value = arguments[index];
    parts.push(value && value.stack ? String(value) + "\n" + value.stack : String(value));
  }
  globalThis.__wwcReportError(parts.join("\n"));
}
globalThis.console = {
  log: reportConsole,
  info: reportConsole,
  warn: reportConsole,
  error: reportConsole
};
function GuestDataTransfer(reference) {
  GuestObject.call(this, reference);
}
GuestDataTransfer.prototype = Object.create(GuestObject.prototype);
GuestDataTransfer.prototype.getData = function (type) {
  return immediate([3, this.reference, stringIndex("getData"), [encode(type)]]);
};
GuestDataTransfer.prototype.setData = function (type, value) {
  immediate([3, this.reference, stringIndex("setData"), [encode(type), encode(value)]]);
};
GuestDataTransfer.prototype.clearData = function () {
  immediate([3, this.reference, stringIndex("clearData"), []]);
};
["dropEffect", "effectAllowed"].forEach(function (name) {
  Object.defineProperty(GuestDataTransfer.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    },
    set: function set(value) {
      immediate([2, this.reference, stringIndex(name), encode(value)]);
    }
  });
});
["clipboardData", "dataTransfer"].forEach(function (name) {
  Object.defineProperty(GuestEvent.prototype, name, {
    get: function get() {
      var result = immediate([1, this.reference, stringIndex(name)]);
      return result === null ? null : new GuestDataTransfer(result[1]);
    }
  });
});
Object.defineProperty(GuestEvent.prototype, "relatedTarget", {
  get: function get() {
    var result = immediate([1, this.reference, stringIndex("relatedTarget")]);
    return result === null ? null : nodeForReference(result[1]);
  }
});
var windowListeners = [];
globalThis.addEventListener = function (type, callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var record = {
    type: type,
    callback: callback,
    active: true
  };
  var callbackIndex = allocateCallback(function (event) {
    if (record.active) record.callback(event || {
      type: type
    });
  }, false);
  immediate([3, document.reference, stringIndex("windowListen"), [encode(type), encode(callbackIndex)]]);
  windowListeners.push(record);
};
globalThis.removeEventListener = function (type, callback) {
  for (var i = windowListeners.length - 1; i >= 0; i--) {
    var record = windowListeners[i];
    if (record.active && record.type === type && record.callback === callback) {
      record.active = false;
      windowListeners.splice(i, 1);
      return;
    }
  }
};
function allocateElementCallback(callback) {
  var index = freeCallbacks.length ? freeCallbacks.pop() : callbacks.length;
  if (index >= 4096) throw new RangeError("event callback space exhausted");
  var state = {
    active: true,
    callback: callback
  };
  callbackStates[index] = state;
  callbacks[index] = function (event) {
    var current = state.callback;
    if (state.active && current) current(event);else releaseCallback(index);
  };
  return index;
}
GuestElement.prototype.addEventListener = function (type, callback, options) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var records = this._eventListeners || (this._eventListeners = []);
  if (records.some(function (record) {
    return record.type === type && record.callback === callback;
  })) return;
  var index = allocateElementCallback(callback);
  var capture = options === true || Boolean(options && options.capture);
  records.push({
    type: type,
    callback: callback,
    index: index,
    capture: capture
  });
  pendingOperations.push([4, this.reference, stringIndex(type), index, capture]);
};
GuestElement.prototype.removeEventListener = function (type, callback) {
  var records = this._eventListeners || [];
  for (var index = 0; index < records.length; index++) {
    var record = records[index];
    if (record.type === type && record.callback === callback) {
      records.splice(index, 1);
      releaseCallback(record.index);
      pendingOperations.push([5, this.reference, stringIndex(type), record.index]);
      return;
    }
  }
};
GuestDocument.prototype.addEventListener = GuestElement.prototype.addEventListener;
GuestDocument.prototype.removeEventListener = GuestElement.prototype.removeEventListener;
Object.defineProperty(GuestElement.prototype, "tabIndex", {
  set: function set(value) {
    pendingOperations.push([2, this.reference, stringIndex("tabIndex"), encode(value)]);
  }
});
["value", "checked"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    },
    set: function set(value) {
      immediate([2, this.reference, stringIndex(name), encode(name === "checked" ? Boolean(value) : String(value))]);
    }
  });
});
["change", "click", "keydown", "keyup"].forEach(function (type) {
  Object.defineProperty(GuestElement.prototype, "on" + type, {
    get: function get() {
      return this["_guestOn" + type] || null;
    },
    set: function set(callback) {
      var previous = this["_guestOn" + type];
      if (previous) this.removeEventListener(type, previous);
      this["_guestOn" + type] = typeof callback === "function" ? callback : null;
      if (this["_guestOn" + type]) this.addEventListener(type, this["_guestOn" + type]);
    }
  });
});
Object.defineProperty(GuestElement.prototype, "ownerDocument", {
  get: function get() {
    return document;
  }
});
GuestElement.prototype.appendChild = function (child) {
  detachGuestNode(child);
  childrenOf(this).push(child);
  setParent(child, this);
  pendingOperations.push([3, this.reference, stringIndex("appendChild"), [encode(child)]]);
  return child;
};
GuestElement.prototype.insertBefore = function (child, next) {
  if (child instanceof GuestStylesheetNode) {
    if (this !== document.head) throw new TypeError("stylesheet must enter the logical head");
    child.parentNode = this;
    document.installStylesheet(projectStylesheet(child.textContent));
    return child;
  }
  detachGuestNode(child);
  var children = childrenOf(this);
  var index = next === null ? children.length : children.indexOf(next);
  if (index < 0) throw new TypeError("reference node is not a child");
  children.splice(index, 0, child);
  setParent(child, this);
  pendingOperations.push([3, this.reference, stringIndex("insertBefore"), [encode(child), encode(next)]]);
  return child;
};
GuestElement.prototype.removeChild = function (child) {
  if (parentOf(child) !== this) throw new TypeError("node is not a child");
  detachGuestNode(child);
  pendingOperations.push([3, this.reference, stringIndex("removeChild"), [encode(child)]]);
  return child;
};
GuestObject.prototype.remove = function () {
  detachGuestNode(this);
  pendingOperations.push([3, this.reference, stringIndex("remove"), []]);
};
GuestElement.prototype.append = function () {
  for (var i = 0; i < arguments.length; i++) {
    var child = arguments[i];
    if (!(child instanceof GuestObject)) child = document.createTextNode(String(child));
    this.appendChild(child);
  }
};
GuestElement.prototype.replaceChildren = function () {
  var current = childrenOf(this).slice();
  for (var i = 0; i < current.length; i++) {
    detachGuestNode(current[i]);
  }
  var args = [];
  for (var j = 0; j < arguments.length; j++) {
    var child = arguments[j];
    if (!(child instanceof GuestObject)) child = document.createTextNode(String(child));
    detachGuestNode(child);
    childrenOf(this).push(child);
    setParent(child, this);
    args.push(encode(child));
  }
  pendingOperations.push([3, this.reference, stringIndex("replaceChildren"), args]);
};
Object.defineProperty(GuestElement.prototype, "attributes", {
  get: function get() {
    var values = this._attributeValues || (this._attributeValues = Object.create(null));
    return Object.keys(values).map(function (name) {
      return {
        name: name,
        value: values[name]
      };
    });
  }
});
GuestElement.prototype.getAttribute = function (name) {
  var values = this._attributeValues || (this._attributeValues = Object.create(null));
  return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : null;
};
GuestElement.prototype.setAttribute = function (name, value) {
  var text = String(value);
  if (name === "class") text = projectClassName(text);
  var values = this._attributeValues || (this._attributeValues = Object.create(null));
  values[name] = text;
  pendingOperations.push([3, this.reference, stringIndex("setAttribute"), [encode(String(name)), encode(text)]]);
};
GuestElement.prototype.removeAttribute = function (name) {
  var values = this._attributeValues || (this._attributeValues = Object.create(null));
  delete values[name];
  pendingOperations.push([3, this.reference, stringIndex("removeAttribute"), [encode(String(name))]]);
};
function GuestClassList(element) {
  this.element = element;
}
GuestClassList.prototype.tokens = function () {
  return (this.element.getAttribute("class") || "").split(/\s+/).filter(Boolean);
};
GuestClassList.prototype.contains = function (token) {
  return this.tokens().indexOf(projectClassToken(String(token))) > -1;
};
GuestClassList.prototype.add = function () {
  var tokens = this.tokens();
  for (var index = 0; index < arguments.length; index++) {
    var token = projectClassToken(String(arguments[index]));
    if (tokens.indexOf(token) < 0) tokens.push(token);
  }
  this.element.setAttribute("class", tokens.join(" "));
};
GuestClassList.prototype.remove = function () {
  var remove = [];
  for (var index = 0; index < arguments.length; index++) {
    remove.push(projectClassToken(String(arguments[index])));
  }
  this.element.setAttribute("class", this.tokens().filter(function (token) {
    return remove.indexOf(token) < 0;
  }).join(" "));
};
GuestClassList.prototype.toggle = function (token, force) {
  var present = this.contains(token),
    next = force === undefined ? !present : Boolean(force);
  if (next && !present) this.add(token);
  if (!next && present) this.remove(token);
  return next;
};
Object.defineProperty(GuestElement.prototype, "classList", {
  get: function get() {
    return this._guestClassList || (this._guestClassList = new GuestClassList(this));
  }
});
function datasetAttribute(name) {
  return "data-" + String(name).replace(/[A-Z]/g, function (letter) {
    return "-" + letter.toLowerCase();
  });
}
Object.defineProperty(GuestElement.prototype, "dataset", {
  get: function get() {
    var element = this;
    return this._guestDataset || (this._guestDataset = new Proxy({}, {
      get: function get(_, name) {
        if (typeof name !== "string") return undefined;
        var value = element.getAttribute(datasetAttribute(name));
        return value === null ? undefined : value;
      },
      set: function set(_, name, value) {
        if (typeof name !== "string") return false;
        element.setAttribute(datasetAttribute(name), String(value));
        return true;
      },
      deleteProperty: function deleteProperty(_, name) {
        if (typeof name !== "string") return false;
        element.removeAttribute(datasetAttribute(name));
        return true;
      }
    }));
  }
});
Promise._immediateFn = function (callback) {
  setTimeout(callback, 0);
};
load('application.bin');
closeGuest();
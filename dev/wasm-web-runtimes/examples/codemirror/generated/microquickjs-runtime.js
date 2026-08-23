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
  if (typeof TextEncoder === "undefined") {
    globalThis.TextEncoder = function TextEncoder2() {};
    TextEncoder.prototype.encode = function (text) {
      text = String(text);
      var values = [];
      for (var index = 0; index < text.length; index++) {
        var scalar = text.charCodeAt(index);
        if (scalar >= 55296 && scalar <= 56319 && index + 1 < text.length) {
          scalar = 65536 + (scalar - 55296 << 10) + (text.charCodeAt(++index) - 56320);
        }
        if (scalar < 128) values.push(scalar);else if (scalar < 2048) values.push(192 | scalar >> 6, 128 | scalar & 63);else if (scalar < 65536) values.push(224 | scalar >> 12, 128 | scalar >> 6 & 63, 128 | scalar & 63);else values.push(240 | scalar >> 18, 128 | scalar >> 12 & 63, 128 | scalar >> 6 & 63, 128 | scalar & 63);
      }
      return new Uint8Array(values);
    };
  }
  if (typeof TextDecoder === "undefined") {
    globalThis.TextDecoder = function TextDecoder2() {};
    TextDecoder.prototype.decode = function (bytes) {
      var text = "";
      for (var index = 0; index < bytes.length;) {
        var first = bytes[index++],
          scalar;
        if (first < 128) scalar = first;else if (first < 224) scalar = (first & 31) << 6 | bytes[index++] & 63;else if (first < 240) scalar = (first & 15) << 12 | (bytes[index++] & 63) << 6 | bytes[index++] & 63;else scalar = (first & 7) << 18 | (bytes[index++] & 63) << 12 | (bytes[index++] & 63) << 6 | bytes[index++] & 63;
        if (scalar <= 65535) text += String.fromCharCode(scalar);else {
          scalar -= 65536;
          text += String.fromCharCode(55296 | scalar >> 10, 56320 | scalar & 1023);
        }
      }
      return text;
    };
  }
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
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (value, start) {
      var index = Number(start) || 0;
      if (index < 0) index = Math.max(0, this.length + index);
      for (; index < this.length; index++) {
        if (this[index] === value || this[index] !== this[index] && value !== value) return true;
      }
      return false;
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
      text = String(text);
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
  if (!Object.freeze) Object.freeze = function (value) {
    return value;
  };
  if (!Object.values) {
    Object.values = function (value) {
      return Object.keys(value).map(function (key) {
        return value[key];
      });
    };
  }
  if (!Object.entries) {
    Object.entries = function (value) {
      return Object.keys(value).map(function (key) {
        return [key, value[key]];
      });
    };
  }
  if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
      var result = {};
      entries.forEach(function (entry) {
        result[entry[0]] = entry[1];
      });
      return result;
    };
  }
  if (!Object.getPrototypeOf) {
    Object.getPrototypeOf = function (value) {
      if (value == null) throw new TypeError("Object.getPrototypeOf requires an object");
      return value.__proto__ || value.constructor && value.constructor.prototype || null;
    };
  }
  if (!String.prototype.localeCompare) {
    String.prototype.localeCompare = function (other) {
      var left = String(this),
        right = String(other);
      return left < right ? -1 : left > right ? 1 : 0;
    };
  }
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (callback, receiver) {
      var result = [];
      for (var index = 0; index < this.length; index++) {
        var value = callback.call(receiver, this[index], index, this);
        result = result.concat(value);
      }
      return result;
    };
  }
  if (!Array.prototype.at) {
    Array.prototype.at = function (index) {
      var offset = Number(index) || 0;
      if (offset < 0) offset += this.length;
      return offset < 0 || offset >= this.length ? void 0 : this[offset];
    };
  }
  if (!Number.isInteger) {
    Number.isInteger = function (value) {
      return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };
  }
  if (!Number.isFinite) {
    Number.isFinite = function (value) {
      return typeof value === "number" && isFinite(value);
    };
  }
  if (!Number.isSafeInteger) {
    Number.isSafeInteger = function (value) {
      return Number.isInteger(value) && Math.abs(value) <= 9007199254740991;
    };
  }
  if (!String.prototype.localeCompare) {
    String.prototype.localeCompare = function (other) {
      var left = String(this);
      var right = String(other);
      return left < right ? -1 : left > right ? 1 : 0;
    };
  }
  var NativeRegExp = RegExp;
  RegExp = function RegExp2(pattern, flags) {
    var value = new NativeRegExp(pattern, flags);
    value.__microquickjsFlags = String(flags || "");
    return value;
  };
  RegExp.prototype = NativeRegExp.prototype;
  [["global", "g"], ["ignoreCase", "i"], ["multiline", "m"]].forEach(function (entry) {
    Object.defineProperty(RegExp.prototype, entry[0], {
      get: function get() {
        return (this.__microquickjsFlags || "").indexOf(entry[1]) >= 0;
      }
    });
  });
  if (typeof globalThis.Map !== "function") globalThis.Map = MapPonyfill;
  if (typeof globalThis.Set !== "function") globalThis.Set = SetPonyfill;
  if (typeof globalThis.WeakMap !== "function") globalThis.WeakMap = WeakMapPonyfill;
  if (typeof globalThis.WeakSet !== "function") globalThis.WeakSet = WeakSetPonyfill;
  globalThis.Promise = src_default;
  if (!String.prototype.includes) {
    String.prototype.includes = function (value, start) {
      return String(this).indexOf(String(value), start || 0) !== -1;
    };
  }
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (value, start) {
      var at = start || 0;
      return String(this).slice(at, at + String(value).length) === String(value);
    };
  }
  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (value, end) {
      var text = String(this);
      var stop = end === void 0 ? text.length : Math.min(Number(end), text.length);
      return text.slice(stop - String(value).length, stop) === String(value);
    };
  }
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
  if (parts.length === 2 && /^\d/.test(parts[0])) {
    return [[property + "-width", parts[0]], [property + "-color", parts[1]]];
  }
  if (parts.length !== 3 || !/^\d/.test(parts[0]) || !/^(?:solid|dashed|dotted|double|none)$/.test(parts[1])) {
    throw new SyntaxError(property + " shorthand is not understood: " + value);
  }
  return [["border-" + side + "-width", parts[0]], ["border-" + side + "-style", parts[1]], ["border-" + side + "-color", parts[2]]];
}
function cssRadius(value) {
  var halves = value.split("/");
  if (halves.length > 2) throw new SyntaxError("border radius is not understood");
  var horizontal = cssParts(halves[0].trim());
  var vertical = halves.length === 2 ? cssParts(halves[1].trim()) : horizontal;
  if (!horizontal.length || horizontal.length > 4 || !vertical.length || vertical.length > 4) {
    throw new SyntaxError("border radius is not understood");
  }
  function corners(parts) {
    return [parts[0], parts[1] || parts[0], parts[2] || parts[0], parts[3] || parts[1] || parts[0]];
  }
  var x = corners(horizontal),
    y = corners(vertical);
  return [["border-top-left-radius", x[0] + (x[0] === y[0] ? "" : " / " + y[0])], ["border-top-right-radius", x[1] + (x[1] === y[1] ? "" : " / " + y[1])], ["border-bottom-right-radius", x[2] + (x[2] === y[2] ? "" : " / " + y[2])], ["border-bottom-left-radius", x[3] + (x[3] === y[3] ? "" : " / " + y[3])]];
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
    } else if (match = new RegExp("^#([0-9a-f]{3,8})\\b", "i").exec(rest)) {
      tokens.push([3, match[1]]);
      at += match[0].length;
    } else if (match = new RegExp("^-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[a-z]+|%)?", "i").exec(rest)) {
      tokens.push([2, match[0]]);
      at += match[0].length;
    } else if (match = new RegExp("^(--?[a-z_][a-z0-9_-]*|[a-z_][a-z0-9_-]*)", "i").exec(rest)) {
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
    } else if (value[at] === "+" || value[at] === "-" || value[at] === "*") {
      tokens.push([11, value[at++]]);
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
  var at = 0;
  function readDeclarations() {
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
        return declarations;
      }
      var propertyMatch = new RegExp("^(--?[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)\\s*:", "i").exec(source.slice(at));
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
      if (new RegExp("\\s*!important$", "i").test(value)) {
        important = true;
        value = value.replace(new RegExp("\\s*!important$", "i"), "").trim();
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
        return declarations;
      }
    }
  }
  function readRules(nested) {
    var rules = [];
    while (at < source.length) {
      var trivia = cssTrivia(source, at);
      at = trivia.at;
      trivia.comments.forEach(function (comment) {
        rules.push({
          comment: comment
        });
      });
      if (nested && source[at] === "}") {
        at++;
        return rules;
      }
      if (at >= source.length) {
        if (nested) throw new SyntaxError("CSS media rule is incomplete");
        break;
      }
      var brace = source.indexOf("{", at);
      if (brace < 0) throw new SyntaxError("CSS rule is missing an opening brace");
      var selector = source.slice(at, brace).trim();
      var keyframes = new RegExp("^@keyframes\\s+([a-z_][a-z0-9_-]*)$", "i").exec(selector);
      if (keyframes) {
        at = brace + 1;
        var frames = [];
        while (true) {
          at = cssTrivia(source, at).at;
          if (source[at] === "}") {
            at++;
            break;
          }
          var frameBrace = source.indexOf("{", at);
          if (frameBrace < 0) throw new SyntaxError("CSS keyframes rule is incomplete");
          var frameSelector = source.slice(at, frameBrace).trim().toLowerCase();
          if (!frameSelector.split(/\s*,\s*/).every(function (part) {
            return part === "from" || part === "to" || /^(?:100|\d{1,2})(?:\.\d+)?%$/.test(part);
          })) throw new SyntaxError("CSS keyframe selector is not understood: " + frameSelector);
          at = frameBrace + 1;
          frames.push({
            selector: frameSelector,
            declarations: readDeclarations()
          });
        }
        rules.push({
          keyframes: keyframes[1],
          frames: frames
        });
        continue;
      }
      var media = new RegExp("^@media\\s+(\\([^{}]+\\)(?:\\s+(?:and|or)\\s+\\([^{}]+\\)|\\s*,\\s*\\([^{}]+\\))*)$", "i").exec(selector);
      if (media) {
        at = brace + 1;
        rules.push({
          media: media[1].toLowerCase().replace(new RegExp(":\\s*", "g"), ": ").replace(new RegExp("\\s*,\\s*", "g"), ", ").replace(new RegExp("\\s+(and|or)\\s+", "g"), " $1 "),
          rules: readRules(true)
        });
        continue;
      }
      if (!selector || selector.indexOf("@") >= 0 || selector.indexOf("}") >= 0) {
        throw new SyntaxError("CSS selector is not understood: " + selector.slice(0, 120));
      }
      at = brace + 1;
      var declarations = readDeclarations();
      rules.push({
        selector: selector,
        declarations: declarations
      });
    }
    if (nested) throw new SyntaxError("CSS media rule is incomplete");
    return rules;
  }
  var rules = readRules(false);
  if (cssSpace(source, at) !== source.length) throw new SyntaxError("CSS input was not consumed");
  return rules;
}
var bridge = print;
var wireStrings = [];
var wireIndexes = Object.create(null);
var pendingStrings = [];
var pendingOperations = [];
var callbacks = [];
var callbackStates = [];
var freeCallbacks = [];
var wireBuffer = new Uint8Array(2 * 1024 * 1024);
var constructingHostReference = null;
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
  throw new TypeError("unsupported wire value: " + typeof value + " " + Object.prototype.toString.call(value));
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
  var directCustomElement = false;
  if (reference === undefined && constructingHostReference !== null) {
    reference = constructingHostReference;
  }
  if (reference === undefined && typeof customElementNames !== "undefined" && customElementNames.has(this.constructor)) {
    var customTag = customElementNames.get(this.constructor);
    var created = immediate([3, document.reference, stringIndex("createElement"), [encode(customTag)]]);
    reference = created[1];
    directCustomElement = true;
  }
  this.reference = reference;
  this._hostReference = new HostReference(reference);
  if (directCustomElement) this._guestCustomElement = true;
}
function GuestStyle(reference) {
  GuestObject.call(this, reference);
}
GuestStyle.prototype = Object.create(GuestObject.prototype);
["backgroundColor", "bottom", "boxShadow", "color", "contain", "display", "flexBasis", "fontFamily", "fontFeatureSettings", "fontKerning", "fontSize", "fontStyle", "fontVariationSettings", "fontWeight", "height", "inset", "left", "letterSpacing", "lineHeight", "marginTop", "maxWidth", "minHeight", "objectFit", "overflow", "paddingBottom", "paddingLeft", "paddingRight", "paddingTop", "position", "right", "textDecoration", "textDecorationColor", "top", "transform", "visibility", "whiteSpace", "width", "zIndex"].forEach(function (name) {
  Object.defineProperty(GuestStyle.prototype, name, {
    set: function set(value) {
      var property = name.replace(new RegExp("[A-Z]", "g"), function (letter) {
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
      var projected = name === "hidden" ? Boolean(value) : String(value);
      if (name === "className" && globalThis.__wwcProjectClassName) {
        projected = globalThis.__wwcProjectClassName(projected);
      }
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
    var writeDeclarations;
    writeDeclarations = function writeDeclarations(declarations) {
      declarations.forEach(function (declaration) {
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
    };
    var _writeRules;
    _writeRules = function writeRules(items) {
      var ordered = items.filter(function (rule) {
        return rule.keyframes !== undefined;
      }).concat(items.filter(function (rule) {
        return rule.keyframes === undefined;
      }));
      ordered.forEach(function (rule) {
        if (rule.comment !== undefined) {
          writer.byte(0);
          writer.text(rule.comment);
          return;
        }
        if (rule.media !== undefined) {
          writer.byte(3);
          writer.text(rule.media);
          writer.uint(rule.rules.length);
          _writeRules(rule.rules);
          return;
        }
        if (rule.keyframes !== undefined) {
          writer.byte(4);
          writer.text(rule.keyframes);
          writer.uint(rule.frames.length);
          rule.frames.forEach(function (frame) {
            writer.text(frame.selector);
            writer.uint(frame.declarations.length);
            writeDeclarations(frame.declarations);
          });
          return;
        }
        writer.byte(1);
        writer.text(rule.selector);
        writer.uint(rule.declarations.length);
        writeDeclarations(rule.declarations);
      });
    };
    _writeRules(rules);
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
GuestDocument.prototype.installStylesheetOperations = function (bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("stylesheet operations must be bytes");
  immediate([3, this.reference, stringIndex("installStylesheet"), [encode(bytes)]]);
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
globalThis.__wwcReportError = function (message) {
  immediate([3, document.reference, stringIndex("postMessage"), [encode("__wwcError:" + String(message))]]);
};
function GuestNavigator(reference) {
  GuestObject.call(this, reference);
}
GuestNavigator.prototype = Object.create(GuestObject.prototype);
var navigatorReference = immediate([1, document.reference, stringIndex("navigator")]);
var navigator = new GuestNavigator(navigatorReference[1]);
["language", "languages", "maxTouchPoints", "platform", "userAgent", "vendor"].forEach(function (name) {
  Object.defineProperty(GuestNavigator.prototype, name, {
    get: function get() {
      return immediate([1, this.reference, stringIndex(name)]);
    }
  });
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
Object.defineProperty(location, "search", {
  get: function get() {
    return immediate([3, document.reference, stringIndex("routeSearch"), []]);
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
var deliveredEvents = Object.create(null);
function eventForDelivery(reference) {
  var event = deliveredEvents[reference];
  if (event) return event;
  event = deliveredEvents[reference] = new GuestEvent(reference);
  setTimeout(function () {
    if (deliveredEvents[reference] === event) delete deliveredEvents[reference];
  }, 0);
  return event;
}
function dispatch(message) {
  if (message === -1) {
    flush();
    return;
  }
  var callbackIndex = Math.floor(message / 1048576);
  var eventReference = message % 1048576 - 1;
  var callback = callbacks[callbackIndex];
  if (!callback) throw new Error("event callback " + callbackIndex + " is unavailable");
  callback(eventReference < 0 ? undefined : eventForDelivery(eventReference));
  flush();
}
globalThis.document = document;
globalThis.window = globalThis.self = globalThis.parent = globalThis;
if (typeof globalThis.URL !== "function") {
  globalThis.URL = function GuestURL(value) {
    var text = String(value);
    var match = new RegExp("^(https?):\\/\\/([^/?#]+)([^?#]*)(\\?[^#]*)?(#.*)?$", "i").exec(text);
    if (!match || match[2].indexOf("@") >= 0) throw new TypeError("URL is not absolute HTTP(S)");
    var host = match[2].toLowerCase();
    var colon = host.lastIndexOf(":");
    this.protocol = match[1].toLowerCase() + ":";
    this.host = host;
    this.hostname = colon > 0 ? host.slice(0, colon) : host;
    this.pathname = match[3] || "/";
    this.search = match[4] || "";
    this.hash = match[5] || "";
    this.origin = this.protocol + "//" + this.host;
    this.href = text;
  };
  globalThis.URL.prototype.toString = function () {
    return this.href;
  };
}
if (!String.prototype.padStart) {
  String.prototype.padStart = function (length, fill) {
    var text = String(this);
    var padding = fill === undefined ? " " : String(fill);
    if (!padding || text.length >= length) return text;
    while (padding.length < length - text.length) padding += padding;
    return padding.slice(0, length - text.length) + text;
  };
}
globalThis.__wwcPostMessage = function (message) {
  pendingOperations.push([3, document.reference, stringIndex("postMessage"), [encode(String(message))]]);
};
globalThis.__wwcServiceCall = function (name, payload) {
  return immediate([3, document.reference, stringIndex("serviceCall"), [encode(String(name)), encode(String(payload))]]);
};
globalThis.__wwcReportError = function (message) {
  immediate([3, document.reference, stringIndex("postMessage"), [encode("__wwcError:" + String(message))]]);
};
document.defaultView = globalThis;
function HostWindow() {}
Object.defineProperty(HostWindow, Symbol.hasInstance, {
  value: function value(candidate) {
    return candidate === globalThis;
  }
});
globalThis.Window = HostWindow;
var customElementDefinitions = Object.create(null);
var customElementNames = new WeakMap();
globalThis.customElements = {
  define: function define(name, constructor) {
    name = String(name).toLowerCase();
    if (name.indexOf("-") < 1 || typeof constructor !== "function") {
      throw new TypeError("invalid custom element definition");
    }
    if (customElementDefinitions[name]) throw new TypeError("custom element is already defined");
    customElementDefinitions[name] = constructor;
    customElementNames.set(constructor, name);
  },
  get: function get(name) {
    return customElementDefinitions[String(name).toLowerCase()];
  },
  whenDefined: function whenDefined(name) {
    return customElementDefinitions[String(name).toLowerCase()] ? Promise.resolve() : Promise.reject(new TypeError("custom element is not defined"));
  }
};
globalThis.Node = GuestObject;
globalThis.Element = globalThis.HTMLElement = GuestElement;
function GuestSVGElement() {}
Object.defineProperty(GuestSVGElement, Symbol.hasInstance, {
  value: function value(candidate) {
    return candidate instanceof GuestElement && candidate.namespaceURI === "http://www.w3.org/2000/svg";
  }
});
globalThis.SVGElement = GuestSVGElement;
globalThis.Document = GuestDocument;
Object.defineProperties(GuestObject, {
  ELEMENT_NODE: {
    value: 1
  },
  ATTRIBUTE_NODE: {
    value: 2
  },
  TEXT_NODE: {
    value: 3
  },
  CDATA_SECTION_NODE: {
    value: 4
  },
  PROCESSING_INSTRUCTION_NODE: {
    value: 7
  },
  COMMENT_NODE: {
    value: 8
  },
  DOCUMENT_NODE: {
    value: 9
  },
  DOCUMENT_TYPE_NODE: {
    value: 10
  },
  DOCUMENT_FRAGMENT_NODE: {
    value: 11
  }
});
var syntheticDocumentListeners = Object.create(null);
function GuestCustomEvent(type, options) {
  this.type = String(type);
  this.detail = options && options.detail;
  this.defaultPrevented = false;
}
GuestCustomEvent.prototype.preventDefault = function () {
  this.defaultPrevented = true;
};
globalThis.CustomEvent = GuestCustomEvent;
globalThis.Event = GuestCustomEvent;
GuestDocument.prototype.dispatchEvent = function (event) {
  if (!(event instanceof GuestCustomEvent)) throw new TypeError("only guest custom events can be dispatched");
  var listeners = (syntheticDocumentListeners[event.type] || []).slice();
  for (var index = 0; index < listeners.length; index++) listeners[index].call(this, event);
  return !event.defaultPrevented;
};
GuestElement.prototype.showModal = function () {
  immediate([3, this.reference, stringIndex("showModal"), []]);
};
GuestElement.prototype.close = function (value) {
  immediate([3, this.reference, stringIndex("close"), value === undefined ? [] : [encode(String(value))]]);
};
GuestElement.prototype.dispatchEvent = function (event) {
  if (!(event instanceof GuestCustomEvent)) throw new TypeError("only guest events can be dispatched");
  if (event.type === "instanttooltiphide" || event.type === "themechange") {
    var records = (this._eventListeners || []).slice();
    for (var index = 0; index < records.length; index++) {
      if (records[index].type === event.type) records[index].callback.call(this, event);
    }
    return !event.defaultPrevented;
  }
  return immediate([3, this.reference, stringIndex("dispatchEvent"), [encode(event.type)]]);
};
Object.defineProperty(GuestDocument.prototype, "documentElement", {
  get: function get() {
    if (!this._documentElement) {
      var result = immediate([1, this.reference, stringIndex("documentElement")]);
      this._documentElement = nodeForReference(result[1]);
    }
    return this._documentElement;
  }
});
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
var NativeDate = Date;
var runtimeDateNow = function runtimeDateNow() {
  return runtimePerformanceNow ? Math.round(runtimeEpochOrigin + runtimePerformanceNow() - runtimePerformanceOrigin) : hostCall(document.reference, "dateNow", []);
};
function GuestDate(value) {
  return new NativeDate(arguments.length ? Number(value) : runtimeDateNow());
}
GuestDate.prototype = NativeDate.prototype;
GuestDate.now = runtimeDateNow;
[["getFullYear", 0], ["getMonth", 1], ["getDate", 2], ["getDay", 3], ["getHours", 4], ["getMinutes", 5], ["getSeconds", 6], ["getTimezoneOffset", 7]].forEach(function (entry) {
  NativeDate.prototype[entry[0]] = function () {
    return hostCall(document.reference, "datePart", [this.valueOf(), entry[1]]);
  };
});
globalThis.Date = GuestDate;
globalThis.performance = {
  now: runtimePerformanceNow || function () {
    return hostCall(document.reference, "performanceNow", []);
  }
};
globalThis.DOMRect = function DOMRect(x, y, width, height) {
  this.x = this.left = Number(x) || 0;
  this.y = this.top = Number(y) || 0;
  this.width = Number(width) || 0;
  this.height = Number(height) || 0;
  this.right = this.left + this.width;
  this.bottom = this.top + this.height;
};
globalThis.DOMRectReadOnly = globalThis.DOMRect;
var projectedClasses = Object.create(null),
  projectedClassCount = 0;
function projectClassToken(token) {
  if (new RegExp("^[a-z_][a-z0-9_-]*$", "i").test(token)) return token;
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
Object.defineProperty(GuestElement.prototype, "localName", {
  get: function get() {
    if (this._localName === undefined) {
      this._localName = immediate([1, this.reference, stringIndex("localName")]);
    }
    return this._localName;
  }
});
Object.defineProperty(GuestElement.prototype, "namespaceURI", {
  get: function get() {
    if (this._namespaceURI === undefined) {
      this._namespaceURI = immediate([1, this.reference, stringIndex("namespaceURI")]);
    }
    return this._namespaceURI;
  }
});
GuestObject.prototype.contains = function (node) {
  return immediate([3, this.reference, stringIndex("contains"), [encode(node)]]);
};
GuestObject.prototype.closest = function (selector) {
  var result = immediate([3, this.reference, stringIndex("closest"), [encode(String(selector))]]);
  return result === null ? null : nodeForReference(result[1]);
};
GuestElement.prototype.matches = function (selector) {
  return immediate([3, this.reference, stringIndex("matches"), [encode(String(selector))]]);
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
function guestNodeIsConnected(node) {
  var current = node,
    guard = 0;
  while (current && guard++ < 4096) {
    if (current === document.body || current === document.head || current === document.documentElement) return true;
    current = parentOf(current);
  }
  return false;
}
function notifyGuestConnection(node, connected) {
  if (node._guestCustomElement) {
    var callback = node[connected ? "connectedCallback" : "disconnectedCallback"];
    if (typeof callback === "function") callback.call(node);
  }
  var children = childrenOf(node);
  for (var index = 0; index < children.length; index++) {
    notifyGuestConnection(children[index], connected);
  }
}
function detachGuestNode(node) {
  var wasConnected = guestNodeIsConnected(node);
  var parent = parentOf(node);
  if (parent) {
    var siblings = childrenOf(parent);
    var index = siblings.indexOf(node);
    if (index > -1) siblings.splice(index, 1);
  }
  setParent(node, null);
  if (wasConnected) notifyGuestConnection(node, false);
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
globalThis.Selection = GuestSelection;
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
globalThis.Range = GuestRange;
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
function GuestWebGLObject(reference) {
  GuestObject.call(this, reference);
}
GuestWebGLObject.prototype = Object.create(GuestObject.prototype);
function GuestWebGLContext(reference) {
  GuestObject.call(this, reference);
}
GuestWebGLContext.prototype = Object.create(GuestObject.prototype);
function GuestWebGPUContext(reference) {
  GuestObject.call(this, reference);
}
GuestWebGPUContext.prototype = Object.create(GuestObject.prototype);
GuestElement.prototype.getContext = function (type, options) {
  var args = [encode(type)];
  if (options !== undefined) args.push(encode(Boolean(options && options.preserveDrawingBuffer)));
  var result = immediate([3, this.reference, stringIndex("getContext"), args]);
  if (result === null) return null;
  if (type === "webgl") return new GuestWebGLContext(result[1]);
  if (type === "webgpu") return new GuestWebGPUContext(result[1]);
  return new GuestCanvasContext(result[1]);
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
var webGLConstants = {
  ARRAY_BUFFER: 34962,
  COLOR_BUFFER_BIT: 16384,
  COMPILE_STATUS: 35713,
  FLOAT: 5126,
  FRAGMENT_SHADER: 35632,
  LINK_STATUS: 35714,
  STATIC_DRAW: 35044,
  TRIANGLES: 4,
  VERTEX_SHADER: 35633
};
Object.keys(webGLConstants).forEach(function (name) {
  Object.defineProperty(GuestWebGLContext.prototype, name, {
    value: webGLConstants[name]
  });
});
["createBuffer", "createProgram"].forEach(function (name) {
  GuestWebGLContext.prototype[name] = function () {
    var result = hostCall(this.reference, name, []);
    return result === null ? null : new GuestWebGLObject(result[1]);
  };
});
GuestWebGLContext.prototype.createShader = function (type) {
  var result = hostCall(this.reference, "createShader", [Number(type)]);
  return result === null ? null : new GuestWebGLObject(result[1]);
};
GuestWebGLContext.prototype.shaderSource = function (shader, source) {
  hostCall(this.reference, "shaderSource", [shader, String(source)]);
};
["compileShader", "linkProgram", "useProgram"].forEach(function (name) {
  GuestWebGLContext.prototype[name] = function (object) {
    hostCall(this.reference, name, [object]);
  };
});
GuestWebGLContext.prototype.attachShader = function (program, shader) {
  hostCall(this.reference, "attachShader", [program, shader]);
};
GuestWebGLContext.prototype.bindBuffer = function (target, buffer) {
  hostCall(this.reference, "bindBuffer", [Number(target), buffer]);
};
["getShaderParameter", "getProgramParameter"].forEach(function (name) {
  GuestWebGLContext.prototype[name] = function (object, parameter) {
    return hostCall(this.reference, name, [object, Number(parameter)]);
  };
});
GuestWebGLContext.prototype.getAttribLocation = function (program, name) {
  return hostCall(this.reference, "getAttribLocation", [program, String(name)]);
};
GuestWebGLContext.prototype.bufferData = function (target, values, usage) {
  if (!values || !values.buffer) throw new TypeError("WebGL buffer data must be a typed array");
  var bytes = new Uint8Array(values.buffer, values.byteOffset || 0, values.byteLength);
  hostCall(this.reference, "bufferData", [Number(target), bytes, Number(usage)]);
};
GuestWebGLContext.prototype.clearColor = function (red, green, blue, alpha) {
  hostCall(this.reference, "clearColor", [red, green, blue, alpha].map(function (value) {
    return Math.round(Number(value) * 1000000);
  }));
};
["clear", "enableVertexAttribArray"].forEach(function (name) {
  GuestWebGLContext.prototype[name] = function (value) {
    hostCall(this.reference, name, [Number(value)]);
  };
});
GuestWebGLContext.prototype.vertexAttribPointer = function (index, size, type, normalized, stride, offset) {
  hostCall(this.reference, "vertexAttribPointer", [Number(index), Number(size), Number(type), Boolean(normalized), Number(stride), Number(offset)]);
};
GuestWebGLContext.prototype.viewport = function (x, y, width, height) {
  hostCall(this.reference, "viewport", [x, y, width, height].map(Number));
};
GuestWebGLContext.prototype.drawArrays = function (mode, first, count) {
  hostCall(this.reference, "drawArrays", [Number(mode), Number(first), Number(count)]);
};
GuestWebGPUContext.prototype.renderTriangle = function () {
  hostCall(this.reference, "renderTriangle", []);
};
GuestElement.prototype.focus = function () {
  hostCall(this.reference, "focus", []);
};
GuestElement.prototype.select = function () {
  hostCall(this.reference, "select", []);
};
GuestElement.prototype.setCustomValidity = function (message) {
  hostCall(this.reference, "setCustomValidity", [String(message)]);
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
GuestRange.prototype.detach = function () {
  hostCall(this.reference, "detach", []);
};
["startContainer", "endContainer"].forEach(function (name) {
  Object.defineProperty(GuestRange.prototype, name, {
    get: function get() {
      var result = hostGet(this.reference, name);
      return nodeForReference(result[1]);
    }
  });
});
["startOffset", "endOffset"].forEach(function (name) {
  Object.defineProperty(GuestRange.prototype, name, {
    get: function get() {
      return hostGet(this.reference, name);
    }
  });
});
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
function GuestStylesheetNode() {
  this.parentNode = null;
  this._text = "";
}
function projectStylesheet(source) {
  var output = "",
    at = 0;
  var pattern = new RegExp("@media\\s+print\\s*\\{", "ig");
  while (true) {
    pattern.lastIndex = at;
    var match = pattern.exec(source);
    if (!match) {
      output += source.slice(at);
      output = output.replace(new RegExp("\\.([^\\d\\s.#:\\[\\]{};>+~(),][^\\s.#:\\[\\]{};>+~(),]*)", "g"), function (_, token) {
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
GuestDocument.prototype.installStylesheetOperations = function (bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("stylesheet operations must be bytes");
  immediate([3, this.reference, stringIndex("installStylesheet"), [encode(bytes)]]);
};
GuestDocument.prototype.installStylesheetSource = function (source) {
  document.installStylesheet(projectStylesheet(String(source)));
};
function omitCssUrls(source) {
  var output = "",
    at = 0,
    pattern = new RegExp("url\\s*\\(", "ig");
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
  tag = String(tag).toLowerCase();
  var result = immediate([3, this.reference, stringIndex("createElement"), [encode(tag)]]);
  var constructor = customElementDefinitions[tag];
  var node;
  if (constructor) {
    constructingHostReference = result[1];
    try {
      node = new constructor();
    } finally {
      constructingHostReference = null;
    }
  } else node = new GuestElement(result[1]);
  node = rememberNode(node);
  node._guestCustomElement = Boolean(constructor);
  node._nodeType = 1;
  node._nodeName = tag.toUpperCase();
  node._localName = tag;
  node._namespaceURI = "http://www.w3.org/1999/xhtml";
  return node;
};
GuestDocument.prototype.createElementNS = function (namespace, tag) {
  namespace = String(namespace);
  tag = String(tag).toLowerCase();
  var result = immediate([3, this.reference, stringIndex("createElementNS"), [encode(namespace), encode(tag)]]);
  var node = rememberNode(new GuestElement(result[1]));
  node._nodeType = 1;
  node._nodeName = tag;
  node._localName = tag;
  node._namespaceURI = namespace;
  return node;
};
GuestDocument.prototype.createDocumentFragment = function () {
  var result = immediate([3, this.reference, stringIndex("createDocumentFragment"), []]);
  var node = rememberNode(new GuestElement(result[1]));
  node._nodeType = 11;
  node._nodeName = "#document-fragment";
  return node;
};
Object.defineProperty(GuestElement.prototype, "content", {
  get: function get() {
    var result = immediate([1, this.reference, stringIndex("content")]);
    if (result === null) return null;
    var content = nodeForReference(result[1]);
    synchronizeGuestChildren(content);
    return content;
  }
});
GuestDocument.prototype.getElementById = function (id) {
  var result = immediate([3, this.reference, stringIndex("getElementById"), [encode(String(id))]]);
  return result === null ? null : nodeForReference(result[1]);
};
GuestDocument.prototype.elementFromPoint = function (x, y) {
  var result = immediate([3, this.reference, stringIndex("elementFromPoint"), [encode(Math.round(Number(x))), encode(Math.round(Number(y)))]]);
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
function synchronizeGuestSubtree(target) {
  synchronizeGuestChildren(target);
  var children = childrenOf(target);
  for (var index = 0; index < children.length; index++) {
    if (children[index].nodeType === 1 || children[index].nodeType === 11) {
      synchronizeGuestSubtree(children[index]);
    }
  }
}
GuestObject.prototype.cloneNode = function (deep) {
  var result = hostCall(this.reference, "cloneNode", [Boolean(deep)]);
  var clone = nodeForReference(result[1]);
  if (deep) synchronizeGuestSubtree(clone);
  return clone;
};
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
      record.target._nodeValue = undefined;
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
function GuestComputedStyle(reference) {
  GuestObject.call(this, reference);
}
GuestComputedStyle.prototype = Object.create(GuestObject.prototype);
["direction", "height", "overflow", "paddingBottom", "paddingLeft", "paddingRight", "paddingTop", "position", "whiteSpace", "width"].forEach(function (name) {
  Object.defineProperty(GuestComputedStyle.prototype, name, {
    get: function get() {
      return hostGet(this.reference, name);
    }
  });
});
GuestComputedStyle.prototype.getPropertyValue = function (name) {
  return hostCall(this.reference, "getPropertyValue", [String(name)]);
};
globalThis.getComputedStyle = function (element) {
  var result = hostCall(document.reference, "getComputedStyle", [element]);
  return new GuestComputedStyle(result[1]);
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
  delay = Number.isFinite(delay) ? Math.max(0, Math.round(delay)) : 0;
  var token = {
    active: true,
    index: -1
  };
  var index = allocateCallback(function () {
    token.active = false;
    callback();
  }, true);
  token.index = index;
  hostCall(document.reference, "timerOnce", [delay, index]);
  return token;
};
var intervalCallbacks = Object.create(null);
globalThis.setInterval = function (callback, delay) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  delay = Number.isFinite(delay) ? Math.max(0, Math.round(delay)) : 0;
  var index = allocateCallback(callback, false);
  var handle = hostCall(document.reference, "timer", [delay, index]);
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
    media: "",
    onchange: null,
    addListener: function addListener() {},
    removeListener: function removeListener() {},
    addEventListener: function addEventListener() {},
    removeEventListener: function removeEventListener() {},
    dispatchEvent: function dispatchEvent() {
      return true;
    }
  };
};
globalThis.clearTimeout = function (handle) {
  if (!handle || handle.active !== true || !Number.isInteger(handle.index)) return;
  handle.active = false;
  retireOneShotCallback(handle.index);
};
globalThis.clearImmediate = globalThis.clearTimeout;
globalThis.queueMicrotask = function (callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  Promise.resolve().then(callback);
};
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
GuestEvent.prototype.getTargetRanges = function () {
  var result = hostCall(this.reference, "getTargetRanges", []);
  var list = new GuestObject(result[1]),
    ranges = [];
  var length = hostGet(list.reference, "length");
  for (var index = 0; index < length; index++) {
    var item = hostCall(list.reference, "item", [index]);
    ranges.push(new GuestRange(item[1]));
  }
  return ranges;
};
GuestEvent.prototype.getModifierState = function (key) {
  return immediate([3, this.reference, stringIndex("getModifierState"), [encode(String(key))]]);
};
GuestEvent.prototype.composedPath = function () {
  var bytes = hostCall(this.reference, "composedPathReferences", []);
  var length = bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;
  var path = [];
  for (var index = 0; index < length; index++) {
    var at = 4 + index * 4;
    path.push(nodeForReference(bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16 | bytes[at + 3] << 24));
  }
  return path;
};
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
  var index = callbacks.length;
  if (index >= 4096) throw new RangeError("event callback space exhausted");
  var state = {
    active: true,
    callback: callback
  };
  callbackStates[index] = state;
  callbacks[index] = function (event) {
    var current = state.callback;
    if (!state.active || !current) return releaseCallback(index);
    try {
      current(event);
    } catch (_error3) {
      var message = String(_error3),
        stack = _error3 && _error3.stack;
      globalThis.__wwcReportError(stack && stack.indexOf(message) < 0 ? message + "\n" + stack : stack || message);
      throw _error3;
    }
  };
  return index;
}
GuestElement.prototype.addEventListener = function (type, callback, options) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var records = this._eventListeners || (this._eventListeners = []);
  if (records.some(function (record) {
    return record.type === type && record.callback === callback;
  })) return;
  var local = type === "instanttooltiphide" || type === "themechange";
  var index = local ? -1 : allocateElementCallback(callback);
  var capture = options === true || Boolean(options && options.capture);
  records.push({
    type: type,
    callback: callback,
    index: index,
    capture: capture,
    local: local
  });
  if (!local) pendingOperations.push([4, this.reference, stringIndex(type), index, capture]);
};
GuestElement.prototype.removeEventListener = function (type, callback) {
  var records = this._eventListeners || [];
  for (var index = 0; index < records.length; index++) {
    var record = records[index];
    if (record.type === type && record.callback === callback) {
      records.splice(index, 1);
      if (!record.local) {
        releaseCallback(record.index);
        pendingOperations.push([5, this.reference, stringIndex(type), record.index]);
      }
      return;
    }
  }
};
GuestDocument.prototype.addEventListener = GuestElement.prototype.addEventListener;
GuestDocument.prototype.removeEventListener = GuestElement.prototype.removeEventListener;
var addDocumentEventListener = GuestDocument.prototype.addEventListener;
GuestDocument.prototype.addEventListener = function (type, callback, options) {
  if (type === "themechange" || type === "instanttooltiphide") {
    if (typeof callback !== "function") throw new TypeError("callback required");
    (syntheticDocumentListeners[type] || (syntheticDocumentListeners[type] = [])).push(callback);
    return;
  }
  return addDocumentEventListener.call(this, type, callback, options);
};
Object.defineProperty(GuestElement.prototype, "tabIndex", {
  set: function set(value) {
    pendingOperations.push([2, this.reference, stringIndex("tabIndex"), encode(value)]);
  }
});
Object.defineProperty(GuestElement.prototype, "hidden", {
  get: function get() {
    return immediate([1, this.reference, stringIndex("hidden")]);
  },
  set: function set(value) {
    immediate([2, this.reference, stringIndex("hidden"), encode(Boolean(value))]);
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
  if (child instanceof GuestStylesheetNode) {
    child.parentNode = this;
    document.installStylesheet(projectStylesheet(child.textContent));
    return child;
  }
  if (child.nodeType === 11) {
    var fragmentChildren = childrenOf(child).slice();
    for (var fragmentIndex = 0; fragmentIndex < fragmentChildren.length; fragmentIndex++) {
      var fragmentChild = fragmentChildren[fragmentIndex];
      detachGuestNode(fragmentChild);
      childrenOf(this).push(fragmentChild);
      setParent(fragmentChild, this);
      if (guestNodeIsConnected(fragmentChild)) notifyGuestConnection(fragmentChild, true);
    }
    pendingOperations.push([3, this.reference, stringIndex("appendChild"), [encode(child)]]);
    return child;
  }
  detachGuestNode(child);
  childrenOf(this).push(child);
  setParent(child, this);
  if (guestNodeIsConnected(child)) notifyGuestConnection(child, true);
  pendingOperations.push([3, this.reference, stringIndex("appendChild"), [encode(child)]]);
  return child;
};
GuestElement.prototype.insertBefore = function (child, next) {
  if (child instanceof GuestStylesheetNode) {
    child.parentNode = this;
    document.installStylesheet(projectStylesheet(child.textContent));
    return child;
  }
  if (child.nodeType === 11) {
    var fragmentChildren = childrenOf(child).slice();
    var destination = childrenOf(this);
    var destinationIndex = next === null ? destination.length : destination.indexOf(next);
    if (destinationIndex < 0) throw new TypeError("reference node is not a child");
    for (var fragmentIndex = 0; fragmentIndex < fragmentChildren.length; fragmentIndex++) {
      var fragmentChild = fragmentChildren[fragmentIndex];
      detachGuestNode(fragmentChild);
      destination.splice(destinationIndex++, 0, fragmentChild);
      setParent(fragmentChild, this);
      if (guestNodeIsConnected(fragmentChild)) notifyGuestConnection(fragmentChild, true);
    }
    pendingOperations.push([3, this.reference, stringIndex("insertBefore"), [encode(child), encode(next)]]);
    return child;
  }
  detachGuestNode(child);
  var children = childrenOf(this);
  var index = next === null ? children.length : children.indexOf(next);
  if (index < 0) throw new TypeError("reference node is not a child");
  children.splice(index, 0, child);
  setParent(child, this);
  if (guestNodeIsConnected(child)) notifyGuestConnection(child, true);
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
GuestObject.prototype.before = function (node) {
  var parent = parentOf(this);
  if (!parent) return;
  if (!(node instanceof GuestObject)) node = document.createTextNode(String(node));
  parent.insertBefore(node, this);
};
GuestObject.prototype.after = function (node) {
  var parent = parentOf(this);
  if (!parent) return;
  if (!(node instanceof GuestObject)) node = document.createTextNode(String(node));
  var siblings = childrenOf(parent);
  parent.insertBefore(node, siblings[siblings.indexOf(this) + 1] || null);
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
    if (guestNodeIsConnected(child)) notifyGuestConnection(child, true);
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
  if (Object.prototype.hasOwnProperty.call(values, name)) return values[name];
  var known = this._knownAttributes || (this._knownAttributes = Object.create(null));
  if (known[name]) return null;
  var value = hostCall(this.reference, "getAttribute", [String(name)]);
  known[name] = true;
  if (value !== null) values[name] = value;
  return value;
};
GuestElement.prototype.setAttribute = function (name, value) {
  var text = String(value);
  if (name === "class") text = projectClassName(text);
  var values = this._attributeValues || (this._attributeValues = Object.create(null));
  var known = this._knownAttributes || (this._knownAttributes = Object.create(null));
  known[name] = true;
  values[name] = text;
  if (String(name).toLowerCase() === "style") {
    this.style.cssText = text;
    return;
  }
  pendingOperations.push([3, this.reference, stringIndex("setAttribute"), [encode(String(name)), encode(text)]]);
};
GuestElement.prototype.removeAttribute = function (name) {
  var values = this._attributeValues || (this._attributeValues = Object.create(null));
  var known = this._knownAttributes || (this._knownAttributes = Object.create(null));
  known[name] = true;
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
  return "data-" + String(name).replace(new RegExp("[A-Z]", "g"), function (letter) {
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
// MicroQuickJS omits newer standard-library methods. Keep this list driven by
// execution of the real CodeMirror bundle instead of installing a broad shim.
globalThis.__microQuickJS = true;

if (typeof TextEncoder === "undefined") {
  globalThis.TextEncoder = function TextEncoder() {};
  TextEncoder.prototype.encode = function (text) {
    text = String(text);
    var values = [];
    for (var index = 0; index < text.length; index++) {
      var scalar = text.charCodeAt(index);
      if (scalar >= 0xd800 && scalar <= 0xdbff && index + 1 < text.length) {
        scalar = 0x10000 + ((scalar - 0xd800) << 10) + (text.charCodeAt(++index) - 0xdc00);
      }
      if (scalar < 0x80) values.push(scalar);
      else if (scalar < 0x800) values.push(0xc0 | scalar >> 6, 0x80 | scalar & 63);
      else if (scalar < 0x10000) values.push(0xe0 | scalar >> 12,
        0x80 | scalar >> 6 & 63, 0x80 | scalar & 63);
      else values.push(0xf0 | scalar >> 18, 0x80 | scalar >> 12 & 63,
        0x80 | scalar >> 6 & 63, 0x80 | scalar & 63);
    }
    return new Uint8Array(values);
  };
}

if (typeof TextDecoder === "undefined") {
  globalThis.TextDecoder = function TextDecoder() {};
  TextDecoder.prototype.decode = function (bytes) {
    var text = "";
    for (var index = 0; index < bytes.length;) {
      var first = bytes[index++], scalar;
      if (first < 0x80) scalar = first;
      else if (first < 0xe0) scalar = (first & 31) << 6 | bytes[index++] & 63;
      else if (first < 0xf0) scalar = (first & 15) << 12 |
        (bytes[index++] & 63) << 6 | bytes[index++] & 63;
      else scalar = (first & 7) << 18 | (bytes[index++] & 63) << 12 |
        (bytes[index++] & 63) << 6 | bytes[index++] & 63;
      if (scalar <= 0xffff) text += String.fromCharCode(scalar);
      else {
        scalar -= 0x10000;
        text += String.fromCharCode(0xd800 | scalar >> 10, 0xdc00 | scalar & 1023);
      }
    }
    return text;
  };
}

if (typeof Symbol === "undefined") {
  var nextSymbol = 0;
  var symbolRegistry = Object.create(null);
  var SymbolPonyfill = function (description) {
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

// A JavaScript ponyfill cannot make a reference weak. This preserves the API
// while the MicroQuickJS adapter moves identity retention into its native
// host-reference finalizers.
if (typeof WeakRef === "undefined") {
  globalThis.WeakRef = function WeakRefPonyfill(value) { this.value = value; };
  WeakRef.prototype.deref = function () { return this.value; };
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
      if (this[index] === value || (this[index] !== this[index] && value !== value)) return true;
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
      Object.keys(source).forEach(function (key) { target[key] = source[key]; });
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
      if (scalar >= 0xd800 && scalar <= 0xdbff && index + 1 < text.length) {
        scalar = 0x10000 + ((scalar - 0xd800) << 10) +
          (text.charCodeAt(++index) - 0xdc00);
      }
      if (scalar < 128 && /[A-Za-z0-9_.!~*'()-]/.test(String.fromCharCode(scalar))) {
        output += String.fromCharCode(scalar);
        continue;
      }
      var bytes = scalar < 0x80 ? [scalar] : scalar < 0x800 ?
        [0xc0 | scalar >> 6, 0x80 | scalar & 63] : scalar < 0x10000 ?
        [0xe0 | scalar >> 12, 0x80 | scalar >> 6 & 63, 0x80 | scalar & 63] :
        [0xf0 | scalar >> 18, 0x80 | scalar >> 12 & 63,
          0x80 | scalar >> 6 & 63, 0x80 | scalar & 63];
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

if (!Object.freeze) Object.freeze = function (value) { return value; };
if (!Object.values) {
  Object.values = function (value) { return Object.keys(value).map(function (key) { return value[key]; }); };
}
if (!Object.entries) {
  Object.entries = function (value) { return Object.keys(value).map(function (key) { return [key, value[key]]; }); };
}
if (!Object.fromEntries) {
  Object.fromEntries = function (entries) {
    var result = {};
    entries.forEach(function (entry) { result[entry[0]] = entry[1]; });
    return result;
  };
}
if (!Object.getPrototypeOf) {
  Object.getPrototypeOf = function (value) {
    if (value == null) throw new TypeError("Object.getPrototypeOf requires an object");
    return value.__proto__ || (value.constructor && value.constructor.prototype) || null;
  };
}
if (!String.prototype.localeCompare) {
  String.prototype.localeCompare = function (other) {
    var left = String(this), right = String(other);
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
    return offset < 0 || offset >= this.length ? undefined : this[offset];
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

// MicroQuickJS accepts flags but does not retain them for standard getters.
// Babel routes flagged literals through this constructor, so one weak entry
// restores the observable browser contract without changing regexp matching.
var NativeRegExp = RegExp;
RegExp = function RegExp(pattern, flags) {
  var value = new NativeRegExp(pattern, flags);
  value.__microquickjsFlags = String(flags || "");
  return value;
};
RegExp.prototype = NativeRegExp.prototype;
[["global", "g"], ["ignoreCase", "i"], ["multiline", "m"]].forEach(
  function (entry) {
    Object.defineProperty(RegExp.prototype, entry[0], {
      get: function () { return (this.__microquickjsFlags || "").indexOf(entry[1]) >= 0; }
    });
  }
);

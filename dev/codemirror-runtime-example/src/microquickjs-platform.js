// MicroQuickJS omits newer standard-library methods. Keep this list driven by
// execution of the real CodeMirror bundle instead of installing a broad shim.
globalThis.__microQuickJS = true;

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

if (!Number.isInteger) {
  Number.isInteger = function (value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
  };
}

// MicroQuickJS accepts flags when compiling a RegExp but does not expose the
// standard flag getters CodeMirror uses for validation and cloning.
[["global", "g"], ["ignoreCase", "i"], ["multiline", "m"]].forEach(
  function (entry) {
    if (!(entry[0] in RegExp.prototype)) {
      Object.defineProperty(RegExp.prototype, entry[0], {
        get: function () { return this.toString().slice(this.toString().lastIndexOf("/") + 1).indexOf(entry[1]) >= 0; }
      });
    }
  }
);

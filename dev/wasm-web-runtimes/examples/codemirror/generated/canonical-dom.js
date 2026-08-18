var FONT_RESOURCES = {};
var RUNTIME_RESOURCES = { files: {} };
/* `print` is the unchanged MicroQuickJS native slot used by this build. */
var bridge = globalThis.bridge;

/* A small guest-side DOM facade. The host sees only interned byte operations;
   the application below uses browser-shaped objects and owns all UI policy. */
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
  var state = { active: true, once: Boolean(once) };
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
      code = 0x10000 + ((code - 0xd800) << 10) +
        (text.charCodeAt(++index) - 0xdc00);
    }
    length += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  this.uint(length);
  for (var cursor = 0; cursor < text.length; cursor++) {
    var scalar = text.charCodeAt(cursor);
    if (scalar >= 0xd800 && scalar <= 0xdbff && cursor + 1 < text.length) {
      scalar = 0x10000 + ((scalar - 0xd800) << 10) +
        (text.charCodeAt(++cursor) - 0xdc00);
    }
    if (scalar < 0x80) this.byte(scalar);
    else if (scalar < 0x800) {
      this.byte(0xc0 | scalar >> 6); this.byte(0x80 | scalar & 63);
    } else if (scalar < 0x10000) {
      this.byte(0xe0 | scalar >> 12); this.byte(0x80 | scalar >> 6 & 63);
      this.byte(0x80 | scalar & 63);
    } else {
      this.byte(0xf0 | scalar >> 18); this.byte(0x80 | scalar >> 12 & 63);
      this.byte(0x80 | scalar >> 6 & 63); this.byte(0x80 | scalar & 63);
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
    if (value >= 0) { writer.byte(3); return writer.uint(value); }
    writer.byte(8); return writer.uint(-value * 2 - 1);
  }
  if (value[0] === "r") { writer.byte(4); return writer.uint(value[1]); }
  if (value[0] === "s") { writer.byte(5); return writer.uint(value[1]); }
  if (value instanceof Uint8Array) {
    writer.byte(6); writer.uint(value.length);
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
  var value = 0, scale = 1, byte;
  do { byte = this.byte(); value += (byte & 127) * scale; scale *= 128; }
  while (byte & 128);
  return value;
};

Reader.prototype.text = function () {
  var length = this.uint(), end = this.at + length, text = "";
  if (end > this.length) throw new RangeError("truncated wire text");
  while (this.at < end) {
    var first = this.byte(), scalar;
    if (first < 0x80) scalar = first;
    else if (first < 0xe0) scalar = (first & 31) << 6 | this.byte() & 63;
    else if (first < 0xf0) {
      scalar = (first & 15) << 12 | (this.byte() & 63) << 6 | this.byte() & 63;
    } else {
      scalar = (first & 7) << 18 | (this.byte() & 63) << 12 |
        (this.byte() & 63) << 6 | this.byte() & 63;
    }
    if (scalar < 0x10000) text += String.fromCharCode(scalar);
    else {
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
    var length = reader.uint(), bytes = new Uint8Array(length);
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
  pendingStrings.forEach(function (text) { writer.text(text); });
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
  wireBuffer[1] = (writer.at - 4) >> 8;
  wireBuffer[2] = (writer.at - 4) >> 16;
  wireBuffer[3] = (writer.at - 4) >> 24;
  pendingStrings = [];
  var length = bridge(wireBuffer, writer.at);
  var reader = new Reader(wireBuffer, length);
  var count = reader.uint(), result = [];
  while (result.length < count) result.push(readValue(reader));
  return result;
}

function flush() {
  if (!pendingOperations.length) return;
  var operations = pendingOperations;
  pendingOperations = [];
  // Queued operations are deliberately fire-and-forget, but browser methods
  // such as appendChild return objects. The host leases every returned object,
  // so immediately relinquish references that no caller will ever observe.
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
  /* This native token has no methods. MicroQuickJS releases the host lease when
     the token is collected along with this browser-shaped wrapper. */
  this._hostReference = hostReference(reference);
}

function GuestStyle(reference) {
  GuestObject.call(this, reference);
}
GuestStyle.prototype = Object.create(GuestObject.prototype);

["display", "flexBasis", "height", "inset", "left", "marginTop", "minHeight", "objectFit",
  "position", "top", "width", "zIndex"].forEach(
  function (name) {
    Object.defineProperty(GuestStyle.prototype, name, {
      set: function (value) {
        var property = name.replace(/[A-Z]/g, function (letter) {
          return "-" + letter.toLowerCase();
        });
        if (value === "") {
          immediate([3, this.reference, stringIndex("removeProperty"), [encode(property)]]);
          return;
        }
        immediate([3, this.reference, stringIndex("applyDeclarations"), [
          encode(encodeCss(".wwc-inline { " + property + ": " + value + "; }"))
        ]]);
      }
    });
  }
);

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
    set: function (value) {
      if (name === "textContent" && globalThis.__wwcSetElementTextContent &&
          globalThis.__wwcSetElementTextContent(this, String(value))) return;
      var projected = name === "className" && globalThis.__wwcProjectClassName ?
        globalThis.__wwcProjectClassName(String(value)) : value;
      pendingOperations.push([2, this.reference, stringIndex(name), encode(projected)]);
    }
  });
});

Object.defineProperty(GuestElement.prototype, "style", {
  get: function () {
    if (!this._style) {
      var result = immediate([1, this.reference, stringIndex("style")]);
      this._style = new GuestStyle(result[1]);
    }
    return this._style;
  }
});

["selectionEnd", "selectionStart"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function () { return immediate([1, this.reference, stringIndex(name)]); }
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
  pendingOperations.push([3, this.reference, stringIndex("setAttribute"), [
    encode(name), encode(value)
  ]]);
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

["altKey", "button", "buttons", "charCode", "clientX", "clientY", "code", "ctrlKey",
  "data", "defaultPrevented", "detail", "inputType", "isComposing", "key", "keyCode",
  "metaKey", "repeat", "shiftKey", "type"].forEach(
  function (name) {
    Object.defineProperty(GuestEvent.prototype, name, {
      get: function () { return immediate([1, this.reference, stringIndex(name)]); }
    });
  }
);

Object.defineProperty(GuestEvent.prototype, "target", {
  get: function () {
    var result = immediate([1, this.reference, stringIndex("target")]);
    if (result === null) return null;
    return globalThis.__wwcNodeForReference ? globalThis.__wwcNodeForReference(result[1]) :
      new GuestElement(result[1]);
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
  var result = immediate([3, this.reference, stringIndex("createElementNS"), [
    encode(namespace), encode(tag)
  ]]);
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
  var bits = 0, bitCount = 0, offset = 0;
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
  pendingOperations.push([3, document.reference, stringIndex("timer"), [
    encode(delay), encode(index)
  ]]);
  return index;
}

function setTimeout(callback, delay) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var index = allocateCallback(callback, true);
  pendingOperations.push([3, document.reference, stringIndex("timerOnce"), [
    encode(delay), encode(index)
  ]]);
  return index;
}

function GuestStorage(kind) {
  this.kind = kind;
}

GuestStorage.prototype.getItem = function (name) {
  return immediate([3, document.reference, stringIndex("storageGet"), [
    encode(this.kind), encode(String(name))
  ]]);
};

GuestStorage.prototype.setItem = function (name, value) {
  immediate([3, document.reference, stringIndex("storageSet"), [
    encode(this.kind), encode(String(name)), encode(String(value))
  ]]);
};

GuestStorage.prototype.removeItem = function (name) {
  immediate([3, document.reference, stringIndex("storageDelete"), [
    encode(this.kind), encode(String(name))
  ]]);
};

GuestStorage.prototype.listen = function (name, callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var index = allocateCallback(callback, false);
  immediate([3, document.reference, stringIndex("storageListen"), [
    encode(this.kind), encode(String(name)), encode(index)
  ]]);
};

function resolved(value) {
  return {
    then: function (callback) {
      var next = callback(value);
      return next && typeof next.then === "function" ? next : resolved(next);
    }
  };
}

/* Resources are already inside the Wasm artifact. This deliberately tiny
   fetch keeps the familiar response/text shape without promises or a host
   round trip, and cannot address anything outside the build-owned table. */
function fetch(url) {
  var source = RUNTIME_RESOURCES.files[url] ||
    (url.slice(0, 2) === "./" ? RUNTIME_RESOURCES.files[url.slice(2)] : undefined);
  return resolved({
    ok: source !== undefined,
    status: source === undefined ? 404 : 200,
    text: function () {
      if (source !== undefined && typeof source !== "string") {
        throw new TypeError("resource is not text");
      }
      return resolved(source === undefined ? "" : source);
    },
    arrayBuffer: function () {
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
    if (/\s/.test(source[at])) { at = cssSpace(source, at); continue; }
    if (source.slice(at, at + 2) !== "/*") break;
    var end = source.indexOf("*/", at + 2);
    if (end < 0) throw new SyntaxError("CSS comment is incomplete at " + at);
    comments.push(source.slice(at + 2, end));
    at = end + 2;
  }
  return { at: at, comments: comments };
}

function cssParts(value) {
  var result = [], start = 0, depth = 0, quote = "";
  for (var index = 0; index <= value.length; index++) {
    var character = value[index] || " ";
    if (quote) {
      if (character === "\\") index++;
      else if (character === quote) quote = "";
    } else if (character === "\"" || character === "'") quote = character;
    else if (character === "(") depth++;
    else if (character === ")") {
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
  var top = parts[0], right = parts[1] || top;
  var bottom = parts[2] || top, left = parts[3] || right;
  return [
    [property + "-top", top], [property + "-right", right],
    [property + "-bottom", bottom], [property + "-left", left]
  ];
}

function cssBorder(value) {
  if (value === "0" || value === "none") {
    return ["top", "right", "bottom", "left"].map(function (side) {
      return ["border-" + side + (value === "0" ? "-width" : "-style"), value];
    });
  }
  var parts = cssParts(value);
  if (parts.length !== 3 || !/^\d/.test(parts[0]) ||
      !/^(?:solid|dashed|dotted|double|none)$/.test(parts[1])) {
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
  if (parts.length !== 3 || !/^\d/.test(parts[0]) ||
      !/^(?:solid|dashed|dotted|double|none)$/.test(parts[1])) {
    throw new SyntaxError(property + " shorthand is not understood: " + value);
  }
  return [
    ["border-" + side + "-width", parts[0]],
    ["border-" + side + "-style", parts[1]],
    ["border-" + side + "-color", parts[2]]
  ];
}

function cssRadius(value) {
  var parts = cssParts(value);
  if (!parts.length || parts.length > 4) throw new SyntaxError("border radius is not understood");
  return [
    ["border-top-left-radius", parts[0]],
    ["border-top-right-radius", parts[1] || parts[0]],
    ["border-bottom-right-radius", parts[2] || parts[0]],
    ["border-bottom-left-radius", parts[3] || parts[1] || parts[0]]
  ];
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
  if (property === "border-color") return ["top", "right", "bottom", "left"].map(
    function (side) { return ["border-" + side + "-color", value]; }
  );
  if (property === "inset") return cssEdges("", value).map(function (entry) {
    return [entry[0].slice(1), entry[1]];
  });
  return [[property, value]];
}

function cssTokens(value) {
  var tokens = [], at = 0;
  while (at < value.length) {
    if (/\s/.test(value[at])) {
      at = cssSpace(value, at);
      if (tokens.length && tokens[tokens.length - 1][0] !== 0) tokens.push([0]);
      continue;
    }
    var rest = value.slice(at), match;
    if (value.slice(at, at + 2) === "/*") {
      var commentEnd = value.indexOf("*/", at + 2);
      if (commentEnd < 0) throw new SyntaxError("CSS value comment is incomplete at " + at);
      tokens.push([9, value.slice(at + 2, commentEnd)]);
      at = commentEnd + 2;
    } else
    if (value[at] === "\"" || value[at] === "'") {
      var quote = value[at++], text = "";
      while (at < value.length && value[at] !== quote) {
        if (value[at] === "\\") {
          if (++at >= value.length) throw new SyntaxError("CSS string escape is incomplete");
        }
        text += value[at++];
      }
      if (value[at++] !== quote) throw new SyntaxError("CSS string is incomplete");
      tokens.push([4, text]);
    } else if ((match = /^#([0-9a-f]{3,8})\b/i.exec(rest))) {
      tokens.push([3, match[1]]); at += match[0].length;
    } else if ((match = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[a-z]+|%)?/i.exec(rest))) {
      tokens.push([2, match[0]]); at += match[0].length;
    } else if ((match = /^(--?[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)/i.exec(rest))) {
      at += match[0].length;
      if (value[at] === "(") { tokens.push([7, match[0]]); at++; }
      else tokens.push([1, match[0]]);
    } else if (value[at] === ",") { tokens.push([5]); at++; }
    else if (value[at] === "/") { tokens.push([6]); at++; }
    else if (value[at] === ")") { tokens.push([8]); at++; }
    else throw new SyntaxError("CSS value token is not understood at " + at);
  }
  if (tokens.length && tokens[tokens.length - 1][0] === 0) tokens.pop();
  return tokens;
}

function cssValueTree(value) {
  var tokens = cssTokens(value), at = 0;

  function grouped(items, separator, code) {
    var groups = [], group = [];
    items.forEach(function (item) {
      if (item.separator === separator) { groups.push(group); group = []; }
      else group.push(item);
    });
    groups.push(group);
    if (groups.length === 1) return null;
    return [10, code, groups.map(valueList)];
  }

  function valueList(items) {
    while (items.length && items[0].separator === " ") items.shift();
    while (items.length && items[items.length - 1].separator === " ") items.pop();
    var result = grouped(items, ",", 1) || grouped(items, "/", 2) ||
      grouped(items, " ", 0);
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
      if (token[0] === 7) items.push([7, token[1], read(true)]);
      else if (token[0] === 0) {
        if (items.length && !items[items.length - 1].separator) items.push({ separator: " " });
      } else if (token[0] === 5) {
        while (items.length && items[items.length - 1].separator === " ") items.pop();
        items.push({ separator: "," });
      } else if (token[0] === 6) {
        while (items.length && items[items.length - 1].separator === " ") items.pop();
        items.push({ separator: "/" });
      } else items.push(token);
    }
    if (end) throw new SyntaxError("CSS function is incomplete");
    return valueList(items);
  }

  return read(false);
}

function parseCss(source) {
  var rules = [], at = 0;
  while (at < source.length) {
    var trivia = cssTrivia(source, at);
    at = trivia.at;
    trivia.comments.forEach(function (comment) { rules.push({ comment: comment }); });
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
        declarations.push({ comment: comment });
      });
      if (source[at] === "}") { at++; break; }
      var propertyMatch = /^(--?[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)\s*:/i.exec(source.slice(at));
      if (!propertyMatch) throw new SyntaxError("CSS declaration is not understood at " + at);
      var property = propertyMatch[1];
      at += propertyMatch[0].length;
      var start = at, depth = 0, quote = "";
      while (at < source.length) {
        var character = source[at];
        if (quote) {
          if (character === "\\") at++;
          else if (character === quote) quote = "";
        } else if (character === "\"" || character === "'") quote = character;
        else if (character === "(") depth++;
        else if (character === ")") {
          if (!depth) throw new SyntaxError("CSS function closes without opening");
          depth--;
        } else if (!depth && (character === ";" || character === "}")) break;
        at++;
      }
      if (quote || depth || at >= source.length) throw new SyntaxError("CSS declaration is incomplete");
      var value = source.slice(start, at).trim(), important = false;
      if (/\s*!important$/i.test(value)) {
        important = true; value = value.replace(/\s*!important$/i, "").trim();
      }
      if (!value) throw new SyntaxError("CSS declaration value is empty");
      try {
        canonicalCss(property, value).forEach(function (entry) {
          var structured = entry[0] === "background" || entry[0] === "background-image";
          declarations.push({ property: entry[0], tokens: structured ? null : cssTokens(entry[1]),
            value: structured ? cssValueTree(entry[1]) : null,
            important: important });
        });
      } catch (error) {
        throw new SyntaxError(property + ": " + value + ": " + error.message);
      }
      if (source[at] === ";") at++;
      else { at++; break; }
    }
    rules.push({ selector: selector, declarations: declarations });
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
    var fonts = [], fontName;
    if (includeFonts) {
      for (fontName in FONT_RESOURCES) fonts.push(FONT_RESOURCES[fontName]);
    }
    writer.uint(fonts.length + rules.length);
    fonts.forEach(function (font) {
      writer.byte(2);
      writer.text(font.family); writer.text(font.style);
      writer.text(font.weight); writer.text(font.display);
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
            if (node[0] >= 1 && node[0] <= 4 || node[0] === 9) writer.text(node[1]);
            else if (node[0] === 7) { writer.text(node[1]); writeValue(node[2]); }
            else if (node[0] === 10) {
              writer.byte(node[1]); writer.uint(node[2].length); node[2].forEach(writeValue);
            } else throw new TypeError("CSS value node is not understood");
          }(declaration.value));
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
  } catch (error) {
    throw new SyntaxError("CSS " + phase + " failed: " + String(error));
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
    var attributes = value[1], names = [];
    for (var name in attributes) names.push(name);
    writer.uint(names.length);
    names.forEach(function (name) { writer.text(name); writer.text(attributes[name]); });
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
  get: function () {
    if (!this._head) {
      var result = immediate([1, this.reference, stringIndex("head")]);
      this._head = new GuestElement(result[1]);
    }
    return this._head;
  }
});

Object.defineProperty(GuestDocument.prototype, "body", {
  get: function () {
    if (!this._body) {
      var result = immediate([1, this.reference, stringIndex("body")]);
      this._body = new GuestElement(result[1]);
    }
    return this._body;
  }
});

Object.defineProperty(GuestDocument.prototype, "hidden", {
  get: function () {
    return immediate([1, this.reference, stringIndex("hidden")]);
  }
});

var documentReference = immediate([0, null, null]);
var document = new GuestDocument(documentReference[1]);
globalThis.__wwcReportError = function() {};
var navigator = {};
Object.defineProperty(navigator, "platform", {
  get: function () {
    return immediate([1, document.reference, stringIndex("platform")]);
  }
});
var localStorage = new GuestStorage("local");
var sessionStorage = new GuestStorage("session");
var routeCallbacks = [];
var location = {};
Object.defineProperty(location, "pathname", {
  get: function () {
    return immediate([3, document.reference, stringIndex("routeGet"), []]);
  }
});

function addEventListener(type, callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  if (type === "blur" || type === "focus") {
    var eventIndex = allocateCallback(callback, false);
    immediate([3, document.reference, stringIndex("windowListen"), [
      encode(type), encode(eventIndex)
    ]]);
    return;
  }
  if (type !== "hashchange") throw new TypeError("global event is not available");
  routeCallbacks.push(callback);
  if (routeCallbacks.length === 1) {
    var index = allocateCallback(function () {
      routeCallbacks.slice().forEach(function (listener) {
        listener({ type: "hashchange" });
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


// Full-engine additions layered over the canonical wasm-web-container guest
// runtime. These are browser-shaped guest objects, never browser-realm objects.
globalThis.document = document;
globalThis.window = globalThis.self = globalThis;
document.defaultView = globalThis;
function HostWindow() {}
Object.defineProperty(HostWindow, Symbol.hasInstance, {
  value: function (candidate) { return candidate === globalThis; }
});
globalThis.Window = HostWindow;
globalThis.Node = GuestObject;
globalThis.Element = globalThis.HTMLElement = GuestElement;
globalThis.Document = GuestDocument;
Object.defineProperty(GuestDocument.prototype, "documentElement", {
  get: function () {
    if (!this._documentElement) {
      var result = immediate([1, this.reference, stringIndex("documentElement")]);
      this._documentElement = nodeForReference(result[1]);
    }
    return this._documentElement;
  }
});
globalThis.navigator = { userAgent: "QuickJS", platform: "Linux", vendor: "", maxTouchPoints: 0 };
["devicePixelRatio", "innerHeight", "innerWidth", "pageXOffset", "pageYOffset"].forEach(
  function (name) {
    if (globalThis.__microQuickJS) {
      globalThis[name] = immediate([1, document.reference, stringIndex(name)]);
    } else {
      Object.defineProperty(globalThis, name, {
        get: function () { return immediate([1, document.reference, stringIndex(name)]); }
      });
    }
  }
);
globalThis.visualViewport = null;
globalThis.scrollBy = function (x, y) {
  hostCall(document.reference, "scrollBy", [Math.round(x), Math.round(y)]);
};
var runtimePerformanceNow = globalThis.__microQuickJS && globalThis.performance &&
  globalThis.performance.now;
var runtimePerformanceOrigin = runtimePerformanceNow ? runtimePerformanceNow() : 0;
var runtimeEpochOrigin = hostCall(document.reference, "dateNow", []);
Date.now = function () {
  return runtimePerformanceNow ? runtimeEpochOrigin +
    runtimePerformanceNow() - runtimePerformanceOrigin :
    hostCall(document.reference, "dateNow", []);
};
globalThis.performance = {
  now: runtimePerformanceNow ||
    function () { return hostCall(document.reference, "performanceNow", []); }
};

var projectedClasses = Object.create(null), projectedClassCount = 0;
function projectClassToken(token) {
  if (/^[a-z_][a-z0-9_-]*$/i.test(token)) return token;
  return projectedClasses[token] ||
    (projectedClasses[token] = "wwc-c" + (++projectedClassCount));
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
    // Each returned host reference carries a lease. Reusing the existing
    // identity means no new finalizer token will be created for this one.
    releaseHostReferenceLease(reference);
    return known;
  }
  if (entry) delete guestNodes[reference];
  var nodeType = immediate([1, reference, stringIndex("nodeType")]);
  var node = rememberNode(nodeType === 1 ? new GuestElement(reference) : new GuestObject(reference));
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
  get: function () {
    return immediate([1, this.reference, stringIndex("nodeType")]);
  }
});
Object.defineProperty(GuestObject.prototype, "nodeName", {
  get: function () {
    return immediate([1, this.reference, stringIndex("nodeName")]);
  }
});
GuestObject.prototype.contains = function (node) {
  return immediate([3, this.reference, stringIndex("contains"), [encode(node)]]);
};
GuestObject.prototype.closest = function (selector) {
  var result = immediate([3, this.reference, stringIndex("closest"), [
    encode(String(selector))
  ]]);
  return result === null ? null : nodeForReference(result[1]);
};
["nodeValue", "textContent"].forEach(function (name) {
  Object.defineProperty(GuestObject.prototype, name, {
    get: function () {
      return immediate([1, this.reference, stringIndex(name)]);
    },
    set: function (value) {
      pendingOperations.push([2, this.reference, stringIndex(name), encode(String(value))]);
    }
  });
});
function childrenOf(node) {
  return node._guestChildren || (node._guestChildren = []);
}
function parentOf(node) { return node._guestParent || null; }
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
var guestCollectionPending = false, guestCleanupPressure = 0;
function requestCleanupOpportunity(callback) {
  var index = allocateCallback(callback, true);
  hostCall(document.reference, "cleanupOpportunity", [1000, index]);
}
globalThis.reconcileGuestConnectivity = function () {
  var bytes = hostCall(document.reference, "detachedRoots", []), detached = 0;
  var subtreeSize = function (node) {
    var size = 1, children = childrenOf(node);
    for (var index = 0; index < children.length; index++) size += subtreeSize(children[index]);
    return size;
  };
  for (var at = 0; at + 3 < bytes.length; at += 4) {
    var reference = bytes[at] | bytes[at + 1] << 8 |
      bytes[at + 2] << 16 | bytes[at + 3] << 24;
    var entry = guestNodes[reference], node = entry && entry.deref();
    if (!node || !parentOf(node)) continue;
    var root = node, guard = 0;
    while (parentOf(root) && guard++ < 4096) root = parentOf(root);
    if (root === document.head || root === document.body || root === document.documentElement) {
      detached += subtreeSize(node);
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
  childNodes: { get: function () { return childrenOf(this); } },
  parentNode: { get: function () { return parentOf(this); } },
  parentElement: { get: function () {
    var parent = parentOf(this);
    return parent instanceof GuestElement ? parent : null;
  } },
  firstChild: { get: function () { return childrenOf(this)[0] || null; } },
  lastChild: { get: function () {
    var children = childrenOf(this);
    return children.length ? children[children.length - 1] : null;
  } },
  nextSibling: { get: function () {
    var parent = parentOf(this);
    if (!parent) return null;
    var siblings = childrenOf(parent);
    return siblings[siblings.indexOf(this) + 1] || null;
  } },
  previousSibling: { get: function () {
    var parent = parentOf(this);
    if (!parent) return null;
    var siblings = childrenOf(parent);
    return siblings[siblings.indexOf(this) - 1] || null;
  } }
});
Object.defineProperty(GuestElement.prototype, "children", {
  get: function () {
    return childrenOf(this).filter(function (node) { return node instanceof GuestElement; });
  }
});
Object.defineProperty(GuestElement.prototype, "contentEditable", {
  get: function () { return this.getAttribute("contenteditable") || "inherit"; },
  set: function (value) { this.setAttribute("contenteditable", String(value)); }
});
Object.defineProperty(GuestElement.prototype, "className", {
  get: function () { return this.getAttribute("class") || ""; },
  set: function (value) { this.setAttribute("class", String(value)); }
});

function GuestSelection(reference) {
  GuestObject.call(this, reference);
}
GuestSelection.prototype = Object.create(GuestObject.prototype);
["anchorOffset", "focusOffset", "isCollapsed", "rangeCount"].forEach(function (name) {
  Object.defineProperty(GuestSelection.prototype, name, {
    get: function () { return immediate([1, this.reference, stringIndex(name)]); }
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
      rect[rectProperties[property]] = (bytes[at] | bytes[at + 1] << 8 |
        bytes[at + 2] << 16 | bytes[at + 3] << 24) / 64;
    }
    rects.push(rect);
  }
  return rects;
}
GuestElement.prototype.getBoundingClientRect = function () {
  return measuredRects(this, "measureRect")[0];
};
function clientRectsFor(object) { return measuredRects(object, "measureClientRects"); }
GuestElement.prototype.getClientRects = function () { return clientRectsFor(this); };
GuestElement.prototype.focus = function () {
  hostCall(this.reference, "focus", []);
};
GuestElement.prototype.select = function () {
  hostCall(this.reference, "select", []);
};
GuestElement.prototype.querySelector = function (selector) {
  var result = immediate([3, this.reference, stringIndex("querySelector"), [
    encode(String(selector))
  ]]);
  return result === null ? null : nodeForReference(result[1]);
};
GuestElement.prototype.querySelectorAll = function (selector) {
  var bytes = hostCall(this.reference, "querySelectorAllReferences", [String(selector)]);
  var length = bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;
  var nodes = [];
  for (var index = 0; index < length; index++) {
    var at = 4 + index * 4;
    var reference = bytes[at] | bytes[at + 1] << 8 |
      bytes[at + 2] << 16 | bytes[at + 3] << 24;
    nodes.push(nodeForReference(reference));
  }
  return nodes;
};
GuestElement.prototype.hasAttribute = function (name) {
  return hostCall(this.reference, "hasAttribute", [String(name)]);
};
GuestRange.prototype.getClientRects = function () { return clientRectsFor(this); };
GuestRange.prototype.getBoundingClientRect = function () {
  return measuredRects(this, "measureRect")[0];
};
["clientHeight", "clientWidth", "offsetHeight", "offsetWidth", "scrollHeight", "scrollWidth",
  "scrollLeft", "scrollTop"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function () { return immediate([1, this.reference, stringIndex(name)]); },
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
    get: function () {
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
  var result = immediate([3, this.reference, stringIndex("createTextNode"), [encode(String(text))]]);
  return rememberNode(new GuestObject(result[1]));
};
GuestDocument.prototype.createRange = function () {
  var result = immediate([3, this.reference, stringIndex("createRange"), []]);
  return new GuestRange(result[1]);
};
GuestDocument.prototype.hasFocus = function () {
  return immediate([3, this.reference, stringIndex("hasFocus"), []]);
};
Object.defineProperty(GuestDocument.prototype, "activeElement", {
  get: function () {
    var result = immediate([1, this.reference, stringIndex("activeElement")]);
    return result === null ? null : nodeForReference(result[1]);
  }
});
globalThis.getSelection = function () { return document.getSelection(); };
function GuestComputedStyle(reference) {
  GuestObject.call(this, reference);
}
GuestComputedStyle.prototype = Object.create(GuestObject.prototype);
["direction", "height", "overflow", "paddingBottom", "paddingTop", "position", "whiteSpace",
  "width"].forEach(function (name) {
  Object.defineProperty(GuestComputedStyle.prototype, name, {
    get: function () { return immediate([1, this.reference, stringIndex(name)]); }
  });
});
globalThis.getComputedStyle = function (element) {
  var result = immediate([3, document.reference, stringIndex("getComputedStyle"), [
    encode(element)
  ]]);
  return new GuestComputedStyle(result[1]);
};

function GuestStylesheetNode() {
  this.parentNode = null;
  this._text = "";
}
function projectStylesheet(source) {
  var output = "", at = 0;
  // This guest does not project synthetic cursor animation or print-only UI.
  var pattern = /(?:@(?:-webkit-)?keyframes\s+[-_a-z0-9]+|@media\s+print)\s*\{/ig;
  while (true) {
    pattern.lastIndex = at;
    var match = pattern.exec(source);
    if (!match) {
      output += source.slice(at);
      output = output.replace(/\.([^\d\s.#:\[\]{};>+~(),][^\s.#:\[\]{};>+~(),]*)/g,
        function (_, token) {
          return "." + projectClassToken(token);
        });
      return omitCssUrls(output);
    }
    output += source.slice(at, match.index);
    var cursor = pattern.lastIndex, depth = 1, quote = "";
    while (cursor < source.length && depth) {
      var character = source[cursor++];
      if (quote) {
        if (character === "\\") cursor++;
        else if (character === quote) quote = "";
      } else if (character === '"' || character === "'") quote = character;
      else if (character === "/" && source[cursor] === "*") {
        var end = source.indexOf("*/", cursor + 1);
        if (end < 0) throw new SyntaxError("CSS at-rule comment is incomplete");
        cursor = end + 2;
      } else if (character === "{") depth++;
      else if (character === "}") depth--;
    }
    if (depth) throw new SyntaxError("CSS at-rule block is incomplete");
    at = cursor;
  }
}
function omitCssUrls(source) {
  var output = "", at = 0, pattern = /url\s*\(/ig;
  while (true) {
    pattern.lastIndex = at;
    var match = pattern.exec(source);
    if (!match) return output + source.slice(at);
    output += source.slice(at, match.index) + "none";
    var cursor = pattern.lastIndex, depth = 1, quote = "";
    while (cursor < source.length && depth) {
      var character = source[cursor++];
      if (quote) {
        if (character === "\\") cursor++;
        else if (character === quote) quote = "";
      } else if (character === '"' || character === "'") quote = character;
      else if (character === "(") depth++;
      else if (character === ")") depth--;
    }
    if (depth) throw new SyntaxError("CSS url() is incomplete");
    at = cursor;
  }
}
Object.defineProperty(GuestStylesheetNode.prototype, "textContent", {
  get: function () { return this._text; },
  set: function (value) {
    this._text = String(value);
    if (this.parentNode) document.installStylesheet(projectStylesheet(this._text));
  }
});
GuestStylesheetNode.prototype.setAttribute = function () {
  throw new TypeError("stylesheet attributes are not available");
};
GuestDocument.prototype.createElement = function (tag) {
  if (String(tag).toLowerCase() === "style") return new GuestStylesheetNode();
  var result = immediate([3, this.reference, stringIndex("createElement"), [encode(String(tag))]]);
  return nodeForReference(result[1]);
};
GuestDocument.prototype.getElementById = function (id) {
  var result = immediate([3, this.reference, stringIndex("getElementById"), [encode(String(id))]]);
  return result === null ? null : nodeForReference(result[1]);
};

function inlineCssBytes(source) {
  return encodeCss(".wwc-inline { " + source + " }");
}
Object.defineProperty(GuestStyle.prototype, "cssText", {
  get: function () {
    return immediate([1, this.reference, stringIndex("cssText")]);
  },
  set: function (value) {
    this._cssText = String(value);
    pendingOperations.push([3, this.reference, stringIndex("replaceDeclarations"), [
      encode(inlineCssBytes(this._cssText))
    ]]);
  }
});
GuestStyle.prototype.setProperty = function (name, value, priority) {
  var suffix = priority ? " !" + priority : "";
  pendingOperations.push([3, this.reference, stringIndex("applyDeclarations"), [
    encode(inlineCssBytes(String(name) + ": " + String(value) + suffix + ";"))
  ]]);
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
    var reference = bytes[at] | bytes[at + 1] << 8 |
      bytes[at + 2] << 16 | bytes[at + 3] << 24;
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
  var length = hostGet(batchReference, "length"), records = [], changedParents = [];
  for (var index = 0; index < length; index++) {
    var result = hostCall(batchReference, "item", [index]);
    var reference = result[1], type = hostGet(reference, "type");
    var targetResult = hostGet(reference, "target");
    var record = { type: type, target: nodeForReference(targetResult[1]) };
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
      var values = record.target._attributeValues ||
        (record.target._attributeValues = Object.create(null));
      if (attribute === null) delete values[record.attributeName];
      else values[record.attributeName] = attribute;
    }
    records.push(record);
    releaseHostReferenceLease(reference);
  }
  // Mutation records describe intermediate edits, but their callback observes
  // the browser's final tree. Reconcile each affected parent once so native
  // editing and drag operations cannot leave the guest between two records.
  changedParents.forEach(synchronizeGuestChildren);
  if (batchToken) releaseHostReference(batchToken);
  else releaseHostReferenceLease(batchReference);
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
  var flags = (options.attributes ? 1 : 0) |
    (options.attributeOldValue ? 2 : 0) |
    (options.characterData ? 4 : 0) |
    (options.characterDataOldValue ? 8 : 0) |
    (options.subtree ? 16 : 0);
  var self = this, callbackIndex = allocateCallback(function (batch) {
    self.callback(readMutationBatch(batch.reference, batch._hostReference), self);
  }, false);
  this.callbackIndex = callbackIndex;
  var result = immediate([3, document.reference, stringIndex("mutationObserve"), [
    encode(target), encode(flags), encode(callbackIndex)
  ]]);
  this.reference = result[1];
  this._hostReference = hostReference(this.reference);
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
EmptyObserver.prototype.observe = EmptyObserver.prototype.unobserve =
  EmptyObserver.prototype.disconnect = function () {};
EmptyObserver.prototype.takeRecords = function () { return []; };
// Native contenteditable behavior mutates the host tree after the guest event
// handler returns. Mirror those browser-owned edits on the normal microtask so
// the guest tree has the same ownership and detached nodes become collectible.
globalThis.MutationObserver = GuestMutationObserver;
globalThis.ResizeObserver = EmptyObserver;
globalThis.getComputedStyle = function () {
  return { direction: "ltr", whiteSpace: "pre", getPropertyValue: function () { return ""; } };
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
  var token = { active: true, index: -1 };
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
  var token = { active: true, index: -1 };
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
  return { matches: false, addListener: function () {}, removeListener: function () {} };
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
      timeRemaining: function () {
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
  log: reportConsole, info: reportConsole, warn: reportConsole, error: reportConsole
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
    get: function () { return immediate([1, this.reference, stringIndex(name)]); },
    set: function (value) {
      immediate([2, this.reference, stringIndex(name), encode(value)]);
    }
  });
});
["clipboardData", "dataTransfer"].forEach(function (name) {
  Object.defineProperty(GuestEvent.prototype, name, {
    get: function () {
      var result = immediate([1, this.reference, stringIndex(name)]);
      return result === null ? null : new GuestDataTransfer(result[1]);
    }
  });
});
Object.defineProperty(GuestEvent.prototype, "relatedTarget", {
  get: function () {
    var result = immediate([1, this.reference, stringIndex("relatedTarget")]);
    return result === null ? null : nodeForReference(result[1]);
  }
});

// Window events are represented by the canonical document service. Keep
// listener identity and removal in the guest so the host only needs to emit a
// small, auditable set of ambient browser signals.
var windowListeners = [];
globalThis.addEventListener = function (type, callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var record = { type: type, callback: callback, active: true };
  var callbackIndex = allocateCallback(function (event) {
    if (record.active) record.callback(event || { type: type });
  }, false);
  immediate([3, document.reference, stringIndex("windowListen"), [
    encode(type), encode(callbackIndex)
  ]]);
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
  var state = { active: true, callback: new WeakRef(callback) };
  callbackStates[index] = state;
  callbacks[index] = function (event) {
    var current = state.callback.deref();
    if (state.active && current) current(event);
    else releaseCallback(index);
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
  records.push({ type: type, callback: callback, index: index, capture: capture });
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
// Pointer selections are owned by the document after they begin. Use the same
// listener bookkeeping as elements so temporary drag listeners are removed at
// mouseup, just as they are in a browser DOM.
GuestDocument.prototype.addEventListener = GuestElement.prototype.addEventListener;
GuestDocument.prototype.removeEventListener = GuestElement.prototype.removeEventListener;

Object.defineProperty(GuestElement.prototype, "tabIndex", {
  set: function (value) {
    pendingOperations.push([2, this.reference, stringIndex("tabIndex"), encode(value)]);
  }
});
["value", "checked"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function () { return immediate([1, this.reference, stringIndex(name)]); },
    set: function (value) {
      immediate([2, this.reference, stringIndex(name),
        encode(name === "checked" ? Boolean(value) : String(value))]);
    }
  });
});
["change", "click", "keydown", "keyup"].forEach(function (type) {
  Object.defineProperty(GuestElement.prototype, "on" + type, {
    get: function () { return this["_guestOn" + type] || null; },
    set: function (callback) {
      var previous = this["_guestOn" + type];
      if (previous) this.removeEventListener(type, previous);
      this["_guestOn" + type] = typeof callback === "function" ? callback : null;
      if (this["_guestOn" + type]) this.addEventListener(type, this["_guestOn" + type]);
    }
  });
});
Object.defineProperty(GuestElement.prototype, "ownerDocument", {
  get: function () { return document; }
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
  pendingOperations.push([3, this.reference, stringIndex("insertBefore"), [
    encode(child), encode(next)
  ]]);
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

// Attribute reads are common during rendering. Mirror values in the guest and
// send only mutations across the boundary.
Object.defineProperty(GuestElement.prototype, "attributes", {
  get: function () {
    var values = this._attributeValues || (this._attributeValues = Object.create(null));
    return Object.keys(values).map(function (name) {
      return { name: name, value: values[name] };
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
  pendingOperations.push([3, this.reference, stringIndex("setAttribute"), [
    encode(String(name)), encode(text)
  ]]);
};
GuestElement.prototype.removeAttribute = function (name) {
  var values = this._attributeValues || (this._attributeValues = Object.create(null));
  delete values[name];
  pendingOperations.push([3, this.reference, stringIndex("removeAttribute"), [
    encode(String(name))
  ]]);
};
function GuestClassList(element) { this.element = element; }
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
  var present = this.contains(token), next = force === undefined ? !present : Boolean(force);
  if (next && !present) this.add(token);
  if (!next && present) this.remove(token);
  return next;
};
Object.defineProperty(GuestElement.prototype, "classList", {
  get: function () {
    return this._guestClassList || (this._guestClassList = new GuestClassList(this));
  }
});

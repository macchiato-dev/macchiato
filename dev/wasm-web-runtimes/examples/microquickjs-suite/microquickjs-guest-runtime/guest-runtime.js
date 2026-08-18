/* `print` is the unchanged MicroQuickJS native slot used by this build. */
var bridge = print;

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
  this._hostReference = new HostReference(reference);
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
  if (source === undefined && typeof globalThis.__wwcFetchMissing === "function") {
    return globalThis.__wwcFetchMissing(String(url));
  }
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
/* Exercise the native lease finalizer without leaking a test concern into the
   otherwise ordinary application source. */
(function () { document.createElement("span"); })();
gc();

function dispatch(message) {
  var callbackIndex = Math.floor(message / 1048576);
  var eventReference = message % 1048576 - 1;
  var callback = callbacks[callbackIndex];
  if (callback) callback(eventReference < 0 ? undefined : new GuestEvent(eventReference));
  flush();
}

function attributes(source) {
  var result = Object.create(null);
  while (source) {
    var match = /^\s+([A-Za-z][A-Za-z-]*)="([^"]*)"/.exec(source);
    if (!match) throw new SyntaxError("HTML attribute syntax is not understood");
    result[match[1]] = match[2];
    source = source.slice(match[0].length);
  }
  return result;
}

function addMetadata() {
  var viewport = document.createElement("meta");
  viewport.setAttribute("name", "viewport");
  viewport.setAttribute("content", "width=device-width, initial-scale=1");
  var title = document.createElement("title");
  title.textContent = DOCUMENT_TITLE;
  document.head.append(viewport, title);
}

/* This deliberately tiny parser accepts the formatted HTML emitted by the
   build and rejects every line it cannot account for. It is not an HTML5
   error-recovery engine and does not claim to be one. */
function loadDocument(source) {
  var stack = [];
  var lines = source.split("\n");
  for (var index = 0; index < lines.length; index++) {
    var line = lines[index].trim();
    if (!line) continue;
    if (line === "<!doctype html>") continue;
    var comment = /^<!--([\s\S]*)-->$/.exec(line);
    if (comment) {
      var commentParent = stack.length ? stack[stack.length - 1].node : null;
      if (!commentParent) throw new SyntaxError("HTML comment has no parent");
      commentParent.append(document.createComment(comment[1]));
      continue;
    }
    var closing = /^<\/([a-z][a-z0-9-]*)>$/.exec(line);
    if (closing) {
      var opened = stack.pop();
      if (!opened || opened.tag !== closing[1]) throw new SyntaxError("HTML tags do not balance");
      continue;
    }
    var opening = /^<([a-z][a-z0-9-]*)([^>]*)>$/.exec(line);
    if (opening) {
      var tag = opening[1];
      var attrs = attributes(opening[2]);
      if (tag === "html") { stack.push({ tag: tag, node: null }); continue; }
      if (tag === "head") { stack.push({ tag: tag, node: document.head }); continue; }
      if (tag === "body") { stack.push({ tag: tag, node: document.body }); continue; }
      if (tag === "link") {
        if (attrs.rel !== "stylesheet") {
          throw new SyntaxError("stylesheet resource is not allowed");
        }
        var stylesheet;
        fetch(attrs.href).then(function (response) {
          if (!response.ok) throw new Error("stylesheet resource was not found");
          return response.text();
        }).then(function (source) { stylesheet = source; });
        document.installStylesheet(stylesheet);
        continue;
      }
      if (tag === "script") {
        if (attrs.src !== APPLICATION_SCRIPT) throw new SyntaxError("script resource is not allowed");
        load(attrs.src);
        stack.push({ tag: tag, node: null });
        continue;
      }
      var svg = tag === "svg" || stack.length && stack[stack.length - 1].svg;
      var node = svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) :
        document.createElement(tag);
      for (var name in attrs) node.setAttribute(name, attrs[name]);
      var parent = stack.length ? stack[stack.length - 1].node : null;
      if (!parent) throw new SyntaxError("HTML element has no parent");
      parent.append(node);
      stack.push({ tag: tag, node: node, svg: svg });
      continue;
    }
    if (!stack.length || !stack[stack.length - 1].node || /^</.test(line)) {
      throw new SyntaxError("HTML line " + (index + 1) + " is not understood: " + line);
    }
    stack[stack.length - 1].node.textContent = line;
  }
  if (stack.length) throw new SyntaxError("HTML has unclosed tags");
}

addMetadata();
fetch("index.html").then(function (response) {
  if (!response.ok) throw new Error("index.html was not found");
  return response.text();
}).then(function (source) {
  loadDocument(source);
  closeGuest();
});

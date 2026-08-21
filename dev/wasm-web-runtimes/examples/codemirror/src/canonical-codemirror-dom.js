// Full-engine additions layered over the canonical wasm-web-container guest
// runtime. These are browser-shaped guest objects, never browser-realm objects.
globalThis.document = document;
globalThis.window = globalThis.self = globalThis;
globalThis.__wwcPostMessage = function (message) {
  pendingOperations.push([3, document.reference, stringIndex("postMessage"), [
    encode(String(message))
  ]]);
};
globalThis.__wwcReportError = function (message) {
  // Error reporting must survive a guest exception that prevents the normal
  // operation queue from reaching its next flush.
  immediate([3, document.reference, stringIndex("postMessage"), [
    encode("__wwcError:" + String(message))
  ]]);
};
document.defaultView = globalThis;
function HostWindow() {}
Object.defineProperty(HostWindow, Symbol.hasInstance, {
  value: function (candidate) { return candidate === globalThis; }
});
globalThis.Window = HostWindow;
var customElementDefinitions = Object.create(null);
var customElementNames = new WeakMap();
globalThis.customElements = {
  define: function (name, constructor) {
    name = String(name).toLowerCase();
    if (name.indexOf("-") < 1 || typeof constructor !== "function") {
      throw new TypeError("invalid custom element definition");
    }
    if (customElementDefinitions[name]) throw new TypeError("custom element is already defined");
    customElementDefinitions[name] = constructor;
    customElementNames.set(constructor, name);
  },
  get: function (name) { return customElementDefinitions[String(name).toLowerCase()]; },
  whenDefined: function (name) {
    return customElementDefinitions[String(name).toLowerCase()]
      ? Promise.resolve() : Promise.reject(new TypeError("custom element is not defined"));
  }
};
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
// Navigator identity is host-backed by the base runtime. UI libraries use it
// for browser behavior and to distinguish Command shortcuts from Emacs keys.
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
var runtimePerformanceNow = typeof hostNow === "function" ? hostNow :
  globalThis.__microQuickJS && globalThis.performance && globalThis.performance.now;
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
globalThis.DOMRect = function DOMRect(x, y, width, height) {
  this.x = this.left = Number(x) || 0;
  this.y = this.top = Number(y) || 0;
  this.width = Number(width) || 0;
  this.height = Number(height) || 0;
  this.right = this.left + this.width;
  this.bottom = this.top + this.height;
};
globalThis.DOMRectReadOnly = globalThis.DOMRect;

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
  get: function () {
    if (this._nodeType === undefined) {
      this._nodeType = immediate([1, this.reference, stringIndex("nodeType")]);
    }
    return this._nodeType;
  }
});
Object.defineProperty(GuestObject.prototype, "nodeName", {
  get: function () {
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
  var result = immediate([3, this.reference, stringIndex("closest"), [
    encode(String(selector))
  ]]);
  return result === null ? null : nodeForReference(result[1]);
};
Object.defineProperty(GuestObject.prototype, "nodeValue", {
  get: function () {
    if (this._nodeValue === undefined) {
      this._nodeValue = immediate([1, this.reference, stringIndex("nodeValue")]);
    }
    return this._nodeValue;
  },
  set: function (value) {
    this._nodeValue = String(value);
    pendingOperations.push([2, this.reference, stringIndex("nodeValue"), encode(this._nodeValue)]);
  }
});
Object.defineProperty(GuestObject.prototype, "textContent", {
  get: function () {
    if (this._nodeType === 3 && this._nodeValue !== undefined) return this._nodeValue;
    return immediate([1, this.reference, stringIndex("textContent")]);
  },
  set: function (value) {
    value = String(value);
    if (this._nodeType === 3) this._nodeValue = value;
    pendingOperations.push([2, this.reference, stringIndex("textContent"), encode(value)]);
  }
});
function childrenOf(node) {
  return node._guestChildren || (node._guestChildren = []);
}
function parentOf(node) { return node._guestParent || null; }
function setParent(node, parent) {
  node._guestParent = parent || null;
}
function guestNodeIsConnected(node) {
  var current = node, guard = 0;
  while (current && guard++ < 4096) {
    if (current === document.body || current === document.head ||
        current === document.documentElement) return true;
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
Object.defineProperty(GuestElement.prototype, "innerHTML", {
  set: function (value) {
    pendingOperations.push([2, this.reference, stringIndex("innerHTML"), encode(String(value))]);
  }
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
function GuestCanvasContext(reference) { GuestObject.call(this, reference); }
GuestCanvasContext.prototype = Object.create(GuestObject.prototype);
GuestElement.prototype.getContext = function (type) {
  var result = immediate([3, this.reference, stringIndex("getContext"), [encode(type)]]);
  return result === null ? null : new GuestCanvasContext(result[1]);
};
["height", "width"].forEach(function (name) {
  Object.defineProperty(GuestElement.prototype, name, {
    get: function () { return immediate([1, this.reference, stringIndex(name)]); }
  });
});
["fillStyle", "strokeStyle"].forEach(function (name) {
  Object.defineProperty(GuestCanvasContext.prototype, name, {
    set: function (value) {
      pendingOperations.push([2, this.reference, stringIndex(name), encode(value)]);
    }
  });
});
Object.defineProperty(GuestCanvasContext.prototype, "lineWidth", {
  set: function (value) {
    pendingOperations.push([2, this.reference, stringIndex("lineWidth"),
      encode(Math.round(Number(value) * 1024))]);
  }
});
["arc", "beginPath", "clearRect", "closePath", "fill", "fillRect", "lineTo",
  "moveTo", "restore", "rotate", "save", "scale", "stroke", "strokeRect",
  "translate"].forEach(function (name) {
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
GuestDocument.prototype.querySelector = function (selector) {
  return this.body.querySelector(selector);
};
GuestDocument.prototype.querySelectorAll = function (selector) {
  return this.body.querySelectorAll(selector);
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
["startContainer", "endContainer"].forEach(function (name) {
  Object.defineProperty(GuestRange.prototype, name, {
    get: function () {
      var result = hostGet(this.reference, name);
      return nodeForReference(result[1]);
    }
  });
});
["startOffset", "endOffset"].forEach(function (name) {
  Object.defineProperty(GuestRange.prototype, name, {
    get: function () { return hostGet(this.reference, name); }
  });
});
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
  // Synthetic cursor animation and print-only UI are supplied by the host
  // surface rather than represented in the compact stylesheet protocol.
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
  tag = String(tag).toLowerCase();
  var result = immediate([3, this.reference, stringIndex("createElement"), [encode(tag)]]);
  var constructor = customElementDefinitions[tag];
  var node;
  if (constructor) {
    constructingHostReference = result[1];
    try { node = new constructor(); }
    finally { constructingHostReference = null; }
  } else node = new GuestElement(result[1]);
  node = rememberNode(node);
  node._guestCustomElement = Boolean(constructor);
  node._nodeType = 1;
  node._nodeName = tag.toUpperCase();
  return node;
};
GuestDocument.prototype.createDocumentFragment = function () {
  var result = immediate([3, this.reference, stringIndex("createDocumentFragment"), []]);
  var node = rememberNode(new GuestElement(result[1]));
  node._nodeType = 11;
  node._nodeName = "#document-fragment";
  return node;
};
GuestDocument.prototype.getElementById = function (id) {
  var result = immediate([3, this.reference, stringIndex("getElementById"), [encode(String(id))]]);
  return result === null ? null : nodeForReference(result[1]);
};
GuestDocument.prototype.elementFromPoint = function (x, y) {
  var result = immediate([3, this.reference, stringIndex("elementFromPoint"), [
    encode(Math.round(Number(x))), encode(Math.round(Number(y)))
  ]]);
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
      // Browser editing changed this node outside the guest. Its previously
      // cached value is no longer authoritative; read the host value lazily.
      record.target._nodeValue = undefined;
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
function GuestIntersectionObserver(callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  this.callback = callback;
  this.active = true;
}
GuestIntersectionObserver.prototype.observe = function (target) {
  var observer = this;
  setTimeout(function () {
    if (observer.active) observer.callback([{ target: target, isIntersecting: true, intersectionRatio: 1 }], observer);
  }, 0);
};
GuestIntersectionObserver.prototype.unobserve = function () {};
GuestIntersectionObserver.prototype.disconnect = function () { this.active = false; };
GuestIntersectionObserver.prototype.takeRecords = function () { return []; };
// Native contenteditable behavior mutates the host tree after the guest event
// handler returns. Mirror those browser-owned edits on the normal microtask so
// the guest tree has the same ownership and detached nodes become collectible.
globalThis.MutationObserver = GuestMutationObserver;
globalThis.ResizeObserver = EmptyObserver;
globalThis.IntersectionObserver = GuestIntersectionObserver;
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
  delay = Number.isFinite(delay) ? Math.max(0, Math.round(delay)) : 0;
  var token = { active: true, index: -1 };
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
  return { matches: false, media: "", onchange: null,
    addListener: function () {}, removeListener: function () {},
    addEventListener: function () {}, removeEventListener: function () {},
    dispatchEvent: function () { return true; } };
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
GuestEvent.prototype.getTargetRanges = function () {
  var result = hostCall(this.reference, "getTargetRanges", []);
  var list = new GuestObject(result[1]), ranges = [];
  var length = hostGet(list.reference, "length");
  for (var index = 0; index < length; index++) {
    var item = hostCall(list.reference, "item", [index]);
    ranges.push(new GuestRange(item[1]));
  }
  return ranges;
};

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
  // A browser EventTarget strongly retains its listeners until removal.
  var state = { active: true, callback: callback };
  callbackStates[index] = state;
  callbacks[index] = function (event) {
    var current = state.callback;
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
  if (child instanceof GuestStylesheetNode) {
    child.parentNode = this;
    document.installStylesheet(projectStylesheet(child.textContent));
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
  detachGuestNode(child);
  var children = childrenOf(this);
  var index = next === null ? children.length : children.indexOf(next);
  if (index < 0) throw new TypeError("reference node is not a child");
  children.splice(index, 0, child);
  setParent(child, this);
  if (guestNodeIsConnected(child)) notifyGuestConnection(child, true);
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
    if (guestNodeIsConnected(child)) notifyGuestConnection(child, true);
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
function datasetAttribute(name) {
  return "data-" + String(name).replace(/[A-Z]/g, function (letter) {
    return "-" + letter.toLowerCase();
  });
}
Object.defineProperty(GuestElement.prototype, "dataset", {
  get: function () {
    var element = this;
    return this._guestDataset || (this._guestDataset = new Proxy({}, {
      get: function (_, name) {
        if (typeof name !== "string") return undefined;
        var value = element.getAttribute(datasetAttribute(name));
        return value === null ? undefined : value;
      },
      set: function (_, name, value) {
        if (typeof name !== "string") return false;
        element.setAttribute(datasetAttribute(name), String(value));
        return true;
      },
      deleteProperty: function (_, name) {
        if (typeof name !== "string") return false;
        element.removeAttribute(datasetAttribute(name));
        return true;
      }
    }));
  }
});

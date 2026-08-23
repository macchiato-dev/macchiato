// Full-engine additions layered over the canonical wasm-web-container guest
// runtime. These are browser-shaped guest objects, never browser-realm objects.
globalThis.document = document;
globalThis.window = globalThis.self = globalThis.parent = globalThis;
if (typeof globalThis.URL !== "function") {
  globalThis.URL = function GuestURL(value) {
    var text = String(value);
    var match = /^(https?):\/\/([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(text);
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
  globalThis.URL.prototype.toString = function () { return this.href; };
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
  pendingOperations.push([3, document.reference, stringIndex("postMessage"), [
    encode(String(message))
  ]]);
};
globalThis.__wwcServiceCall = function (name, payload) {
  return immediate([3, document.reference, stringIndex("serviceCall"), [
    encode(String(name)), encode(String(payload))
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
function GuestSVGElement() {}
Object.defineProperty(GuestSVGElement, Symbol.hasInstance, {
  value: function (candidate) {
    return candidate instanceof GuestElement &&
      candidate.namespaceURI === "http://www.w3.org/2000/svg";
  }
});
globalThis.SVGElement = GuestSVGElement;
globalThis.Document = GuestDocument;
Object.defineProperties(GuestObject, {
  ELEMENT_NODE: { value: 1 },
  ATTRIBUTE_NODE: { value: 2 },
  TEXT_NODE: { value: 3 },
  CDATA_SECTION_NODE: { value: 4 },
  PROCESSING_INSTRUCTION_NODE: { value: 7 },
  COMMENT_NODE: { value: 8 },
  DOCUMENT_NODE: { value: 9 },
  DOCUMENT_TYPE_NODE: { value: 10 },
  DOCUMENT_FRAGMENT_NODE: { value: 11 },
});
var syntheticDocumentListeners = Object.create(null);
function GuestCustomEvent(type, options) {
  this.type = String(type);
  this.detail = options && options.detail;
  this.defaultPrevented = false;
}
GuestCustomEvent.prototype.preventDefault = function () { this.defaultPrevented = true; };
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
  immediate([3, this.reference, stringIndex("close"),
    value === undefined ? [] : [encode(String(value))]]);
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
var NativeDate = Date;
var runtimeDateNow = function () {
  return runtimePerformanceNow ? Math.round(runtimeEpochOrigin +
    runtimePerformanceNow() - runtimePerformanceOrigin) :
    hostCall(document.reference, "dateNow", []);
};
function GuestDate(value) {
  return new NativeDate(arguments.length ? Number(value) : runtimeDateNow());
}
GuestDate.prototype = NativeDate.prototype;
GuestDate.now = runtimeDateNow;
[
  ["getFullYear", 0], ["getMonth", 1], ["getDate", 2], ["getDay", 3],
  ["getHours", 4], ["getMinutes", 5], ["getSeconds", 6],
  ["getTimezoneOffset", 7]
].forEach(function (entry) {
  NativeDate.prototype[entry[0]] = function () {
    return hostCall(document.reference, "datePart", [this.valueOf(), entry[1]]);
  };
});
globalThis.Date = GuestDate;
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
Object.defineProperty(GuestElement.prototype, "localName", {
  get: function () {
    if (this._localName === undefined) {
      this._localName = immediate([1, this.reference, stringIndex("localName")]);
    }
    return this._localName;
  }
});
Object.defineProperty(GuestElement.prototype, "namespaceURI", {
  get: function () {
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
  var result = immediate([3, this.reference, stringIndex("closest"), [
    encode(String(selector))
  ]]);
  return result === null ? null : nodeForReference(result[1]);
};
GuestElement.prototype.matches = function (selector) {
  return immediate([3, this.reference, stringIndex("matches"), [
    encode(String(selector))
  ]]);
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
globalThis.Selection = GuestSelection;
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
function GuestWebGLObject(reference) { GuestObject.call(this, reference); }
GuestWebGLObject.prototype = Object.create(GuestObject.prototype);
function GuestWebGLContext(reference) { GuestObject.call(this, reference); }
GuestWebGLContext.prototype = Object.create(GuestObject.prototype);
function GuestWebGPUContext(reference) { GuestObject.call(this, reference); }
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
var webGLConstants = {
  ARRAY_BUFFER: 34962, COLOR_BUFFER_BIT: 16384, COMPILE_STATUS: 35713,
  FLOAT: 5126, FRAGMENT_SHADER: 35632, LINK_STATUS: 35714,
  STATIC_DRAW: 35044, TRIANGLES: 4, VERTEX_SHADER: 35633
};
Object.keys(webGLConstants).forEach(function (name) {
  Object.defineProperty(GuestWebGLContext.prototype, name, { value: webGLConstants[name] });
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
  GuestWebGLContext.prototype[name] = function (object) { hostCall(this.reference, name, [object]); };
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
  GuestWebGLContext.prototype[name] = function (value) { hostCall(this.reference, name, [Number(value)]); };
});
GuestWebGLContext.prototype.vertexAttribPointer = function (index, size, type, normalized, stride, offset) {
  hostCall(this.reference, "vertexAttribPointer", [Number(index), Number(size), Number(type),
    Boolean(normalized), Number(stride), Number(offset)]);
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
GuestRange.prototype.detach = function () {
  hostCall(this.reference, "detach", []);
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

function GuestStylesheetNode() {
  this.parentNode = null;
  this._text = "";
}
function projectStylesheet(source) {
  var output = "", at = 0;
  // Print-only UI is omitted. Keyframes cross the semantic CSS wire and are
  // scoped by the host like every other named resource.
  var pattern = /@media\s+print\s*\{/ig;
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

// A build machine may perform the CSS parse ahead of time. The guest still
// owns the DOM capability and explicitly forwards those semantic operations.
GuestDocument.prototype.installStylesheetOperations = function (bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("stylesheet operations must be bytes");
  immediate([3, this.reference, stringIndex("installStylesheet"), [encode(bytes)]]);
};
GuestDocument.prototype.installStylesheetSource = function (source) {
  document.installStylesheet(projectStylesheet(String(source)));
};
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
  node._localName = tag;
  node._namespaceURI = "http://www.w3.org/1999/xhtml";
  return node;
};
GuestDocument.prototype.createElementNS = function (namespace, tag) {
  namespace = String(namespace);
  tag = String(tag).toLowerCase();
  var result = immediate([3, this.reference, stringIndex("createElementNS"), [
    encode(namespace), encode(tag)
  ]]);
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
  get: function () {
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
function GuestComputedStyle(reference) { GuestObject.call(this, reference); }
GuestComputedStyle.prototype = Object.create(GuestObject.prototype);
["direction", "height", "overflow", "paddingBottom", "paddingLeft", "paddingRight",
  "paddingTop", "position", "whiteSpace", "width"].forEach(function (name) {
  Object.defineProperty(GuestComputedStyle.prototype, name, {
    get: function () { return hostGet(this.reference, name); }
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
GuestEvent.prototype.getModifierState = function (key) {
  return immediate([3, this.reference, stringIndex("getModifierState"), [encode(String(key))]]);
};
GuestEvent.prototype.composedPath = function () {
  var bytes = hostCall(this.reference, "composedPathReferences", []);
  var length = bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;
  var path = [];
  for (var index = 0; index < length; index++) {
    var at = 4 + index * 4;
    path.push(nodeForReference(bytes[at] | bytes[at + 1] << 8 |
      bytes[at + 2] << 16 | bytes[at + 3] << 24));
  }
  return path;
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
  // A DOM EventTarget may retain this listener for the life of the surface.
  // Do not reuse callback slots that can still be named by a host listener.
  var index = callbacks.length;
  if (index >= 4096) throw new RangeError("event callback space exhausted");
  // A browser EventTarget strongly retains its listeners until removal.
  var state = { active: true, callback: callback };
  callbackStates[index] = state;
  callbacks[index] = function (event) {
    var current = state.callback;
    if (!state.active || !current) return releaseCallback(index);
    try {
      current(event);
    } catch (error) {
      var message = String(error), stack = error && error.stack;
      globalThis.__wwcReportError(stack && stack.indexOf(message) < 0 ?
        message + "\n" + stack : stack || message);
      throw error;
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
  records.push({ type: type, callback: callback, index: index, capture: capture, local: local });
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
// Pointer selections are owned by the document after they begin. Use the same
// listener bookkeeping as elements so temporary drag listeners are removed at
// mouseup, just as they are in a browser DOM.
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
  set: function (value) {
    pendingOperations.push([2, this.reference, stringIndex("tabIndex"), encode(value)]);
  }
});
Object.defineProperty(GuestElement.prototype, "hidden", {
  get: function () { return immediate([1, this.reference, stringIndex("hidden")]); },
  set: function (value) {
    immediate([2, this.reference, stringIndex("hidden"), encode(Boolean(value))]);
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
    pendingOperations.push([3, this.reference, stringIndex("insertBefore"), [
      encode(child), encode(next)
    ]]);
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
  pendingOperations.push([3, this.reference, stringIndex("setAttribute"), [
    encode(String(name)), encode(text)
  ]]);
};
GuestElement.prototype.removeAttribute = function (name) {
  var values = this._attributeValues || (this._attributeValues = Object.create(null));
  var known = this._knownAttributes || (this._knownAttributes = Object.create(null));
  known[name] = true;
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

// Full-engine additions layered over the canonical wasm-web-container guest
// runtime. These are browser-shaped guest objects, never browser-realm objects.
globalThis.document = document;
globalThis.window = globalThis.self = globalThis;
document.defaultView = globalThis;
globalThis.Node = GuestObject;
globalThis.Element = globalThis.HTMLElement = GuestElement;
globalThis.Document = GuestDocument;
Object.defineProperty(GuestDocument.prototype, "documentElement", {
  get: function () {
    if (!this._documentElement) {
      var result = immediate([1, this.reference, stringIndex("documentElement")]);
      this._documentElement = new GuestElement(result[1]);
    }
    return this._documentElement;
  }
});
globalThis.navigator = { userAgent: "QuickJS", platform: "Linux", vendor: "", maxTouchPoints: 0 };
globalThis.innerWidth = 800;
globalThis.innerHeight = 600;
globalThis.devicePixelRatio = 1;

Object.defineProperty(GuestObject.prototype, "nodeType", {
  get: function () {
    return immediate([1, this.reference, stringIndex("nodeType")]);
  }
});
GuestObject.prototype.contains = function (node) {
  return immediate([3, this.reference, stringIndex("contains"), [encode(node)]]);
};
["nodeValue", "textContent"].forEach(function (name) {
  Object.defineProperty(GuestObject.prototype, name, {
    set: function (value) {
      pendingOperations.push([2, this.reference, stringIndex(name), encode(String(value))]);
    }
  });
});
function childrenOf(node) {
  return node._guestChildren || (node._guestChildren = []);
}
function detachGuestNode(node) {
  var parent = node._guestParent || null;
  if (parent) {
    var siblings = childrenOf(parent);
    var index = siblings.indexOf(node);
    if (index > -1) siblings.splice(index, 1);
  }
  node._guestParent = null;
}
Object.defineProperties(GuestObject.prototype, {
  parentNode: { get: function () { return this._guestParent || null; } },
  parentElement: { get: function () {
    return this._guestParent instanceof GuestElement ? this._guestParent : null;
  } },
  firstChild: { get: function () { return childrenOf(this)[0] || null; } },
  lastChild: { get: function () {
    var children = childrenOf(this);
    return children.length ? children[children.length - 1] : null;
  } },
  nextSibling: { get: function () {
    if (!this._guestParent) return null;
    var siblings = childrenOf(this._guestParent);
    return siblings[siblings.indexOf(this) + 1] || null;
  } },
  previousSibling: { get: function () {
    if (!this._guestParent) return null;
    var siblings = childrenOf(this._guestParent);
    return siblings[siblings.indexOf(this) - 1] || null;
  } }
});

function GuestSelection(reference) {
  GuestObject.call(this, reference);
}
GuestSelection.prototype = Object.create(GuestObject.prototype);
["anchorOffset", "focusOffset", "rangeCount"].forEach(function (name) {
  Object.defineProperty(GuestSelection.prototype, name, {
    get: function () { return immediate([1, this.reference, stringIndex(name)]); }
  });
});
["anchorNode", "focusNode"].forEach(function (name) {
  Object.defineProperty(GuestSelection.prototype, name, {
    get: function () {
      var result = immediate([1, this.reference, stringIndex(name)]);
      return result === null ? null : new GuestObject(result[1]);
    }
  });
});
GuestDocument.prototype.getSelection = function () {
  var result = immediate([3, this.reference, stringIndex("getSelection"), []]);
  return result === null ? null : new GuestSelection(result[1]);
};
GuestDocument.prototype.createTextNode = function (text) {
  var result = immediate([3, this.reference, stringIndex("createTextNode"), [encode(String(text))]]);
  return new GuestObject(result[1]);
};
GuestDocument.prototype.hasFocus = function () {
  return immediate([3, this.reference, stringIndex("hasFocus"), []]);
};
Object.defineProperty(GuestDocument.prototype, "activeElement", {
  get: function () {
    var result = immediate([1, this.reference, stringIndex("activeElement")]);
    return result === null ? null : new GuestElement(result[1]);
  }
});
globalThis.getSelection = function () { return document.getSelection(); };

function GuestStylesheetNode() {
  this.parentNode = null;
  this._text = "";
}
Object.defineProperty(GuestStylesheetNode.prototype, "textContent", {
  get: function () { return this._text; },
  set: function (value) {
    this._text = String(value);
    if (this.parentNode) document.installStylesheet(this._text);
  }
});
GuestStylesheetNode.prototype.setAttribute = function () {
  throw new TypeError("stylesheet attributes are not available");
};
var createElement = GuestDocument.prototype.createElement;
GuestDocument.prototype.createElement = function (tag) {
  if (String(tag).toLowerCase() === "style") return new GuestStylesheetNode();
  return createElement.call(this, tag);
};

function inlineCssBytes(source) {
  return encodeCss(".wwc-inline { " + source + " }");
}
Object.defineProperty(GuestStyle.prototype, "cssText", {
  get: function () { return this._cssText || ""; },
  set: function (value) {
    this._cssText = String(value);
    immediate([3, this.reference, stringIndex("replaceDeclarations"), [
      encode(inlineCssBytes(this._cssText))
    ]]);
  }
});
GuestStyle.prototype.setProperty = function (name, value, priority) {
  var suffix = priority ? " !" + priority : "";
  immediate([3, this.reference, stringIndex("applyDeclarations"), [
    encode(inlineCssBytes(String(name) + ": " + String(value) + suffix + ";"))
  ]]);
};
GuestStyle.prototype.removeProperty = function (name) {
  immediate([3, this.reference, stringIndex("removeProperty"), [encode(String(name))]]);
  return "";
};

function EmptyObserver() {}
EmptyObserver.prototype.observe = EmptyObserver.prototype.disconnect = function () {};
EmptyObserver.prototype.takeRecords = function () { return []; };
globalThis.MutationObserver = globalThis.ResizeObserver = EmptyObserver;
globalThis.getComputedStyle = function () {
  return { direction: "ltr", whiteSpace: "pre", getPropertyValue: function () { return ""; } };
};
globalThis.requestAnimationFrame = function (callback) { return setTimeout(callback, 0); };
globalThis.cancelAnimationFrame = function () {};
globalThis.matchMedia = function () {
  return { matches: false, addListener: function () {}, removeListener: function () {} };
};
globalThis.console = {
  log: function (value) { globalThis.__wwcReportError(value); },
  info: function (value) { globalThis.__wwcReportError(value); },
  warn: function (value) { globalThis.__wwcReportError(value); },
  error: function (value) { globalThis.__wwcReportError(value && value.stack || value); },
};

// Window events are represented by the canonical document service. Keep
// listener identity and removal in the guest so the host only needs to emit a
// small, auditable set of ambient browser signals.
var windowListeners = [];
globalThis.addEventListener = function (type, callback) {
  if (typeof callback !== "function") throw new TypeError("callback required");
  var record = { type: type, callback: callback, active: true };
  var callbackIndex = callbacks.length;
  callbacks.push(function (event) {
    if (record.active) record.callback(event || { type: type });
  });
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

Object.defineProperty(GuestElement.prototype, "tabIndex", {
  set: function (value) {
    pendingOperations.push([2, this.reference, stringIndex("tabIndex"), encode(value)]);
  }
});
Object.defineProperty(GuestElement.prototype, "ownerDocument", {
  get: function () { return document; }
});
GuestElement.prototype.appendChild = function (child) {
  detachGuestNode(child);
  childrenOf(this).push(child);
  child._guestParent = this;
  pendingOperations.push([3, this.reference, stringIndex("appendChild"), [encode(child)]]);
  return child;
};
GuestElement.prototype.insertBefore = function (child, next) {
  if (child instanceof GuestStylesheetNode) {
    if (this !== document.head) throw new TypeError("stylesheet must enter the logical head");
    child.parentNode = this;
    document.installStylesheet(child.textContent);
    return child;
  }
  detachGuestNode(child);
  var children = childrenOf(this);
  var index = next === null ? children.length : children.indexOf(next);
  if (index < 0) throw new TypeError("reference node is not a child");
  children.splice(index, 0, child);
  child._guestParent = this;
  pendingOperations.push([3, this.reference, stringIndex("insertBefore"), [
    encode(child), encode(next)
  ]]);
  return child;
};
GuestElement.prototype.removeChild = function (child) {
  if (child._guestParent !== this) throw new TypeError("node is not a child");
  detachGuestNode(child);
  pendingOperations.push([3, this.reference, stringIndex("removeChild"), [encode(child)]]);
  return child;
};
GuestElement.prototype.remove = function () {
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
  for (var i = 0; i < current.length; i++) detachGuestNode(current[i]);
  var args = [];
  for (var j = 0; j < arguments.length; j++) {
    var child = arguments[j];
    if (!(child instanceof GuestObject)) child = document.createTextNode(String(child));
    detachGuestNode(child);
    childrenOf(this).push(child);
    child._guestParent = this;
    args.push(encode(child));
  }
  pendingOperations.push([3, this.reference, stringIndex("replaceChildren"), args]);
};

// Attribute reads are common during projection. Mirror values in the guest and
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

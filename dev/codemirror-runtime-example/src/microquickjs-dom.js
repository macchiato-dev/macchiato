// The guest owns this synchronous DOM-shaped mirror. A transport can observe
// mutations and batch them to a real, constrained host subtree without making
// CodeMirror wait for ordinary tree reads and writes.
function VirtualNode(type, name, document) {
  this.nodeType = type;
  this.nodeName = name;
  this.ownerDocument = document || null;
  this.parentNode = null;
  this.childNodes = [];
  this._text = "";
}

Object.defineProperty(VirtualNode.prototype, "firstChild", {
  get: function () { return this.childNodes[0] || null; }
});
Object.defineProperty(VirtualNode.prototype, "lastChild", {
  get: function () { return this.childNodes[this.childNodes.length - 1] || null; }
});
Object.defineProperty(VirtualNode.prototype, "nextSibling", {
  get: function () {
    if (!this.parentNode) return null;
    var siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] || null;
  }
});
Object.defineProperty(VirtualNode.prototype, "previousSibling", {
  get: function () {
    if (!this.parentNode) return null;
    var siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) - 1] || null;
  }
});
Object.defineProperty(VirtualNode.prototype, "parentElement", {
  get: function () { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
});
Object.defineProperty(VirtualNode.prototype, "textContent", {
  get: function () {
    if (this.nodeType === 3) return this._text;
    return this.childNodes.map(function (child) { return child.textContent; }).join("");
  },
  set: function (text) {
    this.childNodes.length = 0;
    this._text = String(text == null ? "" : text);
    if (this.nodeType !== 3 && this._text) {
      this.appendChild(this.ownerDocument.createTextNode(this._text));
    }
  }
});
Object.defineProperty(VirtualNode.prototype, "nodeValue", {
  get: function () { return this.nodeType === 3 ? this._text : null; },
  set: function (text) { if (this.nodeType === 3) this._text = String(text); }
});
Object.defineProperty(VirtualNode.prototype, "data", {
  get: function () { return this.nodeType === 3 ? this._text : undefined; },
  set: function (text) { if (this.nodeType === 3) this._text = String(text); }
});

VirtualNode.prototype.appendChild = function (child) {
  if (child.nodeType === 11) {
    while (child.firstChild) this.appendChild(child.firstChild);
    return child;
  }
  if (child.parentNode) child.parentNode.removeChild(child);
  child.parentNode = this;
  this.childNodes.push(child);
  return child;
};
VirtualNode.prototype.append = function () {
  for (var index = 0; index < arguments.length; index++) {
    var child = arguments[index];
    this.appendChild(child instanceof VirtualNode ? child : this.ownerDocument.createTextNode(child));
  }
};
VirtualNode.prototype.insertBefore = function (child, before) {
  if (before == null) return this.appendChild(child);
  if (child === before) return child;
  if (this.childNodes.indexOf(before) < 0) throw new Error("reference node is not a child");
  if (child.parentNode) child.parentNode.removeChild(child);
  var index = this.childNodes.indexOf(before);
  child.parentNode = this;
  this.childNodes.splice(index, 0, child);
  return child;
};
VirtualNode.prototype.removeChild = function (child) {
  var index = this.childNodes.indexOf(child);
  if (index < 0) throw new Error("node is not a child");
  this.childNodes.splice(index, 1);
  child.parentNode = null;
  return child;
};
VirtualNode.prototype.remove = function () {
  if (this.parentNode) this.parentNode.removeChild(this);
};
VirtualNode.prototype.replaceChildren = function () {
  while (this.lastChild) this.removeChild(this.lastChild);
  this.append.apply(this, arguments);
};
VirtualNode.prototype.contains = function (node) {
  for (; node; node = node.parentNode) if (node === this) return true;
  return false;
};

function VirtualElement(tag, document) {
  VirtualNode.call(this, 1, String(tag).toUpperCase(), document);
  this.tagName = this.nodeName;
  this.attributes = {};
  this.style = { cssText: "" };
  this.className = "";
  this.id = "";
  this.hidden = false;
  this._listeners = {};
  var element = this;
  this.classList = {
    add: function () {
      var names = element.className ? element.className.split(/\s+/) : [];
      for (var index = 0; index < arguments.length; index++) {
        if (names.indexOf(arguments[index]) < 0) names.push(arguments[index]);
      }
      element.className = names.join(" ");
    },
    remove: function () {
      var removed = Array.prototype.slice.call(arguments);
      element.className = (element.className ? element.className.split(/\s+/) : [])
        .filter(function (name) { return removed.indexOf(name) < 0; }).join(" ");
    },
    contains: function (name) {
      return (element.className ? element.className.split(/\s+/) : []).indexOf(name) >= 0;
    }
  };
}
VirtualElement.prototype = Object.create(VirtualNode.prototype);
VirtualElement.prototype.constructor = VirtualElement;

Object.defineProperty(VirtualElement.prototype, "children", {
  get: function () { return this.childNodes.filter(function (node) { return node.nodeType === 1; }); }
});
Object.defineProperty(VirtualElement.prototype, "childElementCount", {
  get: function () { return this.children.length; }
});
VirtualElement.prototype.setAttribute = function (name, value) {
  value = String(value);
  this.attributes[name] = value;
  if (name === "class") this.className = value;
  if (name === "id") this.id = value;
};
VirtualElement.prototype.getAttribute = function (name) {
  return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
};
VirtualElement.prototype.hasAttribute = function (name) {
  return Object.prototype.hasOwnProperty.call(this.attributes, name);
};
VirtualElement.prototype.removeAttribute = function (name) { delete this.attributes[name]; };
VirtualElement.prototype.addEventListener = function (type, callback) {
  (this._listeners[type] || (this._listeners[type] = [])).push(callback);
};
VirtualElement.prototype.removeEventListener = function (type, callback) {
  var listeners = this._listeners[type] || [];
  var index = listeners.indexOf(callback);
  if (index >= 0) listeners.splice(index, 1);
};
VirtualElement.prototype.focus = function () { this.ownerDocument.activeElement = this; };
VirtualElement.prototype.blur = function () {
  if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null;
};
VirtualElement.prototype.select = function () {
  this.focus();
  this.selectionStart = 0;
  this.selectionEnd = String(this.value || "").length;
};
VirtualElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, right: 800, bottom: 20, width: 800, height: 20 };
};
VirtualElement.prototype.getClientRects = function () { return [this.getBoundingClientRect()]; };
VirtualElement.prototype.querySelector = function () { return null; };
VirtualElement.prototype.querySelectorAll = function () { return []; };
VirtualElement.prototype.matches = function () { return false; };

function VirtualRange(document) {
  this.ownerDocument = document;
  this.startContainer = this.endContainer = document.body;
  this.startOffset = this.endOffset = 0;
  this.collapsed = true;
}
VirtualRange.prototype.setStart = function (node, offset) {
  this.startContainer = node; this.startOffset = offset; this.collapsed = false;
};
VirtualRange.prototype.setEnd = function (node, offset) {
  this.endContainer = node; this.endOffset = offset; this.collapsed = false;
};
VirtualRange.prototype.selectNode = function (node) { this.startContainer = this.endContainer = node; };
VirtualRange.prototype.selectNodeContents = VirtualRange.prototype.selectNode;
VirtualRange.prototype.getBoundingClientRect = VirtualElement.prototype.getBoundingClientRect;
VirtualRange.prototype.getClientRects = VirtualElement.prototype.getClientRects;

function VirtualSelection() { this.ranges = []; this.anchorNode = this.focusNode = null; }
Object.defineProperty(VirtualSelection.prototype, "rangeCount", {
  get: function () { return this.ranges.length; }
});
VirtualSelection.prototype.addRange = function (range) { this.ranges = [range]; };
VirtualSelection.prototype.removeAllRanges = function () { this.ranges = []; };
VirtualSelection.prototype.getRangeAt = function (index) { return this.ranges[index]; };

function VirtualDocument() {
  VirtualNode.call(this, 9, "#document", null);
  this.ownerDocument = this;
  this.documentElement = new VirtualElement("html", this);
  this.head = new VirtualElement("head", this);
  this.body = new VirtualElement("body", this);
  this.documentElement.append(this.head, this.body);
  this.appendChild(this.documentElement);
  this.activeElement = null;
  this._selection = new VirtualSelection();
}
VirtualDocument.prototype = Object.create(VirtualNode.prototype);
VirtualDocument.prototype.createElement = function (tag) { return new VirtualElement(tag, this); };
VirtualDocument.prototype.createTextNode = function (text) {
  var node = new VirtualNode(3, "#text", this); node._text = String(text); return node;
};
VirtualDocument.prototype.createDocumentFragment = function () { return new VirtualNode(11, "#fragment", this); };
VirtualDocument.prototype.createRange = function () { return new VirtualRange(this); };
VirtualDocument.prototype.getSelection = function () { return this._selection; };
VirtualDocument.prototype.getElementById = function (id) {
  var pending = [this.documentElement];
  while (pending.length) {
    var node = pending.shift();
    if (node.id === id) return node;
    pending = node.childNodes.concat(pending);
  }
  return null;
};
VirtualDocument.prototype.addEventListener = function () {};
VirtualDocument.prototype.removeEventListener = function () {};
VirtualDocument.prototype.hasFocus = function () { return true; };

var document = new VirtualDocument();
var mount = document.createElement("div");
mount.id = "editor";
document.body.appendChild(mount);
var window = globalThis;
document.defaultView = window;

function EmptyObserver() {}
EmptyObserver.prototype.observe = EmptyObserver.prototype.disconnect = function () {};
EmptyObserver.prototype.takeRecords = function () { return []; };

globalThis.document = document;
globalThis.window = globalThis.self = window;
globalThis.Node = VirtualNode;
globalThis.Element = globalThis.HTMLElement = VirtualElement;
globalThis.Document = VirtualDocument;
function WindowFacade() {}
globalThis.Window = WindowFacade;
globalThis.MutationObserver = globalThis.ResizeObserver = EmptyObserver;
globalThis.navigator = { userAgent: "MicroQuickJS", platform: "Linux", vendor: "", maxTouchPoints: 0 };
globalThis.innerWidth = 800;
globalThis.innerHeight = 600;
globalThis.devicePixelRatio = 1;
globalThis.getComputedStyle = function (element) {
  return { direction: "ltr", whiteSpace: "pre", getPropertyValue: function (name) {
    return element.style[name] || "";
  } };
};
var scheduledTasks = [];
globalThis.setTimeout = function (callback) {
  scheduledTasks.push(callback);
  return scheduledTasks.length;
};
globalThis.clearTimeout = function (id) {
  if (id > 0 && id <= scheduledTasks.length) scheduledTasks[id - 1] = null;
};
globalThis.requestAnimationFrame = function (callback) {
  return setTimeout(function () { callback(Date.now()); }, 0);
};
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.__wwcDrainTasks = function (limit) {
  var count = 0;
  while (count < limit && scheduledTasks.length) {
    var callback = scheduledTasks.shift();
    if (callback) { callback(); count++; }
  }
  return count;
};
globalThis.addEventListener = globalThis.removeEventListener = function () {};
globalThis.matchMedia = function () { return { matches: false, addListener: function () {}, removeListener: function () {} }; };
function reportConsole() {
  var parts = [];
  for (var index = 0; index < arguments.length; index++) {
    var value = arguments[index];
    parts.push(value && value.stack ? value.stack : String(value));
  }
  print(parts.join(" "));
}
globalThis.console = {
  log: reportConsole,
  info: reportConsole,
  warn: reportConsole,
  error: reportConsole
};
globalThis.__wwcDomMetrics = function () {
  var nodes = 0, elements = 0, text = 0, listeners = 0;
  var pending = [document];
  while (pending.length) {
    var node = pending.pop();
    nodes++;
    if (node.nodeType === 1) {
      elements++;
      for (var type in node._listeners) listeners += node._listeners[type].length;
    } else if (node.nodeType === 3) text++;
    for (var index = 0; index < node.childNodes.length; index++) {
      pending.push(node.childNodes[index]);
    }
  }
  return { nodes: nodes, elements: elements, text: text, listeners: listeners };
};
globalThis.__wwcSnapshot = function () {
  function copy(node) {
    if (node.nodeType === 3) return { type: 3, text: node._text };
    var attributes = {};
    for (var name in node.attributes) attributes[name] = node.attributes[name];
    if (node.className) attributes.class = node.className;
    if (node.id) attributes.id = node.id;
    var style = {};
    for (var property in node.style) {
      if (typeof node.style[property] === "string") style[property] = node.style[property];
    }
    var properties = {};
    for (var index = 0; index < 3; index++) {
      var property = ["value", "checked", "disabled"][index];
      if (Object.prototype.hasOwnProperty.call(node, property)) {
        properties[property] = node[property];
      }
    }
    return {
      type: node.nodeType,
      tag: node.tagName ? node.tagName.toLowerCase() : "",
      attributes: attributes,
      style: style,
      properties: properties,
      children: node.childNodes.map(copy)
    };
  }
  var body = copy(document.body);
  body.children = document.head.childNodes.map(copy).concat(body.children);
  return body;
};

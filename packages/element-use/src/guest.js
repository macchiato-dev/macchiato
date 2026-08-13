// This file is evaluated directly inside QuickJS. It contains only the small
// DOM-shaped API needed by the Mahjong game.
(function installElementUseGuest() {
  const nodes = Object.create(null);
  const listeners = Object.create(null);
  let nextListener = 1;

  function host(message) {
    const result = JSON.parse(
      globalThis.__elementUseHost(JSON.stringify(message)),
    );
    if (result.__error) throw new Error(result.__error);
    return result;
  }

  function styleFor(node) {
    return new Proxy({}, {
      get(_target, property) {
        return node._style[property] || "";
      },
      set(_target, property, value) {
        const next = String(value);
        if (node._style[property] === next) return true;
        node._style[property] = next;
        host({
          op: "setStyle",
          id: node._id,
          property: String(property),
          value: next,
        });
        return true;
      },
    });
  }

  function Element(id, tag) {
    this._id = String(id);
    this.localName = String(tag);
    this.children = [];
    this.parentNode = null;
    this._attributes = Object.create(null);
    this._style = Object.create(null);
    this.style = styleFor(this);

    const element = this;
    this.classList = {
      contains(name) {
        return element.className.split(/\s+/).includes(String(name));
      },
      add(name) {
        if (!this.contains(name)) {
          element.className = `${element.className} ${name}`.trim();
        }
      },
      remove(name) {
        element.className = element.className
          .split(/\s+/)
          .filter((part) => part && part !== String(name))
          .join(" ");
      },
    };
  }

  Object.defineProperties(Element.prototype, {
    className: {
      get() {
        return this._attributes.class || "";
      },
      set(value) {
        this.setAttribute("class", value);
      },
    },
    hidden: {
      get() {
        return "hidden" in this._attributes;
      },
      set(value) {
        if (value && !("hidden" in this._attributes)) {
          this.setAttribute("hidden", "");
        } else if (!value && "hidden" in this._attributes) {
          this.removeAttribute("hidden");
        }
      },
    },
    textContent: {
      get() {
        return this._text || "";
      },
      set(value) {
        this._text = String(value);
        host({ op: "setText", id: this._id, value: this._text });
      },
    },
    innerHTML: {
      set(value) {
        if (String(value) !== "") {
          throw new Error("element-use only allows clearing innerHTML");
        }
        this.children = [];
        host({ op: "replaceChildren", id: this._id });
      },
    },
    dataset: {
      get() {
        const element = this;
        const attributeName = (key) =>
          `data-${
            String(key).replace(
              /[A-Z]/g,
              (letter) => `-${letter.toLowerCase()}`,
            )
          }`;
        return new Proxy({}, {
          get(_target, key) {
            return element._attributes[attributeName(key)];
          },
          set(_target, key, value) {
            element.setAttribute(attributeName(key), value);
            return true;
          },
        });
      },
    },
  });

  // These reflected string properties all have identical DOM behavior.
  for (const name of ["title", "src", "alt", "type", "role"]) {
    Object.defineProperty(Element.prototype, name, {
      get() {
        return this._attributes[name] || "";
      },
      set(value) {
        this.setAttribute(name, value);
      },
    });
  }

  Element.prototype.setAttribute = function setAttribute(name, value) {
    const attribute = String(name);
    const next = String(value);
    if (this._attributes[attribute] === next) return;
    this._attributes[attribute] = next;
    host({
      op: "setAttribute",
      id: this._id,
      name: attribute,
      value: next,
    });
  };

  Element.prototype.removeAttribute = function removeAttribute(name) {
    const attribute = String(name);
    if (!(attribute in this._attributes)) return;
    delete this._attributes[attribute];
    host({ op: "removeAttribute", id: this._id, name: attribute });
  };

  Element.prototype.append = Element.prototype.appendChild = function append(
    child,
  ) {
    child.parentNode = this;
    this.children.push(child);
    host({ op: "append", parent: this._id, child: child._id });
    return child;
  };

  Element.prototype.querySelector = function querySelector(selector) {
    const result = host({
      op: "find",
      id: this._id,
      selector: String(selector),
    });
    return result.id ? nodes[result.id] : null;
  };

  Element.prototype.addEventListener = function addEventListener(
    type,
    callback,
  ) {
    const listener = String(nextListener++);
    listeners[listener] = callback;
    host({ op: "listen", id: this._id, type: String(type), listener });
  };

  function makeNode(record) {
    const node = nodes[record.id] || new Element(record.id, record.tag);
    nodes[record.id] = node;
    node._attributes = Object.assign(Object.create(null), record.attributes);
    node._text = record.text || "";
    return node;
  }

  globalThis.document = {
    body: new Element("root", "body"),
    getElementById(id) {
      const result = host({
        op: "find",
        id: "root",
        selector: `#${String(id)}`,
      });
      return result.id ? nodes[result.id] : null;
    },
    createElement(tag) {
      const name = String(tag).toLowerCase();
      const result = host({ op: "create", tag: name });
      const node = new Element(result.id, name);
      nodes[result.id] = node;
      return node;
    },
  };

  globalThis.__elementUseInit = function initialize(snapshot) {
    snapshot.forEach(makeNode);
    for (const record of snapshot) {
      const node = nodes[record.id];
      const parent = nodes[record.parent] || document.body;
      if (node.parentNode !== parent) {
        node.parentNode = parent;
        parent.children.push(node);
      }
    }
    return JSON.stringify({});
  };

  globalThis.__elementUseEvent = function dispatchEvent(listener) {
    listeners[String(listener)]?.({ type: "click", preventDefault() {} });
    return JSON.stringify({});
  };

  let timers = [];
  let nextTimer = 1;
  globalThis.setTimeout = function setTimeout(callback, delay) {
    const id = nextTimer++;
    timers.push({
      id,
      callback,
      at: Date.now() + Math.max(0, Number(delay) || 0),
    });
    return id;
  };
  globalThis.clearTimeout = function clearTimeout(id) {
    timers = timers.filter((timer) => timer.id !== id);
  };
  globalThis.__elementUseTimers = function runTimers(now) {
    const due = timers.filter((timer) => timer.at <= now);
    timers = timers.filter((timer) => timer.at > now);
    due.forEach((timer) => timer.callback());
    return JSON.stringify(due.length);
  };
})();

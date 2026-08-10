(() => {
  const callbacks = new Map();
  let callbackId = 0;
  function host(message) {
    const result = JSON.parse(globalThis.__browserUseHost(JSON.stringify(message)));
    if (result && result.__error) throw new Error(result.__error);
    return result;
  }
  function decode(result) {
    if (!result) return undefined;
    if ("handle" in result) return node(result.handle);
    if ("list" in result) return result.list.map(decode);
    return result.value;
  }
  const cache = new Map();
  const rpc = (action, data = {}) => decode(host({ op: "remote", action, ...data }));
  function style(id) {
    return new Proxy({}, {
      get(_target, property) {
        if (Reflect.has(_target, property)) return Reflect.get(_target, property);
        if (typeof property === "symbol") return undefined;
        if (property === "setProperty") return (name, value) => host({ op: "remote", action: "styleSet", id, property: name, value });
        if (property === "removeProperty") return (name) => host({ op: "remote", action: "styleSet", id, property: name, value: "" });
        return host({ op: "remote", action: "styleGet", id, property: String(property) }).value;
      },
      set(_target, property, value) {
        if (typeof property === "symbol") {
          Reflect.set(_target, property, value);
          return true;
        }
        host({ op: "remote", action: "styleSet", id, property: String(property), value });
        return true;
      },
    });
  }
  function canvasContext(id, contextType) {
    const call = (method, args = []) => host({ op: "canvas", id, contextType, action: "call", method, args });
    return new Proxy({}, {
      get(_target, property) {
        if (["setTransform", "clearRect", "fillRect", "beginPath", "arc", "fill", "moveTo", "lineTo", "stroke"].includes(property)) {
          return (...args) => call(property, args);
        }
        return undefined;
      },
      set(_target, property, value) {
        host({ op: "canvas", id, contextType, action: "set", property: String(property), value });
        return true;
      },
    });
  }
  function node(id) {
    id = String(id);
    if (cache.has(id)) return cache.get(id);
    const target = { __handle: id };
    const proxy = new Proxy(target, {
      get(_target, property) {
        if (Reflect.has(_target, property)) return Reflect.get(_target, property);
        if (typeof property === "symbol") return undefined;
        if (property === "__handle") return id;
        if (property === "setActive") return Reflect.get(_target, property);
        if (property === "toJSON") return () => ({ __handle: id });
        if (property === "ownerDocument") return document;
        if (id === "document" && property === "defaultView") return window;
        if (id === "document" && property === "getSelection") return document.getSelection;
        if (id === "document" && property === "addEventListener") return document.addEventListener;
        if (id === "document" && property === "removeEventListener") return document.removeEventListener;
        if (id === "document" && property === "createRange") return document.createRange;
        if (id === "document" && property === "hasFocus") return document.hasFocus;
        if (id === "document" && property === "head") return document.head;
        if (property === "style") return style(id);
        if (property === "getContext") return (contextType) => canvasContext(id, String(contextType));
        if (property === "addEventListener") return (type, callback) => {
          const listenerId = String(++callbackId);
          callbacks.set(listenerId, callback);
          host({ op: "listen", id, type, listenerId });
        };
        if (property === "removeEventListener") return () => {};
        if (property === "classList") return {
          add: (...names) => {
            const current = rpc("get", { id, property: "className" }) || "";
            proxy.className = [...new Set(current.split(/\\s+/).filter(Boolean).concat(names))].join(" ");
          },
          remove: (...names) => {
            const remove = new Set(names);
            proxy.className = (rpc("get", { id, property: "className" }) || "").split(/\\s+/).filter((name) => name && !remove.has(name)).join(" ");
          },
          contains: (name) => (rpc("get", { id, property: "className" }) || "").split(/\\s+/).includes(name),
          toggle: (name, force) => {
            const present = proxy.classList.contains(name);
            const next = force === undefined ? !present : Boolean(force);
            if (next) proxy.classList.add(name); else proxy.classList.remove(name);
            return next;
          },
        };
        const methods = new Set(["appendChild", "blur", "contains", "focus", "getAttribute", "getBoundingClientRect",
          "getClientRects", "hasAttribute", "insertBefore", "matches", "querySelector", "querySelectorAll",
          "remove", "removeAttribute", "removeChild", "replaceChild", "replaceChildren", "scrollIntoView",
          "setAttribute", "setSelectionRange", "addRange", "collapse", "collapseToEnd", "collapseToStart",
          "extend", "getRangeAt", "removeAllRanges", "setBaseAndExtent", "selectNode", "selectNodeContents", "setEnd", "setEndAfter",
          "setEndBefore", "setStart", "setStartAfter", "setStartBefore"]);
        if (methods.has(property)) return (...args) => rpc("call", {
          id, method: property, args: args.map((arg) => arg?.__handle ? { __handle: arg.__handle } : arg),
        });
        return rpc("get", { id, property: String(property) });
      },
      set(_target, property, value) {
        if (typeof property === "symbol" || String(property).startsWith("cm") || property === "setActive") {
          Reflect.set(_target, property, value);
          return true;
        }
        host({ op: "remote", action: "set", id, property: String(property), value: value?.__handle ? { __handle: value.__handle } : value });
        return true;
      },
    });
    cache.set(id, proxy);
    return proxy;
  }
  const document = {
    createElement: (tag) => rpc("createElement", { tag }),
    createTextNode: (text) => rpc("createTextNode", { text }),
    createDocumentFragment: () => rpc("createDocumentFragment"),
    getElementById: (id) => rpc("getElementById", { id }),
    querySelector: (selector) => node("root").querySelector(selector),
    querySelectorAll: (selector) => node("root").querySelectorAll(selector),
    documentElement: { style: {} },
    body: node("root"),
    head: node("root"),
    createRange: () => rpc("createRange"),
    createEvent: (type) => ({ type: String(type || "Event") }),
    getSelection: () => rpc("getSelection"),
    hasFocus: () => true,
    addEventListener() {},
    removeEventListener() {},
    get defaultView() { return window; },
    get activeElement() { return rpc("get", { id: "document", property: "activeElement" }); },
  };
  const window = globalThis;
  Object.assign(globalThis, {
    document, window, self: window,
    innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1,
    console: { log() {}, info() {}, warn() {}, error() {} },
    navigator: { userAgent: "Macchiato QuickJS", platform: "Linux", vendor: "", language: "en", maxTouchPoints: 0 },
    HTMLElement: class { static [Symbol.hasInstance](value) { return Boolean(value?.__handle); } },
    Document: class { static [Symbol.hasInstance](value) { return value === document; } },
    Window: class { static [Symbol.hasInstance](value) { return value === window; } },
    Element: class { static [Symbol.hasInstance](value) { return Boolean(value?.__handle); } },
    Node: class { static [Symbol.hasInstance](value) { return Boolean(value?.__handle); } },
    MutationObserver: class { observe() {} disconnect() {} takeRecords() { return []; } },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(target) { this.callback([{ target, isIntersecting: true, intersectionRatio: 1 }]); }
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    },
    performance: { now: () => Date.now() },
    getComputedStyle(element) {
      const read = (property) => host({ op: "remote", action: "computedStyleGet", id: element.__handle, property: String(property) }).value;
      return new Proxy({}, {
        get: (_target, property) => property === "getPropertyValue" ? (name) => read(name) : read(property),
      });
    },
    requestAnimationFrame(callback) { callbacks.set("frame:" + (++callbackId), callback); return callbackId; },
    cancelAnimationFrame() {},
    queueMicrotask(callback) { callbacks.set("frame:" + (++callbackId), callback); },
    setTimeout(callback, delay = 0) {
      const id = ++callbackId;
      const wait = Math.max(0, Number(delay) || 0);
      callbacks.set("timer:" + id, { callback, interval: false, delay: wait, dueAt: Date.now() + wait });
      return id;
    },
    clearTimeout(id) { callbacks.delete("timer:" + id); },
    setInterval(callback, delay = 0) {
      const id = ++callbackId;
      const wait = Math.max(0, Number(delay) || 0);
      callbacks.set("timer:" + id, { callback, interval: true, delay: wait, dueAt: Date.now() + wait });
      return id;
    },
    clearInterval(id) { callbacks.delete("timer:" + id); },
    addEventListener() {},
    removeEventListener() {},
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; },
  });
  globalThis.__browserUseDispatchEvent = (json) => {
    const envelope = JSON.parse(json);
    const callback = callbacks.get(String(envelope.listenerId));
    if (!callback) return JSON.stringify({});
    let prevented = false;
    let stopped = false;
    const target = node(envelope.event.target);
    const event = {
      ...envelope.event,
      target,
      currentTarget: node(envelope.currentTarget || envelope.event.target),
      composedPath() {
        const path = [];
        let current = target;
        for (let depth = 0; current && depth < 20; depth += 1) {
          path.push(current);
          if (current.__handle === "root") break;
          current = current.parentNode;
        }
        return path;
      },
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; },
      stopImmediatePropagation() { stopped = true; },
      get defaultPrevented() { return prevented; },
    };
    callback(event);
    for (const [id, pending] of Array.from(callbacks)) {
      if (id.startsWith("frame:")) {
        callbacks.delete(id);
        pending(Date.now());
      }
    }
    return JSON.stringify({ preventDefault: prevented, stopPropagation: stopped });
  };
  globalThis.__browserUseConfigureEnvironment = (json) => {
    const environment = JSON.parse(json);
    if (typeof environment.platform === "string") navigator.platform = environment.platform.slice(0, 80);
    if (typeof environment.userAgent === "string") navigator.userAgent = environment.userAgent.slice(0, 500);
    if (typeof environment.vendor === "string") navigator.vendor = environment.vendor.slice(0, 120);
    if (Number.isFinite(environment.innerWidth) && environment.innerWidth > 0) innerWidth = environment.innerWidth;
    if (Number.isFinite(environment.innerHeight) && environment.innerHeight > 0) innerHeight = environment.innerHeight;
    if (Number.isFinite(environment.devicePixelRatio) && environment.devicePixelRatio > 0) devicePixelRatio = environment.devicePixelRatio;
    return JSON.stringify({ platform: navigator.platform, innerWidth, innerHeight, devicePixelRatio });
  };
  globalThis.__browserUseFlush = () => {
    let count = 0;
    for (let round = 0; round < 10; round++) {
      const pendingCallbacks = Array.from(callbacks).filter(([id]) => id.startsWith("frame:") || id.startsWith("timer:"));
      if (!pendingCallbacks.length) break;
      for (const [id, pending] of pendingCallbacks) {
        if (count++ >= 100) break;
        if (!pending.interval) callbacks.delete(id);
        (pending.callback || pending)(Date.now());
      }
    }
    return JSON.stringify({ count });
  };
  globalThis.__browserUseTick = () => {
    const now = Date.now();
    const pendingCallbacks = Array.from(callbacks).filter(([id, pending]) =>
      id.startsWith("frame:") || (id.startsWith("timer:") && pending.dueAt <= now));
    let count = 0;
    for (const [id, pending] of pendingCallbacks) {
      if (!pending.interval) callbacks.delete(id);
      else pending.dueAt = now + pending.delay;
      (pending.callback || pending)(Date.now());
      count += 1;
    }
    return JSON.stringify({ count });
  };
})();

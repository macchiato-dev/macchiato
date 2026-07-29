export const browserUseQuickJsGuestSource = `
(() => {
  function call(op, data) {
    const response = JSON.parse(globalThis.__browserUseHost(JSON.stringify(Object.assign({ op }, data || {}))));
    if (response && response.__error) throw new Error(response.__error);
    return response;
  }
  class BrowserElement {
    constructor(id) { this.__browserUseId = String(id); }
    get textContent() { return call("read", { id: this.__browserUseId, property: "textContent" }).value; }
    set textContent(value) { call("write", { id: this.__browserUseId, property: "textContent", value }); }
    get value() { return call("read", { id: this.__browserUseId, property: "value" }).value; }
    set value(value) { call("write", { id: this.__browserUseId, property: "value", value }); }
    get checked() { return call("read", { id: this.__browserUseId, property: "checked" }).value; }
    set checked(value) { call("write", { id: this.__browserUseId, property: "checked", value }); }
    get className() { return call("read", { id: this.__browserUseId, property: "className" }).value; }
    get tagName() { return call("read", { id: this.__browserUseId, property: "tagName" }).value; }
    get childElementCount() { return call("read", { id: this.__browserUseId, property: "childElementCount" }).value; }
  }
  const wrap = (id) => id == null ? null : new BrowserElement(id);
  globalThis.document = Object.freeze({
    querySelector(selector) {
      return wrap(call("query", { selector }).ids[0]);
    },
    querySelectorAll(selector) {
      return call("query", { selector, all: true }).ids.map(wrap);
    },
  });
  globalThis.__browserUseInspect = () => JSON.stringify(call("inspect"));
})();
`;

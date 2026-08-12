export const VIRTUAL_DOM_PROTOCOL = "macchiato-virtual-dom-use-v1";
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const OPERATIONS = new Set(["set", "spliceText"]);

export function createEditorDom(content = "") {
  content = String(content);
  return {
    protocol: VIRTUAL_DOM_PROTOCOL,
    revision: 0,
    root: "editor-root",
    nodes: {
      "editor-root": { kind: "element", tag: "section", props: { className: "virtual-editor" }, children: ["toolbar", "input", "status"] },
      toolbar: { kind: "element", tag: "div", props: { className: "virtual-editor__toolbar" }, children: ["title", "metrics", "undo", "redo"] },
      title: { kind: "element", tag: "strong", props: {}, children: ["title-label"] },
      "title-label": { kind: "text", text: "Shared virtual DOM editor" },
      metrics: { kind: "element", tag: "span", props: {}, children: ["metrics-label"] },
      "metrics-label": { kind: "text", text: `${content === "" ? 1 : content.split("\n").length} lines · ${content.length} characters` },
      undo: { kind: "element", tag: "button", props: { type: "button", action: "undo", disabled: true }, children: ["undo-label"] },
      "undo-label": { kind: "text", text: "Undo" },
      redo: { kind: "element", tag: "button", props: { type: "button", action: "redo", disabled: true }, children: ["redo-label"] },
      "redo-label": { kind: "text", text: "Redo" },
      input: { kind: "element", tag: "textarea", props: { className: "virtual-editor__input", action: "input", value: content, selectionStart: 0, selectionEnd: 0, spellcheck: false }, children: [] },
      status: { kind: "element", tag: "div", props: { className: "virtual-editor__status" }, children: ["status-label"] },
      "status-label": { kind: "text", text: "Guest revision 0 · 1 stored transition" },
    },
  };
}

function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function applyBatch(dom, batch) {
  if (batch?.protocol !== VIRTUAL_DOM_PROTOCOL) throw new Error("Virtual DOM protocol mismatch");
  if (batch.baseRevision !== dom.revision) throw new Error("Virtual DOM batch has a stale base revision");
  if (!Number.isSafeInteger(batch.revision) || batch.revision < batch.baseRevision) throw new Error("Virtual DOM batch revision is invalid");
  if (!Array.isArray(batch.operations) || batch.operations.length > 64) throw new Error("Virtual DOM batch exceeds its operation limit");
  for (const operation of batch.operations) {
    if (!OPERATIONS.has(operation?.op) || !Array.isArray(operation.path) || operation.path.length < 1 || operation.path.length > 5) throw new Error("Unsupported virtual DOM operation");
    let target = dom;
    for (const key of operation.path.slice(0, -1)) {
      if (typeof key !== "string" || FORBIDDEN_KEYS.has(key) || target[key] === null || typeof target[key] !== "object") throw new Error("Invalid virtual DOM path");
      target = target[key];
    }
    const key = operation.path.at(-1);
    if (typeof key !== "string" || FORBIDDEN_KEYS.has(key) || !(key in target)) throw new Error("Virtual DOM patches may only update declared fields");
    if (operation.op === "spliceText") {
      if (typeof target[key] !== "string" || !Number.isSafeInteger(operation.from) || !Number.isSafeInteger(operation.deleteCount) || operation.from < 0 || operation.deleteCount < 0 || typeof operation.insert !== "string") throw new Error("Invalid virtual DOM text splice");
      target[key] = target[key].slice(0, operation.from) + operation.insert + target[key].slice(operation.from + operation.deleteCount);
    } else target[key] = copy(operation.value);
  }
  dom.revision = batch.revision;
  return dom;
}

export function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
}

export function digestVirtualDom(dom) {
  const text = stableSerialize(dom);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

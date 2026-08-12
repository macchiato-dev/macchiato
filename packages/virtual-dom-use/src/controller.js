import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { applyBatch, digestVirtualDom, VIRTUAL_DOM_PROTOCOL } from "./model.js";

const ALLOWED_TAGS = new Set(["section", "div", "strong", "span", "button", "textarea"]);
const ALLOWED_CLASSES = new Set(["virtual-editor", "virtual-editor__toolbar", "virtual-editor__input", "virtual-editor__status"]);

function validateDom(dom) {
  if (dom?.protocol !== VIRTUAL_DOM_PROTOCOL || dom.root !== "editor-root" || !dom.nodes || Object.keys(dom.nodes).length > 16) throw new Error("Guest returned an unsupported virtual DOM");
  for (const node of Object.values(dom.nodes)) {
    if (node.kind === "text") {
      if (typeof node.text !== "string" || node.text.length > 100_000) throw new Error("Invalid virtual text node");
    } else if (node.kind !== "element" || !ALLOWED_TAGS.has(node.tag) || !Array.isArray(node.children)) throw new Error("Invalid virtual element");
  }
  if (dom.nodes.input.props.value.length > 100_000) throw new Error("Editor content exceeds its limit");
  return dom;
}

function materialize(dom, id, elements) {
  const node = dom.nodes[id];
  if (node.kind === "text") {
    const text = document.createTextNode(node.text);
    elements.set(id, text);
    return text;
  }
  const element = document.createElement(node.tag);
  elements.set(id, element);
  syncElement(element, node);
  for (const child of node.children) element.append(materialize(dom, child, elements));
  return element;
}

function syncElement(element, node) {
  const props = node.props || {};
  if (props.className !== undefined) {
    if (!ALLOWED_CLASSES.has(props.className)) throw new Error("Virtual DOM class rejected");
    element.className = props.className;
  }
  if (node.tag === "button") { element.type = "button"; element.disabled = Boolean(props.disabled); }
  if (node.tag === "textarea") {
    if (element.value !== props.value) element.value = props.value;
    element.spellcheck = false;
  }
}

function syncBatch(dom, batch, elements) {
  const changed = new Set(batch.operations.map((operation) => operation.path[1]).filter(Boolean));
  for (const id of changed) {
    const node = dom.nodes[id];
    const element = elements.get(id);
    if (node?.kind === "text") element.data = node.text;
    else if (node && element) syncElement(element, node);
  }
  const input = elements.get("input");
  if (document.activeElement === input && (input.selectionStart !== dom.nodes.input.props.selectionStart || input.selectionEnd !== dom.nodes.input.props.selectionEnd)) {
    input.setSelectionRange(dom.nodes.input.props.selectionStart, dom.nodes.input.props.selectionEnd);
  }
}

function textEdit(before, after) {
  let from = 0;
  while (from < before.length && from < after.length && before[from] === after[from]) from += 1;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > from && afterEnd > from && before[beforeEnd - 1] === after[afterEnd - 1]) { beforeEnd -= 1; afterEnd -= 1; }
  return { from, deleteCount: beforeEnd - from, insert: after.slice(from, afterEnd) };
}

export async function mountVirtualDomEditor({ root, guestSource, content = "", onTransition = () => {}, onError = console.error }) {
  if (!(root instanceof Element)) throw new TypeError("A DOM root is required");
  const sandbox = await createSandbox({ memoryLimitBytes: 48 * 1024 * 1024, maxStackBytes: 2 * 1024 * 1024, role: "virtual-dom-editor" });
  sandbox.evalGlobal(guestSource, "virtual-dom-guest.js");
  const configured = sandbox.callJsonFunction("__virtualDomConfigure", { content });
  const dom = validateDom(configured.dom);
  if (digestVirtualDom(dom) !== configured.digest) throw new Error("Initial virtual DOM digest mismatch");
  const elements = new Map();
  root.replaceChildren(materialize(dom, dom.root, elements));
  let destroyed = false;
  let queuedInput = null;
  let inputFrame = 0;

  function dispatch(action) {
    if (destroyed) return;
    try {
      const result = sandbox.callJsonFunction("__virtualDomDispatch", { component: dom.root, action: { ...action, baseRevision: dom.revision } });
      if (result.rejected) throw new Error(`Virtual DOM transition rejected: ${result.reason}`);
      applyBatch(dom, result.batch);
      validateDom(dom);
      if (digestVirtualDom(dom) !== result.digest) throw new Error("Host and guest virtual DOM objects diverged");
      syncBatch(dom, result.batch, elements);
      onTransition(result, action);
    } catch (error) { onError(error); }
  }

  // A frame boundary absorbs the input/selection chatter produced by one paste,
  // autofill, IME commit, or other browser editing transaction.
  function queueInput(element) {
    queuedInput = { type: "input", edit: textEdit(dom.nodes.input.props.value, element.value), selectionStart: element.selectionStart, selectionEnd: element.selectionEnd };
    if (inputFrame) return;
    inputFrame = requestAnimationFrame(() => { inputFrame = 0; const action = queuedInput; queuedInput = null; dispatch(action); });
  }

  root.addEventListener("input", (event) => { if (event.target === elements.get("input")) queueInput(event.target); });
  root.addEventListener("select", (event) => {
    if (event.target !== elements.get("input")) return;
    if (queuedInput) return;
    if (event.target.selectionStart === dom.nodes.input.props.selectionStart && event.target.selectionEnd === dom.nodes.input.props.selectionEnd) return;
    dispatch({ type: "select", selectionStart: event.target.selectionStart, selectionEnd: event.target.selectionEnd });
  });
  root.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.action;
    if (action) dispatch({ type: action });
  });
  for (const id of ["undo", "redo"]) elements.get(id).dataset.action = dom.nodes[id].props.action;
  const input = elements.get("input");
  input.focus();
  return Object.freeze({
    inspect() { return { host: dom, guest: sandbox.callJsonFunction("__virtualDomInspect", {}) }; },
    focus() { elements.get("input")?.focus(); },
    destroy() { if (destroyed) return; destroyed = true; if (inputFrame) cancelAnimationFrame(inputFrame); root.replaceChildren(); sandbox.dispose(); },
  });
}

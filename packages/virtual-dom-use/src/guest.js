import { applyBatch, createEditorDom, digestVirtualDom } from "./model.js";

const MAX_HISTORY = 200;
const state = { history: [], cursor: -1 };
let dom = createEditorDom("");

function remember(type, values) {
  state.history.splice(state.cursor + 1);
  state.history.push({
    type,
    content: String(values.content),
    selectionStart: Number(values.selectionStart) || 0,
    selectionEnd: Number(values.selectionEnd) || 0,
  });
  if (state.history.length > MAX_HISTORY) state.history.shift();
  state.cursor = state.history.length - 1;
}

function editorBatch(values, edit = null) {
  const content = String(values.content);
  const selectionStart = Math.max(0, Math.min(content.length, Number(values.selectionStart) || 0));
  const selectionEnd = Math.max(selectionStart, Math.min(content.length, Number(values.selectionEnd) || selectionStart));
  const nextRevision = dom.revision + 1;
  return {
    protocol: dom.protocol,
    baseRevision: dom.revision,
    revision: nextRevision,
    operations: [
      edit
        ? { op: "spliceText", path: ["nodes", "input", "props", "value"], ...edit }
        : { op: "set", path: ["nodes", "input", "props", "value"], value: content },
      { op: "set", path: ["nodes", "input", "props", "selectionStart"], value: selectionStart },
      { op: "set", path: ["nodes", "input", "props", "selectionEnd"], value: selectionEnd },
      { op: "set", path: ["nodes", "metrics-label", "text"], value: `${content === "" ? 1 : content.split("\n").length} lines · ${content.length} characters` },
      { op: "set", path: ["nodes", "undo", "props", "disabled"], value: state.cursor <= 0 },
      { op: "set", path: ["nodes", "redo", "props", "disabled"], value: state.cursor < 0 || state.cursor >= state.history.length - 1 },
      { op: "set", path: ["nodes", "status-label", "text"], value: `Guest revision ${nextRevision} · ${state.history.length} stored transitions` },
    ],
  };
}

function selectionBatch(start, end) {
  const contentLength = dom.nodes.input.props.value.length;
  const selectionStart = Math.max(0, Math.min(contentLength, Number(start) || 0));
  const selectionEnd = Math.max(selectionStart, Math.min(contentLength, Number(end) || selectionStart));
  const revision = dom.revision + 1;
  return {
    protocol: dom.protocol, baseRevision: dom.revision, revision,
    operations: [
      { op: "set", path: ["nodes", "input", "props", "selectionStart"], value: selectionStart },
      { op: "set", path: ["nodes", "input", "props", "selectionEnd"], value: selectionEnd },
      { op: "set", path: ["nodes", "status-label", "text"], value: `Guest revision ${revision} · ${state.history.length} stored transitions` },
    ],
  };
}

function commit(batch) {
  applyBatch(dom, batch);
  return { rejected: false, batch, digest: digestVirtualDom(dom) };
}

globalThis.__virtualDomConfigure = (json) => {
  const payload = JSON.parse(json);
  dom = createEditorDom(String(payload?.content || ""));
  state.history = [];
  state.cursor = -1;
  remember("configure", { content: dom.nodes.input.props.value, selectionStart: 0, selectionEnd: 0 });
  const batch = editorBatch({ content: dom.nodes.input.props.value, selectionStart: 0, selectionEnd: 0 });
  commit(batch);
  return JSON.stringify({ dom, digest: digestVirtualDom(dom) });
};

globalThis.__virtualDomDispatch = (json) => {
  const envelope = JSON.parse(json);
  const action = envelope.action;
  if (envelope.component !== "editor-root") return JSON.stringify({ rejected: true, reason: "unknown-component", revision: dom.revision });
  if (action?.baseRevision !== dom.revision) return JSON.stringify({ rejected: true, reason: "stale-revision", revision: dom.revision });

  if (action.type === "input") {
    const current = dom.nodes.input.props.value;
    const edit = action.edit;
    if (!edit || !Number.isSafeInteger(edit.from) || !Number.isSafeInteger(edit.deleteCount) || typeof edit.insert !== "string") return JSON.stringify({ rejected: true, reason: "invalid-edit", revision: dom.revision });
    const content = current.slice(0, edit.from) + edit.insert + current.slice(edit.from + edit.deleteCount);
    const values = { content, selectionStart: action.selectionStart, selectionEnd: action.selectionEnd };
    remember("input", values);
    return JSON.stringify(commit(editorBatch(values, edit)));
  }
  if (action.type === "select") {
    return JSON.stringify(commit(selectionBatch(action.selectionStart, action.selectionEnd)));
  }
  if (action.type === "undo" && state.cursor > 0) state.cursor -= 1;
  else if (action.type === "redo" && state.cursor < state.history.length - 1) state.cursor += 1;
  else return JSON.stringify({ rejected: false, batch: { protocol: dom.protocol, baseRevision: dom.revision, revision: dom.revision, operations: [] }, digest: digestVirtualDom(dom) });
  return JSON.stringify(commit(editorBatch(state.history[state.cursor])));
};

globalThis.__virtualDomInspect = () => JSON.stringify({ dom, digest: digestVirtualDom(dom), history: state.history });

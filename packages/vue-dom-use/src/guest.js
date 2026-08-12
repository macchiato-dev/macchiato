import { computed, reactive } from "vue";

const MAX_HISTORY = 200;
const state = reactive({
  revision: 0,
  content: "",
  selectionStart: 0,
  selectionEnd: 0,
  history: [],
  cursor: -1,
});

const view = computed(() => ({
  revision: state.revision,
  content: state.content,
  selectionStart: state.selectionStart,
  selectionEnd: state.selectionEnd,
  lines: state.content === "" ? 1 : state.content.split("\n").length,
  characters: state.content.length,
  canUndo: state.cursor > 0,
  canRedo: state.cursor >= 0 && state.cursor < state.history.length - 1,
  transitionCount: state.history.length,
  tree: {
    type: "editor",
    component: "editor-root",
    children: ["toolbar", "textarea", "status"],
  },
}));

function snapshot() {
  return JSON.parse(JSON.stringify(view.value));
}

function patchesBetween(before, after, path = [], patches = []) {
  if (Object.is(before, after)) return patches;
  const beforeObject = before !== null && typeof before === "object";
  const afterObject = after !== null && typeof after === "object";
  if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after)) {
    patches.push({ op: "set", path, value: after });
    return patches;
  }
  if (Array.isArray(after)) {
    if (before.length !== after.length || before.some((value, index) => !Object.is(value, after[index]))) {
      patches.push({ op: "set", path, value: after });
    }
    return patches;
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) patches.push({ op: "delete", path: [...path, key] });
  }
  for (const key of Object.keys(after)) {
    if (!(key in before)) patches.push({ op: "set", path: [...path, key], value: after[key] });
    else patchesBetween(before[key], after[key], [...path, key], patches);
  }
  return patches;
}

function remember(type) {
  state.history.splice(state.cursor + 1);
  state.history.push({
    type,
    revision: state.revision,
    content: state.content,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
  });
  if (state.history.length > MAX_HISTORY) state.history.shift();
  state.cursor = state.history.length - 1;
}

function restore(entry) {
  state.content = entry.content;
  state.selectionStart = entry.selectionStart;
  state.selectionEnd = entry.selectionEnd;
  state.revision += 1;
}

globalThis.__vueDomConfigure = (json) => {
  const payload = JSON.parse(json);
  state.content = String(payload?.content || "");
  state.selectionStart = state.selectionEnd = 0;
  state.revision = 0;
  state.history.splice(0);
  state.cursor = -1;
  remember("configure");
  return JSON.stringify(snapshot());
};

globalThis.__vueDomDispatch = (json) => {
  const envelope = JSON.parse(json);
  const action = envelope.action;
  if (envelope.component !== "editor-root") {
    return JSON.stringify({ rejected: true, reason: "unknown-component", revision: state.revision, patches: [] });
  }
  if (action?.baseRevision !== state.revision) {
    return JSON.stringify({ rejected: true, reason: "stale-revision", revision: state.revision, patches: [] });
  }
  const before = snapshot();
  if (action.type === "input") {
    state.content = String(action.value || "");
    state.selectionStart = Number(action.selectionStart || 0);
    state.selectionEnd = Number(action.selectionEnd || state.selectionStart);
    state.revision += 1;
    remember("input");
  } else if (action.type === "select") {
    state.selectionStart = Number(action.selectionStart || 0);
    state.selectionEnd = Number(action.selectionEnd || state.selectionStart);
    state.revision += 1;
  } else if (action.type === "undo" && state.cursor > 0) {
    state.cursor -= 1;
    restore(state.history[state.cursor]);
  } else if (action.type === "redo" && state.cursor < state.history.length - 1) {
    state.cursor += 1;
    restore(state.history[state.cursor]);
  }
  const after = snapshot();
  return JSON.stringify({
    rejected: false,
    baseRevision: before.revision,
    revision: after.revision,
    patches: patchesBetween(before, after),
  });
};

globalThis.__vueDomInspect = () => JSON.stringify({
  view: snapshot(),
  transitions: JSON.parse(JSON.stringify(state.history)),
});

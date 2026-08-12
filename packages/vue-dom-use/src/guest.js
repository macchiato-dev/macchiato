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
    return JSON.stringify({ rejected: true, reason: "unknown-component", view: snapshot() });
  }
  if (action?.baseRevision !== state.revision) {
    return JSON.stringify({ rejected: true, reason: "stale-revision", view: snapshot() });
  }
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
  return JSON.stringify({ rejected: false, view: snapshot() });
};

globalThis.__vueDomInspect = () => JSON.stringify({
  view: snapshot(),
  transitions: JSON.parse(JSON.stringify(state.history)),
});

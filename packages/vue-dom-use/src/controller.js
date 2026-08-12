import { createApp, h, reactive } from "vue";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const MAX_CONTENT = 100_000;
const PATCHABLE_PATHS = new Set([
  "revision", "content", "selectionStart", "selectionEnd", "lines", "characters",
  "canUndo", "canRedo", "transitionCount",
]);

function validateView(view) {
  if (!view || view.tree?.type !== "editor") throw new Error("Vue guest returned an unsupported view shape");
  if (typeof view.content !== "string" || view.content.length > MAX_CONTENT) throw new Error("Vue editor content exceeds its limit");
  if (!Number.isSafeInteger(view.revision) || view.revision < 0) throw new Error("Vue guest revision is invalid");
  return view;
}

function applyPatches(model, result) {
  if (!Array.isArray(result.patches) || result.patches.length > 32) throw new Error("Vue guest returned an invalid patch batch");
  for (const patch of result.patches) {
    if (patch?.op !== "set" || !Array.isArray(patch.path) || patch.path.length !== 1 || !PATCHABLE_PATHS.has(patch.path[0])) {
      throw new Error("Vue guest attempted an unsupported view patch");
    }
    model[patch.path[0]] = patch.value;
  }
  validateView(model);
  if (model.revision !== result.revision) throw new Error("Vue guest patch revision does not match");
}

export async function mountVueDomEditor({
  root,
  guestSource,
  content = "",
  onChange = () => {},
  onTransition = () => {},
  onError = console.error,
}) {
  if (!(root instanceof Element)) throw new TypeError("A DOM root is required");
  const sandbox = await createSandbox({ memoryLimitBytes: 64 * 1024 * 1024, maxStackBytes: 2 * 1024 * 1024, role: "vue-dom-editor" });
  sandbox.evalGlobal("globalThis.process = { env: { NODE_ENV: 'production' } };", "vue-dom-environment.js");
  sandbox.evalGlobal(guestSource, "vue-dom-guest.js");
  const model = reactive(validateView(sandbox.callJsonFunction("__vueDomConfigure", { content })));
  let destroyed = false;
  let textarea = null;

  function apply(result) {
    applyPatches(model, result);
    queueMicrotask(() => {
      if (!textarea || document.activeElement !== textarea) return;
      textarea.setSelectionRange(model.selectionStart, model.selectionEnd);
    });
  }

  function dispatch(action) {
    if (destroyed) return;
    try {
      const result = sandbox.callJsonFunction("__vueDomDispatch", {
        component: model.tree.component,
        action: { ...action, baseRevision: model.revision },
      });
      if (result.rejected) throw new Error(`Vue transition rejected: ${result.reason}`);
      apply(result);
      if (action.type === "input") onChange(model.content, { revision: model.revision });
      onTransition(result, action);
    } catch (error) {
      onError(error);
    }
  }

  const component = {
    setup() {
      return () => h("section", { class: "vue-editor" }, [
        h("div", { class: "vue-editor__toolbar" }, [
          h("strong", "Vue boundary editor"),
          h("span", `${model.lines} lines · ${model.characters} characters`),
          h("button", { type: "button", disabled: !model.canUndo, onClick: () => dispatch({ type: "undo" }) }, "Undo"),
          h("button", { type: "button", disabled: !model.canRedo, onClick: () => dispatch({ type: "redo" }) }, "Redo"),
        ]),
        h("textarea", {
          ref: (element) => { textarea = element; },
          class: "vue-editor__input",
          value: model.content,
          spellcheck: false,
          onInput: (event) => dispatch({ type: "input", value: event.target.value, selectionStart: event.target.selectionStart, selectionEnd: event.target.selectionEnd }),
          onSelect: (event) => dispatch({ type: "select", selectionStart: event.target.selectionStart, selectionEnd: event.target.selectionEnd }),
        }),
        h("div", { class: "vue-editor__status" }, `Guest revision ${model.revision} · ${model.transitionCount} stored transitions`),
      ]);
    },
  };
  const app = createApp(component);
  app.mount(root);
  return Object.freeze({
    inspect() { return sandbox.callJsonFunction("__vueDomInspect", {}); },
    focus() { textarea?.focus(); },
    destroy() { if (destroyed) return; destroyed = true; app.unmount(); sandbox.dispose(); },
  });
}

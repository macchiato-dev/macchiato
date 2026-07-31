import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { BrowserDomHost, CODE_EDITOR_DOM_POLICY } from "/code-editor-host.js";

const root = document.getElementById("editor");
const status = document.getElementById("status");
const shape = document.getElementById("shape");
let sandbox;
let stopped = false;
let dragAnchor = null;
let pendingDragPoint = null;
let dragFrame = 0;

function summary(message) {
  const current = host.inspect();
  status.textContent = `QuickJS owns ${message.characters} characters across ${message.lines} line${message.lines === 1 ? "" : "s"}.`;
  shape.textContent = `${current.elements} constrained DOM elements`;
}

const host = new BrowserDomHost(root, CODE_EDITOR_DOM_POLICY, {
  onViolation(error) {
    stopped = true;
    console.error("code-editor-use shape violation", error);
    status.textContent = `Editor stopped: ${error.message}`;
    status.dataset.state = "error";
  },
  onEvent(listenerId, event, nativeEvent) {
    if (!sandbox || stopped) return;
    const result = sandbox.callJsonFunction("__browserUseDispatchEvent", { listenerId, event });
    if (result.preventDefault) nativeEvent.preventDefault();
    if (result.stopPropagation) nativeEvent.stopPropagation();
  },
});

sandbox = await createSandbox();
sandbox.installJsonHostFunction("__browserUseHost", (message) => host.dispatch(message));
sandbox.installJsonHostFunction("__browserUseNotify", (message) => {
  summary(message);
  return {};
});
sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
sandbox.evalGlobal(await (await fetch("/code-editor-guest.js")).text(), "code-editor-quickjs.js");

function documentLocationFromPoint(x, y) {
  const content = root.querySelector(".cm-content");
  if (!content) return null;
  const lines = Array.from(content.querySelectorAll(":scope > .cm-line"));
  if (!lines.length) return null;
  const line = lines.reduce((nearest, candidate) => {
    const rect = candidate.getBoundingClientRect();
    const distance = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    return !nearest || distance < nearest.distance ? { element: candidate, distance } : nearest;
  }, null).element;
  const lineIndex = lines.indexOf(line);
  const lineRect = line.getBoundingClientRect();
  let lineOffset;
  if (x <= lineRect.left) {
    lineOffset = 0;
  } else if (x >= lineRect.right) {
    lineOffset = line.textContent.length;
  } else {
    const sampleY = Math.max(lineRect.top + 1, Math.min(lineRect.bottom - 1, y));
    const caret = document.caretPositionFromPoint?.(x, sampleY);
    const fallback = caret ? null : document.caretRangeFromPoint?.(x, sampleY);
    const node = caret?.offsetNode || fallback?.startContainer;
    const offset = caret?.offset ?? fallback?.startOffset;
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (node && element && line.contains(element)) {
      const range = document.createRange();
      range.setStart(line, 0);
      try {
        range.setEnd(node, offset);
        lineOffset = range.toString().length;
      } catch {}
    }
    if (lineOffset == null) lineOffset = x < (lineRect.left + lineRect.right) / 2 ? 0 : line.textContent.length;
  }
  lineOffset = Math.max(0, Math.min(line.textContent.length, lineOffset));
  return { renderedLineIndex: lineIndex, lineOffset, text: line.textContent };
}

function selectAtPoint(event, anchor) {
  const location = documentLocationFromPoint(event.clientX, event.clientY);
  if (!location) return false;
  const selection = sandbox.callJsonFunction("__codeEditorSelect", { anchor, headLocation: location });
  sandbox.callJsonFunction("__browserUseFlush", {});
  root.querySelector(".cm-content")?.focus({ preventScroll: true });
  return selection;
}

root.addEventListener("mousedown", (event) => {
  if (stopped || event.button !== 0 || !event.target.closest?.(".cm-content")) return;
  const location = documentLocationFromPoint(event.clientX, event.clientY);
  if (!location) return;
  if (event.detail === 2) {
    const word = /[\p{L}\p{N}_$]/u;
    let probe = Math.min(location.text.length - 1, location.lineOffset);
    if (probe >= 0 && !word.test(location.text[probe]) && probe > 0 && word.test(location.text[probe - 1])) probe -= 1;
    let from = probe;
    let to = probe + 1;
    while (from > 0 && word.test(location.text[from - 1])) from -= 1;
    while (to < location.text.length && word.test(location.text[to])) to += 1;
    dragAnchor = null;
    sandbox.callJsonFunction("__codeEditorSelect", {
      anchorLocation: { ...location, lineOffset: from },
      headLocation: { ...location, lineOffset: to },
    });
    sandbox.callJsonFunction("__browserUseFlush", {});
  } else {
    const existing = event.shiftKey ? sandbox.callJsonFunction("__codeEditorGetSelection", {}) : null;
    const selected = selectAtPoint(event, existing?.anchor);
    dragAnchor = existing?.anchor ?? selected?.anchor ?? null;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
window.addEventListener("mousemove", (event) => {
  if (dragAnchor == null || !(event.buttons & 1)) return;
  pendingDragPoint = { clientX: event.clientX, clientY: event.clientY };
  if (!dragFrame) {
    dragFrame = requestAnimationFrame(() => {
      dragFrame = 0;
      if (pendingDragPoint && dragAnchor != null) selectAtPoint(pendingDragPoint, dragAnchor);
      pendingDragPoint = null;
    });
  }
  event.preventDefault();
}, true);
window.addEventListener("mouseup", (event) => {
  if (dragAnchor != null) selectAtPoint(event, dragAnchor);
  dragAnchor = null;
  pendingDragPoint = null;
}, true);

root.addEventListener("beforeinput", (event) => {
  if (stopped) return;
  const result = sandbox.callJsonFunction("__codeEditorBeforeInput", {
    inputType: event.inputType,
    data: event.data,
  });
  sandbox.callJsonFunction("__browserUseFlush", {});
  if (result.handled) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
root.addEventListener("keydown", (event) => {
  if (stopped) return;
  const result = sandbox.callJsonFunction("__codeEditorCommand", {
    key: event.key,
    code: event.code,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    mod: event.ctrlKey || event.metaKey,
  });
  sandbox.callJsonFunction("__browserUseFlush", {});
  if (result.handled) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
host.start();
globalThis.__codeEditorBridge = Object.freeze({
  command(payload) {
    const result = sandbox.callJsonFunction("__codeEditorCommand", payload);
    sandbox.callJsonFunction("__browserUseFlush", {});
    return result;
  },
  inspect() {
    return sandbox.callJsonFunction("__codeEditorInspect", {});
  },
});
document.body.dataset.ready = "true";

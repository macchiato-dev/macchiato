import { mountQuickJsCodeEditor } from "@macchiato-dev/code-editor-use/controller";
import { BrowserDomHost } from "@macchiato-dev/browser-use";
import { browserUseQuickJsDomGuestSource } from "@macchiato-dev/browser-use/quickjs-dom-guest";
import { CanvasUseHost } from "@macchiato-dev/canvas-use";
import { createSandbox, getOrCreateRoleSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { mountPresentationUse } from "@macchiato-dev/presentation-use";

export async function mountResourcesProjectEditor(options) {
  const frontend = await getOrCreateRoleSandbox("resources-frontend", {
    wasmMachine: "dedicated",
    memoryLimitBytes: 16 * 1024 * 1024,
    maxStackBytes: 512 * 1024,
  });
  frontend.evalGlobal("globalThis.__resourcesProjectWorkspaceLoaded = true", "resources-project-workspace.js");
  document.documentElement.dataset.resourcesFrontendMachine = "quickjs";
  document.documentElement.dataset.resourcesFrontendMachineId = frontend.inspectMachine().machineId;
  const guestSource = await (await fetch("/-/resources-site/project-editor-guest.js")).text();
  const controller = await mountQuickJsCodeEditor({
    ...options,
    guestSource,
    limits: { ...options.limits, wasmMachine: "dedicated", role: "resources-project-editor" },
  });
  return Object.freeze({
    ...controller,
    history: Object.freeze({
      initialize(value) { return controller.callGuest("__resourcesProjectHistoryInitialize", value); },
      setCurrent(snapshot) { return controller.callGuest("__resourcesProjectHistorySetCurrent", { snapshot }); },
      checkpoint(snapshot, options = {}) {
        return controller.callGuest("__resourcesProjectHistoryCheckpoint", {
          snapshot,
          now: options.now || Date.now(),
          destructive: options.destructive === true,
          checkpointIntervalMs: options.checkpointIntervalMs,
        });
      },
      inspect() { return controller.callGuest("__resourcesProjectHistoryInspect", {}); },
    }),
    projectStatus: Object.freeze({
      begin(generation) { return controller.callGuest("__resourcesProjectStatusBegin", { generation }); },
      report(generation, event) { return controller.callGuest("__resourcesProjectStatusReport", { generation, event }); },
      inspect() { return controller.callGuest("__resourcesProjectStatusInspect", {}); },
    }),
  });
}

export function mountResourcesPresentation(options) {
  return mountPresentationUse({ runnerUrl: "/-/resources-site/presentation-runner.html", ...options });
}

function previewPolicy(tags) {
  return {
    tags,
    events: ["click", "input", "change", "keydown", "keyup"],
    attributes: {
      id: "^[A-Za-z][A-Za-z0-9_-]{0,80}$", class: "^[A-Za-z0-9 _-]{0,160}$",
      href: "^https://", target: "^_blank$", title: "^[^<>]{0,200}$",
      width: "^[0-9]{1,5}$", height: "^[0-9]{1,5}$", "aria-label": "^[^<>]{0,160}$",
      role: "^(?:img|link|article)$", "aria-labelledby": "^[A-Za-z][A-Za-z0-9_-]{0,80}$",
      viewBox: "^[-0-9. ]+$", x: "^[-0-9.]+$", y: "^[-0-9.]+$", x1: "^[-0-9.]+$", y1: "^[-0-9.]+$",
      x2: "^[-0-9.]+$", y2: "^[-0-9.]+$", cx: "^[-0-9.]+$", cy: "^[-0-9.]+$", r: "^[0-9.]+$", rx: "^[0-9.]+$", ry: "^[0-9.]+$",
      d: "^[- A-Za-z0-9.,]+$", points: "^[- 0-9.,]+$", fill: "^(?:none|#[0-9A-Fa-f]{3,8}|url\\(#[A-Za-z0-9_-]+\\))$",
      stroke: "^(?:none|#[0-9A-Fa-f]{3,8})$", "stroke-width": "^[0-9.]+$", offset: "^[0-9.%]+$", "stop-color": "^#[0-9A-Fa-f]{3,8}$",
      gradientUnits: "^userSpaceOnUse$", xlink: "^[A-Za-z0-9_-]+$",
    },
    classNames: ["^[A-Za-z][A-Za-z0-9_-]*$"], maxElements: 1_000, maxDepth: 30, maxTextLength: 200_000,
  };
}

export async function mountResourcesProjectPreview({ root, statusRoot = root, scripts, violations = [], tags, onViolation = () => {} }) {
  let sandbox;
  const host = new BrowserDomHost(root, previewPolicy(tags), {
    onViolation,
    onEvent(listenerId, event, nativeEvent) {
      const result = sandbox?.callJsonFunction("__browserUseDispatchEvent", { listenerId, event }) || {};
      if (result.preventDefault) nativeEvent.preventDefault();
      if (result.stopPropagation) nativeEvent.stopPropagation();
    },
  });
  const canvas = new CanvasUseHost(host);
  host.start();
  if (violations.length) {
    statusRoot.dataset.previewViolations = String(violations.length);
    violations.forEach(onViolation);
  }
  try {
    sandbox = await createSandbox({
      memoryLimitBytes: 32 * 1024 * 1024,
      maxStackBytes: 512 * 1024,
      wasmMachine: "dedicated",
      role: "resources-project",
    });
    sandbox.installJsonHostFunction("__browserUseHost", (message) => message.op === "canvas" ? canvas.dispatch(message) : host.dispatch(message));
    sandbox.evalGlobal(browserUseQuickJsDomGuestSource, "browser-use-dom-guest.js");
    scripts.forEach((script) => sandbox.evalGlobal(script.code, script.source));
  } catch (error) {
    host.destroy();
    sandbox?.dispose?.();
    throw error;
  }
  statusRoot.dataset.previewRuntime = scripts.length ? "quickjs" : "quickjs-static";
  let stopped = false;
  const timer = setInterval(() => {
    if (stopped) return;
    try {
      canvas.renewCommandBudget();
      sandbox.callJsonFunction("__browserUseTick", {});
      statusRoot.dataset.canvasCommands = String(canvas.inspect().commands);
    } catch (error) {
      stopped = true;
      clearInterval(timer);
      onViolation(error);
    }
  }, 50);
  return {
    inspect: () => ({ runtime: scripts.length ? "quickjs" : "quickjs-static", machine: sandbox.inspectMachine(), violations: violations.length, canvas: canvas.inspect() }),
    destroy() { stopped = true; clearInterval(timer); host.destroy(); sandbox.dispose?.(); },
  };
}

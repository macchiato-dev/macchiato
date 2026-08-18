import { mountQuickJsCodeEditor } from "@macchiato-dev/code-editor-use/controller";
import { getOrCreateRoleSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { mountPresentationUse } from "@macchiato-dev/presentation-use";
import { createProjectOutputMachine } from "./project-machines.js";

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

export async function mountResourcesProjectPreview({ root, statusRoot = root, scripts, violations = [], tags, onViolation = () => {} }) {
  if (violations.length) {
    statusRoot.dataset.previewViolations = String(violations.length);
    violations.forEach(onViolation);
  }
  let controller;
  try {
    controller = await createProjectOutputMachine({
      root,
      scripts,
      options: {
        services: {
          route: { get: () => location.pathname, listen() {} },
          storage: { get: () => null, set() {}, delete() {}, listen() {} },
        },
      },
    });
  } catch (error) {
    throw error;
  }
  statusRoot.dataset.previewRuntime = scripts.length ? "quickjs" : "quickjs-static";
  return {
    inspect: () => ({ ...controller.inspect(), violations: violations.length }),
    destroy() { controller.destroy(); },
  };
}

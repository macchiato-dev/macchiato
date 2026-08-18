import { mountPresentationUse } from "@macchiato-dev/presentation-use";
import { createProjectAppMachine, createProjectEditorMachine, createProjectOutputMachine } from "./project-machines.js";

export async function mountResourcesProjectEditor(options) {
  const frontend = await createProjectAppMachine(options.root);
  document.documentElement.dataset.resourcesFrontendMachine = "quickjs";
  document.documentElement.dataset.resourcesFrontendMachineId = frontend.machineId;
  const controller = await createProjectEditorMachine({
    root: options.root,
    onChange: options.onChange,
    onReady: options.onReady,
    onLimit: options.onLimit,
  });
  return Object.freeze({
    ...controller,
    destroy() { controller.destroy(); frontend.destroy(); },
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

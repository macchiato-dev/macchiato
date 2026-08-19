import { mountPresentationUse } from "@macchiato-dev/presentation-use";
import { createConstrainedFetch, createProjectAppMachine, createProjectEditorMachine, createProjectOutputMachine } from "./project-machines.js";

export { createConstrainedFetch, createProjectOutputMachine };

const projectApps = new WeakMap();

export async function mountResourcesProjectEditor(options) {
  if (!projectApps.has(options.root)) projectApps.set(options.root, createProjectAppMachine(options.root));
  const frontend = await projectApps.get(options.root);
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
    destroy() { controller.destroy(); },
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
    projectOutput: Object.freeze({
      request(generation) { return controller.requestOutput(generation); },
    }),
  });
}

export function mountResourcesPresentation(options) {
  return mountPresentationUse({ runnerUrl: "/-/resources-site/presentation-runner.html", ...options });
}

export async function mountResourcesProjectPreview({ root, statusRoot = root, scripts, violations = [], tags, allowedFetchOrigins = [], onViolation = () => {} }) {
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
        frameInterval: () => document.activeElement?.closest(".cm-editor") ? 1_000 : 50,
        fetchResource: createConstrainedFetch(allowedFetchOrigins),
        services: {
          route: { get: () => location.pathname, listen() {} },
          storage: { get: () => null, set() {}, delete() {}, listen() {} },
        },
      },
      onError: onViolation,
    });
  } catch (error) {
    throw error;
  }
  statusRoot.dataset.previewRuntime = scripts.length ? "quickjs" : "quickjs-static";
  return {
    inspect: () => ({ ...controller.inspect(), violations: violations.length }),
    setContent(tree) { return controller.setContent(tree); },
    run(scripts) { return controller.run(scripts); },
    destroy() { controller.destroy(); },
  };
}

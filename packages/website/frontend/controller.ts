// @ts-nocheck -- migrated controller; boundary types are being added incrementally.
import WasmWebMachine from "./machine.js";
import { ResourcesArchiveDevice, ResourcesBuildDevice, ResourcesEditorDevice, ResourcesFetchDevice, ResourcesOutputDevice,
  ResourcesProjectResourceDevice, ResourcesStorageDevice } from "../resources-machine-devices.js";

const encoder = new TextEncoder();
let nextMachine = 1;

function callMessage(name, payload) {
  const fn = encoder.encode(name);
  const argument = encoder.encode(JSON.stringify(payload));
  const message = new Uint8Array(2 + fn.length + argument.length);
  message[0] = 2;
  message.set(fn, 1);
  message.set(argument, fn.length + 2);
  return message;
}

async function loadModule(url, signal) {
  const response = await fetch(url, { credentials: "same-origin", signal });
  if (!response.ok) throw new Error(`Machine response ${response.status}: ${url}`);
  return WebAssembly.compileStreaming(response);
}

export async function startResourcesMachineController({ editorFrame = true } = {}) {
  let machine, editorDevice, outputDevice;
  let disposed = false;
  const startup = new AbortController();
  function destroy() {
    if (disposed) return;
    disposed = true;
    startup.abort();
    editorDevice?.destroy();
    outputDevice?.destroy();
    machine?.destroy();
    window.removeEventListener("pagehide", pagehide);
  }
  // A BFCache document keeps its machines for restoration. A discarded
  // document cancels owned work, including the first runtime download.
  function pagehide(event) { if (!event.persisted) destroy(); }
  window.addEventListener("pagehide", pagehide);
  let module;
  try { module = await loadModule("/-/resources-site/resources-frontend-microquickjs.wasm", startup.signal); }
  catch (error) {
    if (disposed) return;
    destroy();
    throw error;
  }
  if (disposed) return;
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");

  async function deliver(message) {
    if (disposed) return;
    await machine.onmsg(callMessage("__resourcesFrontendReceive", message));
  }

  const projectResources = new ResourcesProjectResourceDevice();
  const fetchDevice = new ResourcesFetchDevice(window, projectResources);
  const archiveDevice = new ResourcesArchiveDevice(document, projectResources);
  const buildDevice = new ResourcesBuildDevice(projectResources);
  const storageDevice = new ResourcesStorageDevice(window, projectResources);
  let asynchronousServices;
  let editorServices;
  let synchronousServices;

  async function editorRequest(name, payload) {
    const service = editorServices[name];
    if (!service) throw new Error(`Unknown editor service: ${name}`);
    return service(payload);
  }

  function editorCall(name, payload) {
    const service = synchronousServices[name] ||
      (name.startsWith("output.") ? (value) => outputDevice.call(name, value) : null);
    if (!service) throw new Error(`Unknown synchronous editor service: ${name}`);
    return service(payload);
  }

  outputDevice = new ResourcesOutputDevice(document,
    (message) => editorDevice.receiveOutput(message), projectResources);
  editorDevice = new ResourcesEditorDevice(document, deliver, outputDevice, buildDevice,
    storageDevice, projectResources, editorRequest, editorCall);
  asynchronousServices = Object.freeze({
    "archive.import": () => archiveDevice.import(),
    "build.compile": (payload) => buildDevice.compile(payload),
    "build.run": (payload) => buildDevice.run(payload),
    "editor.mount": (payload) => editorDevice.mount({ ...payload, editorFrame }),
    "editor.output.mount": (payload) => editorDevice.mountOutput(payload),
    "fetch": (payload) => fetchDevice.request(payload),
    "output.load": (payload) => outputDevice.load(payload),
    "output.mount": (payload) => outputDevice.mount(payload),
    "output.run": (payload) => outputDevice.run(payload),
    "output.destroy": (payload) => outputDevice.call("output.destroy", payload),
  });
  editorServices = Object.freeze({
    ...asynchronousServices,
    "output.mount": (payload) => editorDevice.mountOutput(payload),
  });
  synchronousServices = Object.freeze({
    "storage.request": (payload) => storageDevice.request(payload),
    "session.recovery": (payload) => storageDevice.readRecovery(payload.key),
    "session.writeRecovery": (payload) => storageDevice.writeRecovery(payload.key, payload.value),
    "navigation.type": () => window.performance.getEntriesByType("navigation")[0]?.type || "navigate",
    "appearance.theme": () => document.documentElement.dataset.theme === "light" ? "light" : "dark",
    "archive.download": (payload) => archiveDevice.download(payload),
    "resource.read": (payload) => projectResources.readChunk(payload.content, payload.offset),
    "project.prepareSubmit": () => editorDevice.prepareSubmission(),
    "editor.workspace.initial": () => editorDevice.getInitialSnapshot(),
    "route.replace": (payload) => {
      const path = String(payload.path || "");
      if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Replacement path is invalid");
      history.replaceState(history.state, "", path);
      return null;
    },
  });

  async function receive(text) {
    if (disposed) return;
    if (text.startsWith("__wwcError:")) {
      document.documentElement.dataset.resourcesFrontendMachineState = "failed";
      console.error("Resources frontend machine:", text.slice(11));
      return;
    }
    let request;
    try { request = JSON.parse(text); } catch { return; }
    if (request.protocol !== "resources-frontend-v1" || !Number.isSafeInteger(request.id)) return;
    try {
      const service = asynchronousServices[request.name];
      if (!service) throw new Error(`Unknown asynchronous service: ${request.name}`);
      const value = await service(request.payload || {});
      await deliver({ id: request.id, value });
    } catch (error) {
      if (disposed) return;
      console.error("Resources controller service:", request.name, error);
      await deliver({ id: request.id, error: error?.message || String(error) });
    }
  }

  machine = new WasmWebMachine(module, document, {
    allowNavigate: "self",
    stamp: sections.length === 1 ? new Uint8Array(sections[0]) : undefined,
    services: {
      call(name, payloadText) {
        const payload = payloadText ? JSON.parse(payloadText) : {};
        const value = name.startsWith("editor.") ? editorDevice.call(name, payload) : editorCall(name, payload);
        return JSON.stringify(value === undefined ? null : value);
      },
      route: { get: () => location.pathname, search: () => location.search, listen() {} },
      storage: storageDevice,
    },
    onMessage: receive,
  });
  const machineId = `resources-frontend-${nextMachine++}`;
  document.documentElement.dataset.resourcesFrontendMachine = "microquickjs";
  document.documentElement.dataset.resourcesFrontendMachineId = machineId;
  document.documentElement.dataset.resourcesFrontendMachineState = "starting";
  try { await machine.onmsg(0); }
  catch (error) { destroy(); throw error; }
  if (disposed) return;
  document.documentElement.dataset.resourcesFrontendMachineState = "ready";
  return Object.freeze({ machineId, destroy });
}

startResourcesMachineController().catch((error) => {
  document.documentElement.dataset.resourcesFrontendMachineState = "failed";
  console.error("Resources Machine Controller:", error);
});

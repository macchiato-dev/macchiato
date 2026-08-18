import WasmWebMachine from "../../dev/wasm-web-machine/dist/module/wasm-web-machine.js";

const encoder = new TextEncoder();
const runtimeModules = new Map();
let nextMachine = 1;

async function moduleFor(url) {
  if (!runtimeModules.has(url)) {
    runtimeModules.set(url, fetch(url, { credentials: "same-origin" }).then((response) => {
      if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
      return WebAssembly.compileStreaming(response);
    }));
  }
  return runtimeModules.get(url);
}

function taggedMessage(tag, value) {
  const bytes = encoder.encode(value);
  const message = new Uint8Array(bytes.length + 1);
  message[0] = tag;
  message.set(bytes, 1);
  return message;
}

function callMessage(name, payload) {
  const functionName = encoder.encode(name);
  const argument = encoder.encode(JSON.stringify(payload));
  const message = new Uint8Array(2 + functionName.length + argument.length);
  message[0] = 2;
  message.set(functionName, 1);
  message.set(argument, functionName.length + 2);
  return message;
}

export async function createProjectOutputMachine({ root, scripts, options = {} }) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  const machine = new WasmWebMachine(module, root, options);
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0);
  for (const script of scripts) await machine.onmsg(taggedMessage(1, script.code));
  return Object.freeze({
    destroy() { machine.destroy(); },
    inspect() { return { runtime: "quickjs", programs: scripts.length, machine: { machineId } }; },
  });
}

export async function createProjectAppMachine(root) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  const machine = new WasmWebMachine(module, root);
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0);
  await machine.onmsg(taggedMessage(1, "globalThis.__resourcesRole='frontend'"));
  return Object.freeze({ machineId, destroy() { machine.destroy(); } });
}

export async function createProjectEditorMachine({ root, onChange, onReady, onLimit }) {
  const module = await moduleFor("/-/resources-site/project-editor-quickjs-runtime.wasm");
  const machineId = `wasm-web-machine-${nextMachine++}`;
  let response;
  const machine = new WasmWebMachine(module, root, {
    onMessage(text) {
      if (text.startsWith("__wwcResponse:")) {
        response = { value: text.slice(14) };
        return;
      }
      const message = JSON.parse(text);
      if (message.type === "change") onChange(message.content);
      else if (message.type === "ready") onReady?.(message);
      else if (message.type === "limit") onLimit?.(message);
    },
  });
  await machine.onmsg(0);
  function call(name, payload) {
    if (!/^__[A-Za-z0-9_]+$/.test(name)) throw new TypeError("Guest function name is invalid");
    response = undefined;
    machine.onmsg(callMessage(name, payload));
    if (!response) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(response.value);
  }
  call("__codeEditorConfigureLimits", { maxLines: 5_000, maxCharacters: 1_000_000 });
  return Object.freeze({
    setContent(content, language = "plain", options = {}) {
      return call("__codeEditorSetContent", { content, language, ...options });
    },
    command(payload) { return call("__codeEditorCommand", payload); },
    callGuest: call,
    inspect() { return { ...call("__codeEditorInspect", {}), machine: { machineId } }; },
    focus() { root.querySelector(".cm-content")?.focus(); },
    destroy() { machine.destroy(); root.replaceChildren(); },
  });
}

import WasmWebMachine from "../../dev/wasm-web-machine/dist/module/wasm-web-machine.js";

const encoder = new TextEncoder();
let runtimeModule;
let nextMachine = 1;

async function moduleFor(url) {
  if (!runtimeModule) {
    runtimeModule = fetch(url, { credentials: "same-origin" }).then((response) => {
      if (!response.ok) throw new Error(`Project runtime response ${response.status}`);
      return WebAssembly.compileStreaming(response);
    });
  }
  return runtimeModule;
}

function sourceMessage(source) {
  const bytes = encoder.encode(source);
  const message = new Uint8Array(bytes.length + 1);
  message[0] = 1;
  message.set(bytes, 1);
  return message;
}

export async function createProjectOutputMachine({ root, scripts, options = {} }) {
  const module = await moduleFor("/-/resources-site/project-quickjs-runtime.wasm");
  const machine = new WasmWebMachine(module, root, options);
  const machineId = `wasm-web-machine-${nextMachine++}`;
  await machine.onmsg(0);
  for (const script of scripts) await machine.onmsg(sourceMessage(script.code));
  return Object.freeze({
    destroy() { machine.destroy(); },
    inspect() { return { runtime: "quickjs", programs: scripts.length, machine: { machineId } }; },
  });
}

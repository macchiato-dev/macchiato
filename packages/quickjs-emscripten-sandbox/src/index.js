import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import singlefileVariant from "@jitl/quickjs-singlefile-browser-release-sync";

/**
 * @typedef {Object} SandboxResult
 * @property {boolean} ok - Whether execution succeeded
 * @property {unknown} [value] - The returned value on success
 * @property {string} [error] - Error message on failure
 */

/** @type {import("quickjs-emscripten-core").QuickJSWASMModule | null} */
let wasmModule = null;

async function getModule() {
  if (!wasmModule) {
    wasmModule = await newQuickJSWASMModuleFromVariant(singlefileVariant);
  }
  return wasmModule;
}

function formatQuickJsError(value) {
  if (value && typeof value === "object") {
    const parts = [];
    if (value.name) parts.push(String(value.name));
    if (value.message) parts.push(String(value.message));
    if (value.stack && !parts.length) parts.push(String(value.stack));
    if (parts.length) return parts.join(": ");
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export class Sandbox {
  /** @type {import("quickjs-emscripten-core").QuickJSRuntime | null} */
  runtime = null;
  /** @type {import("quickjs-emscripten-core").QuickJSContext | null} */
  context = null;
  /** @type {boolean} */
  disposed = false;

  async init() {
    if (this.disposed) throw new Error("Sandbox has been disposed");
    if (this.runtime) return;

    const mod = await getModule();
    this.runtime = mod.newRuntime();
    this.context = this.runtime.newContext();
  }

  /**
   * @param {string} code - JavaScript code to evaluate
   * @returns {SandboxResult}
   */
  run(code) {
    if (!this.context) {
      throw new Error("Sandbox not initialized. Call init() first.");
    }
    if (this.disposed) {
      throw new Error("Sandbox has been disposed");
    }

    const result = this.context.evalCode(code);

    if (result.error) {
      const err = this.context.dump(result.error);
      result.error.dispose();
      return { ok: false, error: formatQuickJsError(err) };
    }

    const value = this.context.dump(result.value);
    result.value.dispose();
    return { ok: true, value };
  }

  evalGlobal(code, filename = "sandbox-global.js") {
    if (!this.context) {
      throw new Error("Sandbox not initialized. Call init() first.");
    }
    const result = this.context.evalCode(code, filename);
    if (result.error) {
      const err = this.context.dump(result.error);
      result.error.dispose();
      throw new Error(formatQuickJsError(err));
    }
    result.value.dispose();
  }

  evalModule(code, filename = "sandbox-module.js") {
    if (!this.context) {
      throw new Error("Sandbox not initialized. Call init() first.");
    }
    const result = this.context.evalCode(code, filename, { type: "module" });
    if (result.error) {
      const err = this.context.dump(result.error);
      result.error.dispose();
      throw new Error(formatQuickJsError(err));
    }
    result.value.dispose();
  }

  callJsonFunction(name, payload, options = {}) {
    if (!this.context) {
      throw new Error("Sandbox not initialized. Call init() first.");
    }
    const argument = options.rawArgument === true ? payload : JSON.stringify(payload);
    const call = `${name}(${JSON.stringify(argument)})`;
    const result = this.context.evalCode(call);
    if (result.error) {
      const err = this.context.dump(result.error);
      result.error.dispose();
      throw new Error(formatQuickJsError(err));
    }
    const text = String(this.context.dump(result.value));
    result.value.dispose();
    if (text.startsWith("__MACCHIATO_ERROR__")) {
      throw new Error(text.slice("__MACCHIATO_ERROR__".length));
    }
    return JSON.parse(text);
  }

  installJsonHostFunction(name, dispatch) {
    if (!this.context) {
      throw new Error("Sandbox not initialized. Call init() first.");
    }
    const hostFunction = this.context.newFunction(name, (messageHandle) => {
      try {
        const message = JSON.parse(this.context.getString(messageHandle));
        return this.context.newString(JSON.stringify(dispatch(message)));
      } catch (err) {
        return this.context.newString(JSON.stringify({ __error: err.message }));
      }
    });
    this.context.setProp(this.context.global, name, hostFunction);
    hostFunction.dispose();
  }

  dispose() {
    this.disposed = true;
    this.context?.dispose();
    this.runtime?.dispose();
    this.context = null;
    this.runtime = null;
  }
}

export async function createSandbox() {
  const sandbox = new Sandbox();
  await sandbox.init();
  return sandbox;
}

/**
 * @param {string} code - JavaScript code to evaluate
 * @returns {Promise<SandboxResult>}
 */
export async function runInSandbox(code) {
  const sandbox = new Sandbox();
  try {
    await sandbox.init();
    return sandbox.run(code);
  } finally {
    sandbox.dispose();
  }
}

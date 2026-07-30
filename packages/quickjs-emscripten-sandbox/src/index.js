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
    if (value.stack) parts.push(String(value.stack));
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
  /**
   * @param {object} [options]
   * @param {Record<string, string|(() => string)>} [options.modules]
   * @param {(moduleName: string, context: import("quickjs-emscripten-core").QuickJSContext) => string|Error|object} [options.moduleLoader]
   * @param {(baseModuleName: string, requestedName: string, context: import("quickjs-emscripten-core").QuickJSContext) => string|Error|object} [options.moduleNormalizer]
   */
  constructor(options = {}) {
    this.options = options;
  }

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
    this.installModuleLoader();
    this.context = this.runtime.newContext();
  }

  installModuleLoader() {
    if (!this.runtime) return;
    const modules = this.options.modules || {};
    const customLoader = this.options.moduleLoader;
    const customNormalizer = this.options.moduleNormalizer;
    if (!customLoader && Object.keys(modules).length === 0) return;

    this.runtime.setModuleLoader(
      (moduleName, context) => {
        if (customLoader) return customLoader(moduleName, context);
        const source = modules[moduleName];
        if (source === undefined) throw new Error(`Module not allowed: ${moduleName}`);
        return typeof source === "function" ? source(moduleName) : String(source);
      },
      customNormalizer || ((_baseModuleName, requestedName) => requestedName),
    );
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

export async function createSandbox(options = {}) {
  const sandbox = new Sandbox(options);
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

export function nodeHttpModuleSource() {
  return `
function host(op, payload = {}) {
  if (typeof globalThis.__macchiatoHost !== "function") {
    throw new Error("node:http wrapper requires __macchiatoHost");
  }
  const result = JSON.parse(globalThis.__macchiatoHost(JSON.stringify({ op, ...payload })));
  if (result && result.__error) throw new Error(result.__error);
  return result;
}

const servers = new Map();

export function createServer(handler) {
  if (typeof handler !== "function") throw new TypeError("createServer requires a handler function");
  const server = host("http.createServer", {});
  servers.set(server.id, handler);
  return {
    id: server.id,
    listen(port, hostName = "127.0.0.1") {
      return host("http.listen", { id: server.id, port, host: hostName });
    },
    close() {
      servers.delete(server.id);
      return host("http.close", { id: server.id });
    },
  };
}

globalThis.__macchiatoHttpDispatch = function(json) {
  const message = JSON.parse(json);
  const handler = servers.get(message.id);
  if (!handler) return JSON.stringify({ status: 503, headers: {}, body: "Server is not available" });
  const response = { status: 200, headers: {}, body: "" };
  const req = {
    method: message.method || "GET",
    url: message.url || "/",
    headers: message.headers || {},
    on(type, callback) {
      if (type === "data" && message.body) callback(message.body);
      if (type === "end") callback();
      return this;
    },
  };
  const res = {
    get statusCode() { return response.status; },
    set statusCode(value) { response.status = Number(value); },
    setHeader(name, value) { response.headers[String(name).toLowerCase()] = String(value); },
    writeHead(status, headers = {}) {
      response.status = Number(status);
      for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
      return this;
    },
    end(body = "") { response.body = String(body); },
  };
  try {
    handler(req, res);
  } catch (error) {
    response.status = 500;
    response.headers["content-type"] = "application/json; charset=utf-8";
    response.body = JSON.stringify({ error: error.message });
  }
  return JSON.stringify(response);
};

export default { createServer };
`;
}

export function nodeSqliteModuleSource() {
  return `
function host(op, payload = {}) {
  if (typeof globalThis.__macchiatoHost !== "function") {
    throw new Error("node:sqlite wrapper requires __macchiatoHost");
  }
  const result = JSON.parse(globalThis.__macchiatoHost(JSON.stringify({ op, ...payload })));
  if (result && result.__error) throw new Error(result.__error);
  return result;
}

export class DatabaseSync {
  constructor(name, options = {}) {
    const database = host("sqlite.open", { name, options });
    this.id = database.id;
  }

  prepare(sql) {
    const db = this.id;
    return {
      all(...params) {
        return host("sqlite.all", { db, sql, params });
      },
      get(...params) {
        return host("sqlite.get", { db, sql, params });
      },
      run(...params) {
        return host("sqlite.run", { db, sql, params });
      },
    };
  }

  exec(sql) {
    return host("sqlite.exec", { db: this.id, sql });
  }

  close() {
    return host("sqlite.close", { id: this.id });
  }
}

export default { DatabaseSync };
`;
}

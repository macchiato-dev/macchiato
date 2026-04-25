import { getQuickJS } from "quickjs-emscripten";

/**
 * @typedef {Object} SandboxResult
 * @property {boolean} ok - Whether execution succeeded
 * @property {unknown} [value] - The returned value on success
 * @property {string} [error] - Error message on failure
 */

export class Sandbox {
  /** @type {import("quickjs-emscripten").QuickJSRuntime | null} */
  runtime = null;
  /** @type {import("quickjs-emscripten").QuickJSContext | null} */
  context = null;
  /** @type {boolean} */
  disposed = false;

  async init() {
    if (this.disposed) throw new Error("Sandbox has been disposed");
    if (this.runtime) return;

    const QuickJS = await getQuickJS();
    this.runtime = QuickJS.newRuntime();
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
      return { ok: false, error: String(err) };
    }

    const value = this.context.dump(result.value);
    result.value.dispose();
    return { ok: true, value };
  }

  dispose() {
    this.disposed = true;
    this.context?.dispose();
    this.runtime?.dispose();
    this.context = null;
    this.runtime = null;
  }
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

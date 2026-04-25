import { getQuickJS, QuickJSRuntime, QuickJSContext } from "quickjs-emscripten";

export interface SandboxResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export class Sandbox {
  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private disposed = false;

  async init(): Promise<void> {
    if (this.disposed) throw new Error("Sandbox has been disposed");
    if (this.runtime) return;

    const QuickJS = await getQuickJS();
    this.runtime = QuickJS.newRuntime();
    this.context = this.runtime.newContext();
  }

  run(code: string): SandboxResult {
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

  dispose(): void {
    this.disposed = true;
    this.context?.dispose();
    this.runtime?.dispose();
    this.context = null;
    this.runtime = null;
  }
}

export async function runInSandbox(code: string): Promise<SandboxResult> {
  const sandbox = new Sandbox();
  try {
    await sandbox.init();
    return sandbox.run(code);
  } finally {
    sandbox.dispose();
  }
}

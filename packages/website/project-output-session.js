import { QuickJSRuntime } from "../../dev/wasm-web-runtimes/quickjs/context-runtime.js";

const encoder = new TextEncoder();
function message(name, payload) {
  const fn = encoder.encode(name), argument = encoder.encode(JSON.stringify(payload));
  const bytes = new Uint8Array(2 + fn.length + argument.length);
  bytes[0] = 2;
  bytes.set(fn, 1);
  bytes.set(argument, fn.length + 2);
  return bytes;
}

// One application lifetime. Every callback, module request, file map, and
// fetch reply belongs to this session, never to a mutable "current machine".
class OutputSession {
  constructor(Machine, runtime, root, options, onError) {
    this.pending = new Map();
    this.nextRequest = 1;
    this.disposed = false;
    this.starting = true;
    this.onError = onError;
    this.options = options;
    const files = new Map((options.files || []).map(file => [file.path, file.content]));
    this.machine = new Machine(runtime.createSession(), root, {
      ...options,
      onError: error => this.report(error),
      services: { ...options.services, call(name, path) {
        if (name === "module.source") return JSON.stringify(files.get(path) ?? null);
        if (typeof options.services?.call === "function") return options.services.call(name, path);
        throw new Error(`Project service is unavailable: ${name}`);
      } },
      onMessage: text => {
        if (text.startsWith("__wwcModule:")) {
          const result = JSON.parse(text.slice(12)), pending = this.pending.get(result.id);
          if (!pending) return;
          this.pending.delete(result.id);
          if (result.error) pending.reject(new Error(result.error)); else pending.resolve();
        } else if (text.startsWith("__wwcResponse:")) this.response = text.slice(14);
        else if (text.startsWith("__wwcError:")) this.report(new Error(text.slice(11)));
        else {
          let request;
          try { request = JSON.parse(text); } catch {}
          if (request?.type === "fetch" && Number.isSafeInteger(request.id) && typeof request.url === "string") {
            void this.answerFetch(request).catch(error => {
              this.report(error);
              queueMicrotask(() => { throw error; });
            });
          } else options.onMessage?.(text);
        }
      },
    });
  }

  report(error) {
    if (this.disposed) return;
    this.error ||= error;
    if (!this.starting) this.onError?.(error);
  }

  async answerFetch(request) {
    let reply;
    try {
      if (!this.options.fetchResource) throw new Error("Project network access is disabled");
      reply = { id: request.id, ...await this.options.fetchResource(request.url) };
    } catch (error) { reply = { id: request.id, error: error.message || String(error) }; }
    if (!this.disposed) this.machine.onmsg(message("__resourcesFetchResolve", reply));
  }

  call(name, payload) {
    if (this.disposed) throw new Error("Project output was replaced or destroyed");
    this.response = undefined;
    this.error = null;
    this.machine.onmsg(message(name, payload));
    if (this.error) throw this.error;
    if (this.response === undefined) throw new Error(`Guest function ${name} did not respond`);
    return JSON.parse(this.response);
  }

  async run(scripts) {
    for (const [index, script] of scripts.entries()) {
      if (this.disposed) throw new Error("Project output was replaced or destroyed");
      this.error = null;
      if (script.module) {
        const id = this.nextRequest++;
        await new Promise((resolve, reject) => {
          this.pending.set(id, { resolve, reject });
          try { this.call("__resourcesOutputRunModule", { id, source: script.source, code: script.code }); }
          catch (error) { this.pending.delete(id); reject(error); }
        });
      } else {
        const source = encoder.encode(script.code), bytes = new Uint8Array(source.length + 1);
        bytes[0] = 1; bytes.set(source, 1);
        await this.machine.onmsg(bytes);
        if (this.error) throw new Error(`${script.source || `script ${index + 1}`}: ${this.error.message}`);
      }
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    for (const request of this.pending.values()) request.reject(new Error("Project output was replaced or destroyed"));
    this.pending.clear();
    this.machine.destroy();
  }
}

// The controller owns the engine and the two roots. The hidden replacement
// has real layout dimensions, but cannot receive input. No app source runs
// here: scripts and modules are evaluated only by its QuickJS session.
export class ProjectOutput {
  constructor(Machine, module, root, optionsFor, onError) {
    this.Machine = Machine;
    this.runtime = new QuickJSRuntime(module);
    this.root = root;
    this.optionsFor = optionsFor;
    this.onError = onError;
    this.programs = 0;
    this.destroyed = false;
    this.active = null;
    this.preparing = null;
  }

  load = async project => {
    if (this.destroyed) throw new Error("Project output was destroyed");
    this.remove(this.preparing);
    const wrapper = this.root.ownerDocument.createElement("div");
    const surface = this.root.ownerDocument.createElement("div");
    surface.className = "project-output-root";
    wrapper.append(surface);
    wrapper.inert = true;
    wrapper.style.cssText = "position:absolute;left:0;top:0;width:100%;visibility:hidden;pointer-events:none";
    // Position against the mount rather than the page. The application only
    // receives surface, so it cannot rewrite the controller's staging styles.
    this.root.style.position = "relative";
    this.root.append(wrapper);
    const pending = { wrapper, session: null };
    this.preparing = pending;
    try {
      const session = pending.session = new OutputSession(this.Machine, this.runtime, surface,
        this.optionsFor(project), this.onError);
      await session.machine.onmsg(0);
      if (this.preparing !== pending) throw new Error("Project output was replaced or destroyed");
      const result = session.call("__resourcesOutputLoad", {
        tree: project.tree || [], stylesheets: project.stylesheets || [],
      });
      await session.machine.onmsg(0);
      await session.run(project.scripts || []);
      if (session.error) throw session.error;
      if (this.preparing !== pending) throw new Error("Project output was replaced or destroyed");
      const previous = this.active;
      this.active = pending;
      this.preparing = null;
      wrapper.removeAttribute("style");
      wrapper.inert = false;
      session.starting = false;
      this.programs += (project.scripts || []).length;
      this.remove(previous);
      return result;
    } catch (error) {
      if (this.preparing === pending) this.preparing = null;
      this.remove(pending);
      throw error;
    }
  };

  remove(entry) {
    if (!entry) return;
    try { entry.session?.destroy(); }
    finally { entry.wrapper.remove(); }
  }

  setContent = tree => {
    const session = this.active?.session;
    if (!session) throw new Error("Project output is unavailable");
    const result = session.call("__resourcesOutputSetContent", tree);
    session.machine.onmsg(0);
    return result;
  };

  run = async scripts => {
    if (!this.active) throw new Error("Project output is unavailable");
    await this.active.session.run(scripts);
    this.programs += scripts.length;
  };

  inspect = () => ({ runtime: "quickjs", programs: this.programs });

  destroy = () => {
    if (this.destroyed) return;
    this.destroyed = true;
    this.remove(this.preparing);
    this.remove(this.active);
    this.preparing = this.active = null;
    this.runtime.destroy();
  };
}

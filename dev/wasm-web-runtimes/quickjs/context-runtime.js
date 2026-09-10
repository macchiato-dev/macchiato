// One compiled Wasm engine, with separately disposable JS sessions. Each
// session supplies an instance-shaped adapter to WasmWebMachine; DOM policy,
// references, timers, and callbacks remain in that machine's own bridge.
export class QuickJSRuntime {
  #instance;
  #active;
  #sessions = new Set();
  #nextId = 1;
  #destroyed = false;

  constructor(module) {
    this.#instance = new WebAssembly.Instance(module, { host: {
      now: () => this.#active.session.imports.host.now(),
      msg: (offset, length) => {
        const call = this.#active;
        if (call.control) {
          if (length < 12) throw new Error("QuickJS session control buffer is too small");
          new Uint8Array(this.#instance.exports.memory.buffer, offset, 12).set(call.control);
          call.control = null;
          return 12;
        }
        // Do not unwind a live QuickJS C stack with a browser exception. The
        // guest bridge turns this sentinel into a JS exception, allowing its
        // stack/values to unwind normally. Re-throw the original host error
        // only after Wasm returns. Finalizer releases may still complete.
        if (call.error && length !== 0) return 0xffffffff;
        try { return call.session.imports.host.msg(offset, length); }
        catch (error) { call.error ||= error; return 0xffffffff; }
      },
    } });
  }

  createSession() {
    if (this.#destroyed) throw new Error("QuickJS runtime is disposed");
    if (this.#nextId > 0xffffffff) throw new RangeError("QuickJS session IDs exhausted");
    const session = { id: this.#nextId++, imports: null, disposed: false, disposing: false, depth: 0 };
    return Object.freeze({
      instantiate: imports => {
        if (this.#destroyed) throw new Error("QuickJS runtime is disposed");
        if (session.imports || session.disposed) throw new Error("QuickJS session was already attached");
        session.imports = imports;
        this.#sessions.add(session);
        return {
          exports: {
            memory: this.#instance.exports.memory,
            onmsg: length => this.#call(session, length, 0),
          },
          destroy: () => this.#dispose(session),
        };
      },
    });
  }

  #call(session, length, action) {
    if (session.disposed || session.disposing && action !== 1) throw new Error("QuickJS session is disposed");
    const control = new Uint8Array(12), words = new DataView(control.buffer);
    words.setUint32(0, session.id, true);
    words.setUint32(4, length, true);
    words.setUint32(8, action, true);
    const previous = this.#active;
    this.#active = { session, control };
    session.depth++;
    try {
      this.#instance.exports.onmsg(12);
      if (this.#active.error) throw this.#active.error;
      if (this.#active.control) throw new Error("QuickJS build does not support sessions");
    } finally {
      session.depth--;
      this.#active = previous;
    }
  }

  #dispose(session) {
    if (session.disposed) return;
    if (session.depth) throw new Error("Cannot dispose a running QuickJS session");
    session.disposing = true;
    try { this.#call(session, 0, 1); }
    finally {
      // Native disposal unlinks the session before calling finalizers. A host
      // finalizer error must not leave an attachable JS handle to freed state.
      session.disposed = true;
      session.imports = null;
      this.#sessions.delete(session);
    }
  }

  destroy() {
    if (this.#destroyed) return;
    for (const session of this.#sessions) {
      if (session.depth) throw new Error("Cannot dispose a running QuickJS runtime");
    }
    this.#destroyed = true;
    let failure;
    for (const session of this.#sessions) {
      try { this.#dispose(session); }
      catch (error) { failure ||= error; }
    }
    this.#instance = undefined;
    if (failure) throw failure;
  }
}

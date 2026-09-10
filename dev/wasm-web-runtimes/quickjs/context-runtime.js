// One compiled Wasm engine, with separately disposable JS sessions. Each
// session supplies an instance-shaped adapter to WasmWebMachine; DOM policy,
// references, timers, and callbacks remain in that machine's own bridge.
export class QuickJSRuntime {
  #instance;
  #active;
  #sessions = new Set();
  #nextId = 1;

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
        return call.session.imports.host.msg(offset, length);
      },
    } });
  }

  createSession() {
    if (this.#nextId > 0xffffffff) throw new RangeError("QuickJS session IDs exhausted");
    const session = { id: this.#nextId++, imports: null, disposed: false, depth: 0 };
    return Object.freeze({
      instantiate: imports => {
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
    if (session.disposed) throw new Error("QuickJS session is disposed");
    const control = new Uint8Array(12), words = new DataView(control.buffer);
    words.setUint32(0, session.id, true);
    words.setUint32(4, length, true);
    words.setUint32(8, action, true);
    const previous = this.#active;
    this.#active = { session, control };
    session.depth++;
    try {
      this.#instance.exports.onmsg(12);
      if (this.#active.control) throw new Error("QuickJS build does not support sessions");
    } finally {
      session.depth--;
      this.#active = previous;
    }
  }

  #dispose(session) {
    if (session.disposed) return;
    if (session.depth) throw new Error("Cannot dispose a running QuickJS session");
    this.#call(session, 0, 1);
    session.disposed = true;
    session.imports = null;
    this.#sessions.delete(session);
  }

  destroy() {
    for (const session of this.#sessions) this.#dispose(session);
  }
}

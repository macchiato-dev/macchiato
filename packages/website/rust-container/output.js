// Parent-side integration only: the 40-line frame owns both running VMs.
// Never accept sandbox bytes or bridge source from the editable project.
const base = "/-/resources-site/";
function encode(bytes) {
  let value = "";
  for (let i = 0; i < bytes.length; i += 8192)
    value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
export async function compileRust(files, config) {
  const response = await fetch("/api/rust/compile", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry: config.entry, files: files.map(file => {
      const binary = /^data:[^,]*;base64,([\s\S]*)$/.exec(file.content);
      return binary ? { path: file.path, encoding: "base64", content: binary[1] } : file;
    }) }),
  });
  if (!response.ok) throw new Error(await response.text());
  return { tree: [], document: {}, scripts: [], stylesheets: [],
    runtime: { kind: "rust", wasm: encode(new Uint8Array(await response.arrayBuffer())) } };
}

export class RustFrameOutput {
  constructor(mount, onError) {
    this.mount = mount;
    this.onError = onError;
    this.active = this.pending = null;
    this.destroyed = false;
  }
  async load(project) {
    if (this.destroyed) throw new Error("Output was closed");
    if (project.runtime?.kind !== "rust" || typeof project.runtime.wasm !== "string" ||
        project.runtime.wasm.length > 12 * 1024 * 1024) throw new Error("Invalid Rust output");
    this.remove(this.pending);
    const frame = this.mount.ownerDocument.createElement("iframe");
    frame.className = "project-editor__output-frame";
    frame.title = "Rust Mahjong output";
    // No same-origin grant: this document has an opaque origin and no network.
    frame.sandbox = "allow-scripts";
    frame.allow = "fullscreen";
    frame.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;visibility:hidden";
    this.mount.style.position = "relative";
    const channel = new MessageChannel();
    const entry = { frame, channel, cancel: null };
    this.pending = entry;
    try {
      const response = await fetch(`${base}rust-project-sandbox.wasm`);
      if (!response.ok) throw new Error("Rust sandbox is unavailable");
      const sandbox = await response.arrayBuffer();
      const guest = Uint8Array.from(atob(project.runtime.wasm), c => c.charCodeAt(0)).buffer;
      if (this.pending !== entry || this.destroyed) throw new Error("Output was replaced");
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Rust output timed out")), 15_000);
        const finish = error => { clearTimeout(timer); error ? reject(error) : resolve(); };
        entry.cancel = () => finish(new Error("Output was replaced"));
        channel.port1.onmessage = ({ data }) => {
          if (data.error) {
            if (this.active === entry) this.onError(new Error(data.error));
            else finish(new Error(data.error));
          } else if (data.ready) finish();
        };
        frame.onload = () => frame.contentWindow.postMessage(
          { sandbox, guest }, "*", [channel.port2]);
        frame.onerror = () => finish(new Error("Rust frame failed to load"));
        frame.src = `${base}rust-project-frame.html`;
        this.mount.append(frame);
      });
      if (this.pending !== entry || this.destroyed) throw new Error("Output was replaced");
      entry.cancel = null;
      const old = this.active;
      this.active = entry; this.pending = null;
      frame.style.cssText = "display:block;width:100%;height:100%;border:0";
      this.remove(old);
    } catch (error) {
      if (this.pending === entry) this.pending = null;
      this.remove(entry);
      throw error;
    }
  }
  remove(entry) {
    if (!entry) return;
    entry.cancel?.(); entry.channel.port1.close(); entry.channel.port2.close();
    entry.frame.remove();
  }
  inspect() { return { realm: "iframe", runtime: "rust", machines: 2 }; }
  run(scripts) { if (scripts.length) throw new Error("Rust output does not execute JavaScript"); }
  setContent() { throw new Error("Rust output owns its DOM"); }
  destroy() {
    this.destroyed = true; this.remove(this.pending); this.remove(this.active);
    this.pending = this.active = null;
  }
}

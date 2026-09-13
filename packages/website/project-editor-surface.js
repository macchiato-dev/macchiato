import { createProjectEditorMachine } from "./project-machines.js";

const methods = new Set(["ConfigureLimits", "SetContent", "SetTheme", "Command",
  "Inspect", "Focus", "Select", "GetSelection", "SelectLine", "Serialize", "Restore"]);

// The website controller owns the frame. Only the editor guest receives its
// Document; the project UI receives commands, never a cross-document DOM grant.
export class ProjectEditorSurface {
  constructor(mount, notify, onError) {
    this.mount = mount;
    this.notify = notify;
    this.onError = onError;
    this.frame = null;
    this.editor = null;
    this.disposed = false;
  }
  async start() {
    const frame = this.mount.ownerDocument.createElement("iframe");
    this.frame = frame;
    frame.title = "Code editor";
    frame.className = "project-editor__code-frame";
    frame.style.cssText = "display:block;width:100%;height:100%;border:0;visibility:hidden";
    // The shell contains no scripts. Its CSP permits only the rendered editor
    // styles; project text never becomes markup or browser-realm JavaScript.
    frame.src = new URL("/-/resources-site/project-editor-frame.html",
      this.mount.ownerDocument.location.href).href;
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error("Editor frame did not load")), 15_000);
        const loaded = () => finish();
        const finish = error => {
          clearTimeout(timer);
          frame.removeEventListener("load", loaded);
          this.cancelLoad = null;
          error ? reject(error) : resolve();
        };
        this.cancelLoad = () => finish(new Error("Editor frame was closed"));
        frame.addEventListener("load", loaded);
        this.mount.replaceChildren(frame);
      });
      if (this.disposed) throw new Error("Editor frame was closed");
      const root = frame.contentDocument;
      if (!root?.getElementById("editor")) throw new Error("Editor frame shell is unavailable");
      this.updateAppearance();
      this.editor = await createProjectEditorMachine({
        root,
        limits: false,
        onChange: (content, details) => this.notify({ type: "change", content, ...details }),
        onReady: value => this.notify({ ...value, type: "ready" }),
        onLimit: value => this.notify({ ...value, type: "limit" }),
        onError: this.onError,
        onRequest() { throw new Error("Editor surface service is not granted"); },
      });
      if (this.disposed) { this.editor.destroy(); throw new Error("Editor frame was closed"); }
      frame.style.visibility = "visible";
      return this;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }
  updateAppearance() {
    const doc = this.frame.contentDocument;
    const style = this.mount.ownerDocument.defaultView.getComputedStyle(this.mount);
    for (const name of style) if (name.startsWith("--resources-editor-")) {
      doc.documentElement.style.setProperty(name, style.getPropertyValue(name));
    }
    doc.body.style.font = style.font;
    doc.documentElement.style.colorScheme =
      this.mount.ownerDocument.documentElement.dataset.theme === "light" ? "light" : "dark";
  }
  call(method, value = {}) {
    if (!methods.has(method)) throw new Error("Editor surface command is not granted");
    if (this.disposed || !this.editor) throw new Error("Editor surface is unavailable");
    if (method === "SetTheme") this.updateAppearance();
    return this.editor.callGuest("__codeEditor" + method, value);
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelLoad?.();
    this.editor?.destroy();
    this.editor = null;
    this.frame?.remove();
  }
}

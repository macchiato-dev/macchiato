import { mountResourcesProjectEditor, mountResourcesProjectPreview } from "../../../packages/website/project-editor-runtime.js";
import { compileSingleFileProject } from "../../../packages/project-editor/src/single-file-compiler.js";

const SESSION_KEY = "-playground--editor";
const DEFAULT_SOURCE = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Small article</title>
<style>
  body { margin: 0; padding: 32px; color: #e8efed; background: #202524; font: 16px/1.5 system-ui; }
  article { max-width: 42rem; margin: auto; }
  h1 { color: #9fb0ff; }
</style>
<body>
<article>
  <h1>A small article</h1>
  <p>Edit this single HTML file. Its inline CSS and JavaScript run in a separate machine.</p>
  <button type="button" id="hello">Say hello</button>
  <p id="message" aria-live="polite"></p>
</article>
<script>
document.getElementById("hello").addEventListener("click", function () {
  document.getElementById("message").textContent = "Hello from QuickJS.";
});
</script>
</body>
</html>`;

class StatusDevice {
  constructor(element) { this.element = element; }
  show(message = "") {
    this.element.textContent = message;
    this.element.hidden = !message;
  }
}

class SessionDevice {
  constructor(storage, key) { this.storage = storage; this.key = key; }
  load() { return this.storage.getItem(this.key); }
  clear() { this.storage.removeItem(this.key); }
  store(state) { this.storage.setItem(this.key, JSON.stringify(state)); }
}

class CompilerDevice {
  constructor({ local = false } = {}) { this.local = local; }
  async compile(source) {
    if (this.local) return compileSingleFileProject(source);
    const response = await fetch("/editor/compile", {
      method: "POST",
      headers: { "content-type": "text/html; charset=utf-8" },
      body: source,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Compiler response ${response.status}`);
    return result;
  }
}

class OutputDevice {
  constructor(root, compiler, status) {
    this.root = root;
    this.compiler = compiler;
    this.status = status;
    this.preview = null;
    this.timer = null;
    this.generation = 0;
  }

  schedule(source) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(source), 350);
  }

  async render(source) {
    const generation = ++this.generation;
    try {
      const program = await this.compiler.compile(source);
      if (generation !== this.generation) return;
      this.preview?.destroy();
      this.root.replaceChildren();
      this.preview = await mountResourcesProjectPreview({
        root: this.root,
        scripts: [],
        onViolation: (error) => this.status.show(`Blocked: ${error.message}`),
      });
      if (generation !== this.generation) { this.preview.destroy(); return; }
      this.preview.setContent(program.tree);
      await this.preview.run(program.styles || []);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (generation !== this.generation) return;
      await this.preview.run(program.scripts);
      if (generation === this.generation) this.status.show();
    } catch (error) {
      if (generation === this.generation) this.status.show(`Blocked: ${error.message}`);
    }
  }

  destroy() {
    clearTimeout(this.timer);
    this.generation++;
    this.preview?.destroy();
  }
}

class PlaygroundController {
  static styles = `
:root{color-scheme:dark;--bar:#17226e;--edge:#2d3d91;--ground:#202524;--text:#edf3f2}
*{box-sizing:border-box}html,body,#playground{width:100%;height:100%;margin:0;overflow:hidden}
body{color:var(--text);background:var(--ground);font:14px/1.4 system-ui,sans-serif}
#playground{display:grid;grid-template-rows:42px minmax(0,1fr) auto}
#playground>header{display:flex;align-items:center;gap:18px;padding:0 12px;border-bottom:2px solid var(--edge);background:var(--bar)}
#playground>header span{color:#cbd4ff;font-size:12px}
#playground>main{display:grid;grid-template-columns:minmax(0,1fr) 2px minmax(0,1fr);min-height:0;background:#454b4a}
#playground>main>section{min-width:0;min-height:0;overflow:hidden;background:var(--ground)}
#playground>main>section+section{grid-column:3}
#editor,#output{width:100%;height:100%;overflow:auto}
#editor .cm-editor{height:100%}#editor .cm-scroller{overflow:auto}
#playground>footer{min-height:31px;margin:4px;padding:4px 8px;border:1px solid #d45b62;border-radius:999px;color:#ffd0d2;background:#421f23;font-size:11px}
#playground>footer[hidden]{display:none}
@media(max-width:700px){#playground>main{grid-template-columns:1fr;grid-template-rows:1fr 1fr;gap:2px}#playground>main>section+section{grid-column:1;grid-row:2}}
@media(prefers-color-scheme:light){:root{color-scheme:light;--bar:#dbe4ff;--edge:#aebce6;--ground:#d9e1e3;--text:#263338}}
`;

  constructor(root) {
    this.root = root;
    this.editor = null;
    this.source = DEFAULT_SOURCE;
    this.colorScheme = matchMedia("(prefers-color-scheme: light)");
    this.session = new SessionDevice(sessionStorage, SESSION_KEY);
  }

  async start() {
    this.root.innerHTML = `<header><strong>Playground</strong><span>index.html</span></header><main><section aria-label="Editor"><div id="editor"></div></section><section aria-label="Output"><div id="output"></div></section></main><footer role="status" hidden></footer>`;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(PlaygroundController.styles);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    this.status = new StatusDevice(this.root.querySelector("footer"));
    this.output = new OutputDevice(
      this.root.querySelector("#output"),
      new CompilerDevice({ local: new URLSearchParams(location.search).get("compile") === "client" }),
      this.status,
    );
    const saved = this.session.load();
    this.editor = await mountResourcesProjectEditor({
      root: this.root.querySelector("section[aria-label=Editor]"),
      limits: { maxLines: 500, maxCharacters: 160_000, maxCodePoints: 80_000, maxLineCodePoints: 256 },
      onReady() {},
      onLimit: (usage) => {
        const reason = usage.input === "paste" ? "Paste refused" : "Change refused";
        this.status.show(`${reason}: use at most 500 lines, 80,000 code points, and 256 code points per pasted line.`);
      },
      onChange: (value) => this.change(value),
    });
    const applyTheme = () => this.editor.setTheme(this.colorScheme.matches ? "light" : "dark");
    applyTheme();
    this.colorScheme.addEventListener("change", applyTheme);
    this.editor.setContent(DEFAULT_SOURCE, "html");
    if (saved) this.restore(saved);
    await this.output.render(this.source);
    this.editor.focus();
  }

  change(value) {
    this.source = value;
    try {
      this.session.store(this.editor.callGuest("__codeEditorSerialize", {
        maxUndo: 200,
        maxRedo: 50,
        maxBytes: 2 * 1024 * 1024,
      }));
    } catch (error) {
      this.status.show(`Session state was not stored: ${error.message}`);
    }
    this.output.schedule(value);
  }

  restore(saved) {
    try {
      const state = JSON.parse(saved);
      this.editor.callGuest("__codeEditorRestore", state);
      this.source = state.doc;
    } catch (error) {
      this.session.clear();
      this.status.show(`Saved session was discarded: ${error.message}`);
    }
  }
}

await new PlaygroundController(document.getElementById("playground")).start();

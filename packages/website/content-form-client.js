import "./resources-storage-client.js";
import { applyProjectPatch, diffProjectSnapshots, emptyProjectSnapshot, normalizeProjectSnapshot, projectPatchIsEmpty, projectSnapshotsEqual } from "/-/resources-site/project-history.js";
import { validateAllowedUrlPatterns } from "/-/resources-site/url-pattern.js";
import { downloadProjectArchive, importProjectArchive, mountResourcesProjectEditor, navigationType, readProjectRecovery, replaceFrontendPath, writeProjectRecovery } from "/-/resources-site/project-editor-runtime.js";
import { editorLanguageForPath } from "../project-editor/src/languages.js";
import { mountContentNameFields } from "./content-name-fields.js";
import { DRAFT_KEY, pendingProjectSnapshotKey } from "./project-session.js";

const PROJECT_IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
function isProjectImage(file) {
  const extension = String(file?.path || "").split(".").at(-1).toLowerCase();
  return PROJECT_IMAGE_TYPES.has(extension) && /^data:image\//.test(file?.content || "");
}

function queryParameter(name) {
  const match = new RegExp("(?:^|&)" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^&]*)")
    .exec(String(location.search || "").replace(/^\?/, ""));
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null;
}

function internalHref(link) {
  const href = link?.getAttribute?.("href") || "";
  return href.startsWith("/") && !href.startsWith("//") ? href : null;
}

// Tab arrangement and close navigation are optional preferences, not recovery
// records. Losing their persistence must not prevent editing or navigation.
function rememberSession(key, value) {
  try { sessionStorage.setItem(key, value); } catch {}
}

for (const split of document.querySelectorAll("[data-save-split]")) {
  const trigger = split.querySelector("[data-save-menu-trigger]");
  const menu = split.querySelector("[data-save-menu]");
  trigger.addEventListener("click", () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("pointerdown", (event) => {
    if (!split.contains(event.target)) { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a[href]");
  if (!link || link.classList.contains("project-close")) return;
  const target = internalHref(link);
  if (target && /^\/[^/?#]+\/[^/?#]+(?:[?#].*)?$/.test(target)) {
    let stack = [];
    try { stack = JSON.parse(sessionStorage.getItem("resources-project-close-stack")) || []; } catch {}
    const current = location.pathname + location.search;
    if (stack.at(-1) !== current) stack.push(current);
    rememberSession("resources-project-close-stack", JSON.stringify(stack.slice(-20)));
  }
});
for (const close of document.querySelectorAll(".project-close")) {
  let stack = [];
  try { stack = JSON.parse(sessionStorage.getItem("resources-project-close-stack")) || []; } catch {}
  if (!Array.isArray(stack)) stack = [];
  const previous = stack.at(-1);
  close.setAttribute("href", typeof previous === "string" && previous.startsWith("/") &&
    !previous.startsWith("//") ? previous : "/");
  close.addEventListener("click", () => {
    stack.pop();
    rememberSession("resources-project-close-stack", JSON.stringify(stack));
  });
}

for (const overflow of document.querySelectorAll("[data-project-overflow]")) {
  const trigger = overflow.querySelector("[data-project-overflow-trigger]");
  const menu = overflow.querySelector("[data-project-overflow-menu]");
  trigger.addEventListener("click", () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("pointerdown", (event) => {
    if (!overflow.contains(event.target)) { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  });
}

for (const fields of document.querySelectorAll("[data-project-fields]")) {
  const modal = fields.querySelector("[data-version-title-modal]");
  if (!modal) continue;
  const input = modal.querySelector("[data-version-title-input]");
  const hidden = fields.querySelector("[data-version-title]");
  const close = () => { modal.hidden = true; input.value = ""; };
  fields.querySelector("[data-open-version-title]")?.addEventListener("click", () => {
    fields.querySelector("[data-save-menu]").hidden = true;
    modal.hidden = false;
    input.focus();
  });
  modal.querySelector("[data-version-title-cancel]").addEventListener("click", close);
  modal.querySelector("[data-version-title-save]").addEventListener("click", () => {
    hidden.value = input.value.trim();
    modal.hidden = true;
    fields.closest("form")?.requestSubmit(fields.querySelector("[data-project-submit]"));
  });
  modal.addEventListener("pointerdown", (event) => { if (event.target === modal) close(); });
}

const CHECKPOINT_MS = 300_000;
const STARTING_POINTS = Object.freeze({
  article: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width\">\n  <title>A small article</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <article>\n    <h1>A small article</h1>\n    <p><a href=\"https://en.wikipedia.org/wiki/Hypertext\">Hypertext</a> connects documents through links and gives the web its navigable structure.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/WebAssembly\">WebAssembly</a> provides a portable execution format for programs in the browser.</p>\n    <p><a href=\"https://en.wikipedia.org/wiki/Capability-based_security\">Capability-based security</a> limits programs to the authority they are explicitly given.</p>\n  </article>\n</body>\n</html>" },
      { path: "style.css", content: "body {\n  margin: 0;\n  font: 17px/1.6 system-ui, sans-serif;\n  color: #eef2ff;\n  background: #151717;\n}\narticle {\n  max-width: 44rem;\n  margin: auto;\n  padding: 3rem 2rem;\n}\na { color: #30d5c8; }\n" },
    ],
    config: { entry: "index.html", template: "article", container: "article", containerOptions: { allowedLinkPatterns: ["*.wikipedia.org"], links: { addTargetBlank: true } }, sandbox: { network: false, storage: "session" } },
  },
  hello: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Hello, HTML</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <main>\n    <h1>Hello, HTML</h1>\n    <p>This small page is made from familiar HTML elements.</p>\n    <ul><li>A heading</li><li>A paragraph</li><li>A list</li></ul>\n  </main>\n</body>\n</html>" },
      { path: "style.css", content: "body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  color: #f5f7f7;\n  background: #171a1a;\n}\nmain {\n  max-width: 42rem;\n  padding: 2rem;\n}\n" },
    ],
    config: { entry: "index.html", template: "hello", container: "page", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "session" } },
  },
  html: {
    files: [{ path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width\">\n  <title>Single-file document</title>\n  <style>body { margin: 0; min-height: 100vh; display: grid; place-items: center; font: 18px system-ui; color: #eef2ff; background: #171a1a; }</style>\n</head>\n<body><main><h1>Single-file document</h1><p>HTML, CSS, and JavaScript can live together here.</p></main></body>\n</html>" }],
    config: { entry: "index.html", template: "html", sandbox: { network: false, storage: "session" } },
  },
  clock: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width\">\n  <title>Digital clock</title>\n  <link rel=\"stylesheet\" href=\"./style.css\">\n</head>\n<body>\n  <main><h1 id=\"time\">--:--:--</h1><p id=\"date\">Waiting for the sandbox…</p></main>\n  <script src=\"./script.js\"></script>\n</body>\n</html>" },
      { path: "style.css", content: "body { margin: 0; font-family: ui-monospace, monospace; color: #f5f7f7; background: #171a1a; }\nmain { padding: 3rem; text-align: center; }\nh1 { font-size: clamp(2rem, 10vw, 5rem); }\n" },
      { path: "script.js", content: "const pad = (value) => String(value).padStart(2, \"0\");\nfunction tick() {\n  const now = new Date();\n  document.getElementById(\"time\").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;\n  document.getElementById(\"date\").textContent = now.toLocaleDateString();\n}\ntick();\nsetInterval(tick, 1000);" },
    ],
    config: { entry: "index.html", template: "clock", container: "page", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  mark: {
    files: [{ path: "image.svg", content: "<svg viewBox=\"0 0 640 420\" role=\"img\" aria-labelledby=\"mark-title\">\n  <title id=\"mark-title\">Logo mark</title>\n  <defs><linearGradient id=\"mark-gradient\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#30d5c8\"/><stop offset=\"100%\" stop-color=\"#3267e3\"/></linearGradient></defs>\n  <circle cx=\"320\" cy=\"210\" r=\"160\" fill=\"url(#mark-gradient)\"/>\n  <path d=\"M 245 285 L 320 120 L 395 285 Z\" fill=\"#151717\"/>\n</svg>" }],
    config: { entry: "image.svg", template: "mark", container: "svg", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  chart: {
    files: [{ path: "image.svg", content: "<svg viewBox=\"0 0 720 440\" role=\"img\" aria-labelledby=\"chart-title\">\n  <title id=\"chart-title\">Bar chart</title>\n  <line x1=\"80\" y1=\"360\" x2=\"660\" y2=\"360\" stroke=\"#839099\"/>\n  <rect x=\"130\" y=\"210\" width=\"90\" height=\"150\" rx=\"8\" fill=\"#30d5c8\"/>\n  <rect x=\"315\" y=\"120\" width=\"90\" height=\"240\" rx=\"8\" fill=\"#3267e3\"/>\n  <rect x=\"500\" y=\"170\" width=\"90\" height=\"190\" rx=\"8\" fill=\"#ae79ff\"/>\n  <text x=\"148\" y=\"395\" fill=\"#eef2ff\">HTML</text><text x=\"340\" y=\"395\" fill=\"#eef2ff\">SVG</text><text x=\"510\" y=\"395\" fill=\"#eef2ff\">Canvas</text>\n</svg>" }],
    config: { entry: "image.svg", template: "chart", container: "svg", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  ball: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Bouncing ball</title>\n<canvas width=\"720\" height=\"440\" aria-label=\"Animated bouncing ball\"></canvas>\n<script src=\"./script.js\"></script>" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst context = canvas.getContext(\"2d\");\nlet x = 90, y = 80, dx = 5, dy = 4;\nfunction frame() {\n  x += dx; y += dy;\n  if (x < 28 || x > canvas.width - 28) dx *= -1;\n  if (y < 28 || y > canvas.height - 28) dy *= -1;\n  context.clearRect(0, 0, canvas.width, canvas.height);\n  context.fillStyle = \"#30d5c8\"; context.beginPath(); context.arc(x, y, 26, 0, Math.PI * 2); context.fill();\n  requestAnimationFrame(frame);\n}\nframe();" },
    ],
    config: { entry: "index.html", template: "ball", container: "canvas", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  stars: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Starfield</title>\n<canvas width=\"720\" height=\"440\" aria-label=\"Animated starfield\"></canvas>\n<script src=\"./script.js\"></script>" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst context = canvas.getContext(\"2d\");\nconst width = canvas.width, height = canvas.height;\nconst stars = Array.from({ length: 120 }, () => ({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() }));\nlet last = null;\nfunction frame(time) {\n  if (last === null) last = time;\n  const elapsed = Math.min((time - last) / 1000, 0.1); last = time;\n  context.fillStyle = \"rgba(0,0,0,0.4)\"; context.fillRect(0, 0, width, height);\n  for (const star of stars) {\n    star.z -= 0.5 * elapsed;\n    if (star.z <= 0.02) { star.x = Math.random() - 0.5; star.y = Math.random() - 0.5; star.z = 1; }\n    const x = width / 2 + (star.x / star.z) * width;\n    const y = height / 2 + (star.y / star.z) * height;\n    context.fillStyle = \"#cdd9ff\"; context.beginPath(); context.arc(x, y, (1 - star.z) * 2.3, 0, Math.PI * 2); context.fill();\n  }\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);" },
    ],
    config: { entry: "index.html", template: "stars", container: "canvas", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "memory" } },
  },
  paint: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Canvas paint</title>\n<canvas width=\"720\" height=\"440\" aria-label=\"Click to paint colorful squares\"></canvas>\n<script src=\"./script.js\"></script>" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst context = canvas.getContext(\"2d\");\ncontext.fillStyle = \"#111827\";\ncontext.fillRect(0, 0, canvas.width, canvas.height);\nlet color = 0;\ncanvas.addEventListener(\"click\", (event) => {\n  const box = canvas.getBoundingClientRect();\n  const x = (event.clientX - box.left) * canvas.width / box.width;\n  const y = (event.clientY - box.top) * canvas.height / box.height;\n  const colors = [\"#30d5c8\", \"#ae79ff\", \"#ff8f6b\", \"#facc15\"];\n  context.fillStyle = colors[color++ % colors.length];\n  context.fillRect(x - 18, y - 18, 36, 36);\n});" },
    ],
    config: { entry: "index.html", template: "paint", container: "canvas", sandbox: { network: false, storage: "memory" } },
  },
  webgl: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>WebGL triangle</title>\n<canvas width=\"720\" height=\"440\" aria-label=\"A triangle drawn with WebGL\"></canvas>\n<script src=\"./script.js\"></script>" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst gl = canvas.getContext(\"webgl\", { preserveDrawingBuffer: true });\nif (!gl) throw new Error(\"WebGL is unavailable\");\nfunction shader(type, source) {\n  const value = gl.createShader(type);\n  gl.shaderSource(value, source);\n  gl.compileShader(value);\n  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(\"Shader compilation failed\");\n  return value;\n}\nconst program = gl.createProgram();\ngl.attachShader(program, shader(gl.VERTEX_SHADER, \"attribute vec2 point; void main(){ gl_Position=vec4(point,0.0,1.0); }\"));\ngl.attachShader(program, shader(gl.FRAGMENT_SHADER, \"precision mediump float; void main(){ gl_FragColor=vec4(0.19,0.84,0.78,1.0); }\"));\ngl.linkProgram(program);\nif (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(\"Program linking failed\");\ngl.useProgram(program);\nconst buffer = gl.createBuffer();\ngl.bindBuffer(gl.ARRAY_BUFFER, buffer);\ngl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.75,-0.65, 0.75,-0.65, 0,0.75]), gl.STATIC_DRAW);\nconst point = gl.getAttribLocation(program, \"point\");\ngl.enableVertexAttribArray(point);\ngl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);\ngl.viewport(0, 0, canvas.width, canvas.height);\ngl.clearColor(0.06, 0.09, 0.16, 1);\ngl.clear(gl.COLOR_BUFFER_BIT);\ngl.drawArrays(gl.TRIANGLES, 0, 3);" },
    ],
    config: { entry: "index.html", template: "webgl", container: "canvas", sandbox: { network: false, storage: "memory" } },
  },
  webgpu: {
    files: [
      { path: "index.html", content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>WebGPU triangle</title>\n<canvas width=\"720\" height=\"440\" aria-label=\"A triangle drawn with WebGPU\"></canvas>\n<script src=\"./script.js\"></script>" },
      { path: "script.js", content: "const canvas = document.querySelector(\"canvas\");\nconst gpu = canvas.getContext(\"webgpu\");\nif (!gpu) throw new Error(\"WebGPU is unavailable\");\ngpu.renderTriangle();" },
    ],
    config: { entry: "index.html", template: "webgpu", container: "canvas", sandbox: { network: false, storage: "memory" } },
  },
  three: {
    files: [
      { path: "scene.js", content: "const canvas = document.querySelector(\"canvas\");\nconst geometry = new THREE.BufferGeometry();\ngeometry.setAttribute(\"position\", new THREE.Float32BufferAttribute([-0.72,-0.62,0, 0.72,-0.62,0, 0,0.72,0], 3));\nconst points = geometry.getAttribute(\"position\").array;\nconst gl = canvas.getContext(\"webgl\", { preserveDrawingBuffer: true });\nfunction shader(type, source) { const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item); return item; }\nconst program = gl.createProgram();\ngl.attachShader(program, shader(gl.VERTEX_SHADER, \"attribute vec3 point; void main(){ gl_Position=vec4(point,1.0); }\"));\ngl.attachShader(program, shader(gl.FRAGMENT_SHADER, \"precision mediump float; void main(){ gl_FragColor=vec4(1.0,0.56,0.42,1.0); }\"));\ngl.linkProgram(program); gl.useProgram(program);\nconst buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);\nconst point = gl.getAttribLocation(program, \"point\"); gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point, 3, gl.FLOAT, false, 0, 0);\ngl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0.06,0.09,0.16,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES,0,3);" },
      { path: "three-build-runtime.js", content: "module.exports = { build: function (source, config) { return { files: [\n  { path: 'index.html', content: '<!doctype html><meta charset=\\\"utf-8\\\"><title>Three.js triangle</title><canvas width=\\\"720\\\" height=\\\"440\\\" aria-label=\\\"A triangle built with Three.js\\\"></canvas><script src=\\\"./three-runtime.js\\\"><\\/script><script src=\\\"./scene.js\\\"><\\/script>' },\n  { path: 'three-runtime.js', content: BUILD_API.runtime('three') },\n  { path: 'scene.js', content: source }\n], config: { entry: 'index.html', template: config.template } }; } };" },
      { path: "build.js", content: "module.exports = function (input) { return input.runtime.build(input.application, input.config); };" },
    ],
    config: { entry: "scene.js", template: "three", build: { runtime: "three-build-runtime.js", script: "build.js", application: "scene.js" }, sandbox: { network: false, storage: "memory" } },
  },
  vue: {
    files: [
      { path: "App.vue", content: "<template>\n  <main>\n    <h1>Vue SFC</h1>\n    <button @click=\"count++\">Count {{ count }}</button>\n  </main>\n</template>\n\n<script>\nexport default {\n  data() { return { count: 0 }; }\n};\n</script>\n\n<style>\nbody { margin: 0; display: flex; min-height: 100vh; align-items: center; justify-content: center; font: 16px system-ui; background: #182120; color: #edf7f5; }\nmain { text-align: center; }\nbutton { padding: 0.6rem 1rem; border: 0; border-radius: 0.5rem; color: #102523; background: #55d8c9; cursor: pointer; }\n</style>" },
      { path: "vue-build-runtime.js", content: "module.exports = {\n  build: function (source, path, config) {\n    var compiled = BUILD_API.compileVue(source, path);\n    var component = compiled.script.replace(/export\\s+default/, 'var component =');\n    var render = 'var render = (new Function(\\\"Vue\\\", ' + JSON.stringify(compiled.render) + '))(Vue);\\ncomponent.render = render;\\nVue.createApp(component).mount(\\\"#app\\\");';\n    return {\n      files: [\n        { path: 'index.html', content: '<!doctype html><html><head><meta charset=\\\"utf-8\\\"><title>Vue SFC</title><link rel=\\\"stylesheet\\\" href=\\\"./style.css\\\"></head><body><div id=\\\"app\\\"></div><script src=\\\"./vue-runtime.js\\\"><\\/script><script src=\\\"./app.js\\\"><\\/script></body></html>' },\n        { path: 'style.css', content: compiled.styles },\n        { path: 'vue-runtime.js', content: BUILD_API.runtime('vue') },\n        { path: 'app.js', content: component + '\\n' + render }\n      ],\n      config: { entry: 'index.html', template: config.template, stylesheets: ['style.css'] }\n    };\n  }\n};" },
      { path: "build.js", content: "module.exports = function (input) {\n  return input.runtime.build(input.application, input.applicationPath, input.config);\n};" },
    ],
    config: { entry: "App.vue", template: "vue", build: { runtime: "vue-build-runtime.js", script: "build.js", application: "App.vue" }, sandbox: { network: false, storage: "memory" } },
  },
  svelte: {
    files: [
      { path: "App.svelte", content: "<script>\n  let count = 0;\n</script>\n\n<main>\n  <h1>Svelte</h1>\n  <button onclick={() => count++}>Count {count}</button>\n</main>\n\n<style>\n  :global(body) { margin: 0; display: grid; min-height: 100vh; place-items: center; font: 16px system-ui; background: #221b1b; color: #fff3ed; }\n  main { text-align: center; }\n  button { padding: 0.6rem 1rem; border: 0; border-radius: 0.5rem; color: #32170f; background: #ff8f6b; cursor: pointer; }\n</style>" },
      { path: "svelte-build-runtime.js", content: "module.exports = {\n  build: function (source, path, config) {\n    var compiled = BUILD_API.compileSvelte(source, path).code\n      .replace(/^import ['\"]svelte\\/internal\\/(?:disclose-version|flags\\/legacy)['\"];?\\s*$/gm, '')\n      .replace(/^import \\* as \\$ from ['\"]svelte\\/internal\\/client['\"];?\\s*$/m, 'var $ = SvelteInternal;')\n      .replace('export default function App', 'function App');\n    compiled += '\\nSvelte.mount(App, { target: document.getElementById(\\\"app\\\") });';\n    return {\n      files: [\n        { path: 'index.html', content: '<!doctype html><html><head><meta charset=\\\"utf-8\\\"><title>Svelte</title></head><body><div id=\\\"app\\\"></div><script src=\\\"./svelte-runtime.js\\\"><\\/script><script src=\\\"./app.js\\\"><\\/script></body></html>' },\n        { path: 'svelte-runtime.js', content: BUILD_API.runtime('svelte') },\n        { path: 'app.js', content: compiled }\n      ],\n      config: { entry: 'index.html', template: config.template }\n    };\n  }\n};" },
      { path: "build.js", content: "module.exports = function (input) {\n  return input.runtime.build(input.application, input.applicationPath, input.config);\n};" },
    ],
    config: { entry: "App.svelte", template: "svelte", build: { runtime: "svelte-build-runtime.js", script: "build.js", application: "App.svelte" }, sandbox: { network: false, storage: "memory" } },
  },
  blank: {
    files: [{ path: "index.html", content: "" }],
    config: { entry: "index.html", template: "blank", container: "page", containerOptions: { links: { addTargetBlank: true } }, sandbox: { network: false, storage: "session" } },
  },
  slides: {
    files: [{ path: "index.html", content: "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>Small presentation</title><style>html,body{margin:0;height:100%;background:#101321;color:#f4f6ff;font:20px system-ui}main{height:100%;display:grid;place-items:center;text-align:center}small{color:#9da8d8}</style></head><body><main><div><h1>Small presentation</h1><p>A portable, single-file starting point.</p><small>Import a Resources project ZIP to replace it.</small></div></main></body></html>" }],
    config: { entry: "index.html", template: "slides", container: "single-file-web-app", sandbox: { network: false, storage: "session" } },
  },
});

for (const select of document.querySelectorAll("[data-project-template]")) {
  const before = select.querySelector('option[value="vue"]');
  for (const [value, label] of [["paint", "Canvas paint"], ["webgl", "WebGL triangle"], ["webgpu", "WebGPU triangle"], ["three", "Three.js triangle"], ["slides", "Presentation"]]) {
    if (select.querySelector(`option[value="${value}"]`)) continue;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.insertBefore(option, before);
  }
}

mountContentNameFields();
document.querySelector("[data-try-form]")?.addEventListener("submit", (event) => event.preventDefault());
function attachInstantTooltip(button, label = button.dataset.instantTooltip, shouldShow = () => true) {
  if (!label || button.dataset.instantTooltipAttached === "true") return;
  button.dataset.instantTooltip = label;
  button.dataset.instantTooltipAttached = "true";
  let tooltip = null;
  let showTimer = null;
  const show = () => {
    if (!shouldShow(button) || button.getAttribute("aria-expanded") === "true") return;
    if (!tooltip) {
      tooltip = document.createElement("span");
      tooltip.className = "instant-tooltip";
      tooltip.textContent = label;
      document.body.append(tooltip);
    }
    requestAnimationFrame(() => {
      if (!tooltip) return;
      tooltip.dataset.visible = "";
      const anchor = button.getBoundingClientRect();
      const width = tooltip.offsetWidth;
      const left = Math.max(8, Math.min(innerWidth - width - 8, anchor.left + anchor.width / 2 - width / 2));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${anchor.bottom + 4}px`;
    });
  };
  const hide = () => {
    clearTimeout(showTimer);
    showTimer = null;
    tooltip?.remove();
    tooltip = null;
  };
  button._hideInstantTooltip = hide;
  button.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch" || !shouldShow(button)) return;
    clearTimeout(showTimer);
    showTimer = setTimeout(show, 600);
  });
  button.addEventListener("pointerleave", hide);
  button.addEventListener("pointerdown", hide);
  button.addEventListener("dragstart", hide);
  button.addEventListener("focus", () => {
    if (button.matches(":focus-visible")) show();
  });
  button.addEventListener("blur", hide);
  button.addEventListener("instanttooltiphide", hide);
}
for (const button of document.querySelectorAll("button[data-instant-tooltip]")) {
  attachInstantTooltip(button);
}
document.addEventListener("click", (event) => {
  event.target.closest?.("[data-dismiss-draft-flash]")?.closest("[data-draft-flash]")?.remove();
  const open = event.target.closest?.("[data-open-draft-delete], [data-open-project-delete]");
  if (open) open.closest("[data-project-fields]")?.querySelector("[data-destructive-confirm]")?.removeAttribute("hidden");
  const cancel = event.target.closest?.("[data-cancel-delete]");
  if (cancel) cancel.closest("[data-destructive-confirm]")?.setAttribute("hidden", "");
  if (event.target.closest?.("[data-confirm-draft-delete]")) {
    sessionStorage.removeItem(DRAFT_KEY);
    location.reload();
  }
});

function draftHistory(snapshot) {
  const empty = emptyProjectSnapshot();
  const createdAt = Date.now();
  return { snapshot, checkpoint: snapshot, snapshots: [snapshot], patches: [diffProjectSnapshots(empty, snapshot)], versionTimes: [createdAt], createdAt, lastVersionAt: createdAt };
}

function rebuildDraft(patches, sequence = patches.length) {
  let snapshot = emptyProjectSnapshot();
  for (const patch of patches.slice(0, sequence)) snapshot = applyProjectPatch(snapshot, patch);
  return snapshot;
}

function relativeVersionTime(timestamp, now = Date.now()) {
  const then = new Date(Number(timestamp));
  const current = new Date(now);
  const seconds = Math.max(0, Math.floor((current - then) / 1000));
  const spanish = document.documentElement.lang === "es";
  const amount = (value, singular, plural) => `${value} ${value === 1 ? singular : plural}`;
  if (seconds < 60) return `${amount(seconds, spanish ? "segundo" : "second", spanish ? "segundos" : "seconds")} ${spanish ? "atrás" : "ago"}`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes < 60) {
    const parts = [amount(minutes, spanish ? "minuto" : "minute", spanish ? "minutos" : "minutes")];
    if (remainderSeconds) parts.push(amount(remainderSeconds, spanish ? "segundo" : "second", spanish ? "segundos" : "seconds"));
    return `${parts.join(" ")} ${spanish ? "atrás" : "ago"}`;
  }
  const sameDay = then.getFullYear() === current.getFullYear() && then.getMonth() === current.getMonth() && then.getDate() === current.getDate();
  if (sameDay || seconds < 8 * 3600) {
    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;
    const parts = [amount(hours, spanish ? "hora" : "hour", spanish ? "horas" : "hours")];
    if (remainderMinutes) parts.push(amount(remainderMinutes, spanish ? "minuto" : "minute", spanish ? "minutos" : "minutes"));
    return `${parts.join(" ")} ${spanish ? "atrás" : "ago"}`;
  }
  const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const thenDayStart = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const days = Math.round((dayStart - thenDayStart) / 86_400_000);
  const clock = formatVersionClock(then, spanish);
  if (days === 1) return `${spanish ? "Ayer" : "Yesterday"} ${clock}`;
  const weekdays = spanish
    ? ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (days < 7) return `${weekdays[then.getDay()]} ${clock}`;
  const months = spanish
    ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return spanish
    ? `${then.getDate()} ${months[then.getMonth()]} ${then.getFullYear()}, ${clock}`
    : `${months[then.getMonth()]} ${then.getDate()}, ${then.getFullYear()}, ${clock}`;
}

function formatVersionClock(date, spanish = document.documentElement.lang === "es") {
  const englishUS = !spanish && /^en-US\b/i.test(navigator.language || "");
  if (!englishUS) return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const hour = date.getHours();
  return `${hour % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
}

function formatVersionDateTime(timestamp) {
  const date = new Date(Number(timestamp));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${formatVersionClock(date)}`;
}

function versionChoice(label, timestamp, { current = false, sequence = 0, title = "", latest = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "project-editor__version";
  if (title) {
    const name = document.createElement("span");
    name.className = "project-editor__version-title";
    name.textContent = title;
    button.append(name);
  }
  const time = document.createElement("span");
  time.textContent = label;
  time.dataset.versionTime = String(Number(timestamp));
  button.append(time);
  if (latest) {
    const badge = document.createElement("span");
    badge.className = "project-editor__latest";
    badge.textContent = "LATEST";
    button.append(badge);
  }
  button.title = formatVersionDateTime(timestamp);
  if (sequence) button.dataset.versionSequence = String(sequence);
  if (current) {
    button.setAttribute("aria-current", "true");
  }
  return button;
}

async function mountProjectRoot(root) {
  const editorMount = root.querySelector("[data-project-editor-mount]");
  const preview = root.querySelector("[data-project-preview]");
  const snapshotField = root.querySelector("[data-project-snapshot]");
  const status = root.querySelector("[data-project-status]");
  const statusSave = root.querySelector("[data-project-save]");
  const statusError = root.querySelector("[data-project-error]");
  const statusNotice = root.querySelector("[data-project-notice]");
  const versionButton = root.closest(".project-create__layout")?.querySelector("[data-project-versions-proxy]") || root.querySelector("[data-project-versions]");
  const versionCount = versionButton.querySelector(".project-editor__version-count");
  const currentVersion = versionButton.querySelector("[data-current-version]");
  const historyPanel = root.querySelector("[data-project-history]");
  const versionList = historyPanel.querySelector("[data-project-version-list]");
  // A transformed focused-view ancestor would otherwise make `position:
  // fixed` relative to the project surface instead of the viewport.
  document.body.append(historyPanel);
  const projectId = root.dataset.projectId;
  const persistence = root.dataset.persistence || "stored";
  const draft = persistence === "session";
  const memoryOnly = persistence === "memory";
  const readOnly = root.dataset.readOnly === "true";
  const pendingSnapshotKey = pendingProjectSnapshotKey(projectId);
  const initialProjectLayout = root.closest(".project-create__layout");
  const initialDetailsButton = root.querySelector('[data-project-view="details"]');
  const initiallyNarrow = globalThis.matchMedia?.("(max-width: 760px)").matches === true;
  if (initialProjectLayout) initialProjectLayout.dataset.detailsVisible = String(!initiallyNarrow);
  initialDetailsButton?.setAttribute("aria-pressed", String(!initiallyNarrow));
  root.dataset.draftState = "clean";
  let restoredDraft = false;
  const snapshotUrl = root.querySelector("[data-project-snapshot-url]")?.dataset.projectSnapshotUrl;
  let workspacePayload = null;
  if (snapshotUrl) {
    try {
      const response = await fetch(snapshotUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Project workspace response: ${response.status}`);
      workspacePayload = await response.json();
      snapshotField.value = JSON.stringify(workspacePayload.snapshot);
      versionCount.textContent = String(workspacePayload.versionCount || 1);
      const draftFlash = root.closest(".project-create__layout")?.querySelector("[data-draft-flash]");
      if (draftFlash && workspacePayload.hasUnpublishedChanges) draftFlash.hidden = false;
      else draftFlash?.remove();
    } catch (error) {
      root.dataset.editorMachineState = "failed";
      status.dataset.state = "error";
      status.hidden = false;
      statusError.hidden = false;
      statusError.textContent = `Project failed to load: ${error.message}`;
      return;
    }
  }
  if (typeof snapshotField?.value !== "string") {
    throw new Error("Project snapshot field is unavailable");
  }
  let parsedSnapshot;
  try {
    parsedSnapshot = JSON.parse(snapshotField.value);
  } catch (error) {
    throw new Error(`Project snapshot JSON is invalid: ${error?.message || error}`);
  }
  let state = normalizeProjectSnapshot(parsedSnapshot);
  const initialOutputSnapshot = state;
  // Keep very large project history on the host. Mirroring multi-megabyte
  // snapshots into the editor VM delays (and can prevent) the first render,
  // while the existing host history path has the same observable behavior.
  const historyInEditorMachine = snapshotField.value.length <= 256_000;
  let recoveredPendingSnapshot = false;
  let recoveryFailure = "";
  let recoveryWriteError = "";
  function removeRecovery(key) {
    try { sessionStorage.removeItem(key); return true; }
    catch (error) { recoveryFailure = error.message || String(error); return false; }
  }
  function readRecovery(key) {
    try { return readProjectRecovery(key); }
    catch (error) {
      // In particular, an old page-local resource handle cannot safely be
      // guessed. Retain the stored record rather than deleting it as bad JSON.
      recoveryFailure = error.message || String(error);
      return null;
    }
  }
  if (!readOnly && !draft && !memoryOnly && pendingSnapshotKey) {
    try {
      const pendingValue = readRecovery(pendingSnapshotKey);
      if (pendingValue) {
        const recovered = normalizeProjectSnapshot(JSON.parse(pendingValue));
        if (!projectSnapshotsEqual(state, recovered)) {
          state = recovered;
          snapshotField.value = JSON.stringify(state);
          recoveredPendingSnapshot = true;
        } else {
          removeRecovery(pendingSnapshotKey);
        }
      }
    } catch {
      removeRecovery(pendingSnapshotKey);
    }
  }
  if (workspacePayload) {
    const fields = root.closest(".project-create__layout")?.querySelector("[data-project-fields]");
    const templateField = fields?.querySelector("[data-project-template]");
    const patternsField = fields?.querySelector("#project-link-patterns");
    if (templateField) templateField.value = state.config?.template || "article";
    if (patternsField) patternsField.value = (state.config?.containerOptions?.allowedLinkPatterns || []).join("\n");
  }
  const requestedTemplate = memoryOnly
    ? /^\/try\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(location.pathname)?.[1]
      || queryParameter("template")
    : null;
  if (requestedTemplate && STARTING_POINTS[requestedTemplate]) {
    state = normalizeProjectSnapshot(STARTING_POINTS[requestedTemplate]);
    snapshotField.value = JSON.stringify(state);
  }
  let currentSnapshot = state;
  let viewingHistorical = false;
  let selectedStoredSequence = null;
  let latestStoredSequence = null;
  const selectedVersionField = document.createElement("input");
  selectedVersionField.type = "hidden";
  selectedVersionField.name = "selectedVersion";
  root.append(selectedVersionField);
  let selected = state.files.some((file) => file.path === state.config?.entry) ? state.config.entry : state.files[0]?.path || "config";
  const tabSessionKey = `resources_project_tabs_v1:${projectId || persistence}`;
  let openTabs = [];
  try { openTabs = JSON.parse(sessionStorage.getItem(tabSessionKey)) || []; } catch {}
  if (!openTabs.length) openTabs = Array.isArray(state.config?.editorTabs) ? [...state.config.editorTabs] : [selected];
  let ready = false;
  let pending = recoveredPendingSnapshot;
  let saveTimer = 0;
  let pendingDestructive = false;
  let templateOnlyPending = false;
  let changeGeneration = 0;
  let unsavedChangeCount = 0;
  let currentUpdatedAt = recoveredPendingSnapshot ? Date.now() : Number(workspacePayload?.updatedAt || Date.now());
  let saving = false;
  let localHistory = null;
  let editorController = null;
  let editorGeneration = 0;
  let editorPreviewTimer = 0;
  let activeError = "";
  let activeErrorAction = null;
  let activeStatusSurface = "output";
  let activeNotice = false;
  let persistenceState = status.dataset.state || "normal";
  let persistenceText = statusSave.textContent;
  function showCurrentVersion() {
    currentVersion.textContent = relativeVersionTime(currentUpdatedAt);
    currentVersion.dataset.versionTime = String(currentUpdatedAt);
    currentVersion.title = formatVersionDateTime(currentUpdatedAt);
  }

  function refreshSubmitLabel() {
    const button = root.closest("form")?.querySelector("[data-project-submit]");
    if (!button || draft) return;
    button.textContent = button.dataset.defaultLabel;
    const disabled = unsavedChangeCount === 0
      && workspacePayload?.hasUnpublishedChanges !== true
      && !recoveredPendingSnapshot
      && !(viewingHistorical && selectedStoredSequence !== latestStoredSequence);
    button.disabled = disabled;
    const menuTrigger = root.closest("form")?.querySelector("[data-save-menu-trigger]");
    if (disabled) menuTrigger?.setAttribute("disabled", "");
    else menuTrigger?.removeAttribute("disabled");
  }
  refreshSubmitLabel();

  function showSelectedVersion(label, timestamp) {
    currentVersion.textContent = label;
    currentVersion.dataset.versionTime = String(Number(timestamp));
    currentVersion.title = formatVersionDateTime(timestamp);
  }

  if (draft || memoryOnly) {
    if (draft) {
      const navigation = navigationType();
      if (navigation !== "reload" && navigation !== "back_forward") removeRecovery(DRAFT_KEY);
      try {
        const stored = JSON.parse(readRecovery(DRAFT_KEY));
        if (stored?.patches?.length) {
          restoredDraft = true;
          localHistory = stored;
          localHistory.versionTimes ||= stored.patches.map((_, index) => Number(stored.createdAt || Date.now()) + index);
          localHistory.snapshots ||= stored.patches.map((_, index) => rebuildDraft(stored.patches, index + 1));
          state = normalizeProjectSnapshot(stored.snapshot);
        }
      } catch {
        removeRecovery(DRAFT_KEY);
      }
    }
    localHistory ||= draftHistory(state);
    versionCount.textContent = String(localHistory.patches.length);
  }
  if (restoredDraft) {
    root.dataset.draftState = "saved";
    root.closest("form")?.querySelector("[data-draft-actions]")?.removeAttribute("hidden");
    root.closest("form")?.querySelector("[data-new-draft-flash]")?.removeAttribute("hidden");
  }

  let editorDocumentLimits = null;
  function selectedSource() {
    if (selected === "config") return JSON.stringify(state.config, null, 2) + "\n";
    return state.files.find((file) => file.path === selected)?.content ?? "";
  }
  function selectedContent() {
    const content = selectedSource();
    return editorController?.readContent ? editorController.readContent(content) : content;
  }

  function showSourcePages(source, info) {
    const panel = document.createElement("section");
    panel.className = "project-editor__asset-view";
    const heading = document.createElement("strong");
    heading.textContent = selected;
    const summary = document.createElement("p");
    const count = value => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    summary.textContent = `Read-only source · ${count(info.length)} characters · ${count(info.lines)} lines`;
    const text = document.createElement("div");
    text.className = "project-editor__source-page";
    text.setAttribute("role", "document");
    text.tabIndex = 0;
    text.setAttribute("aria-label", "File source");
    const controls = document.createElement("div");
    const previous = document.createElement("button"), next = document.createElement("button");
    previous.type = next.type = "button";
    previous.textContent = "Previous";
    next.textContent = "Next";
    previous.setAttribute("aria-label", "Previous section");
    next.setAttribute("aria-label", "Next section");
    const position = document.createElement("span");
    position.className = "project-editor__source-position";
    position.setAttribute("aria-live", "polite");
    controls.append(previous, position, next);
    panel.append(heading, summary, text, controls);
    editorMount.parentElement.append(panel);
    const pages = [{ offset: 0, line: 1 }];
    let page = 0, following;
    function render() {
      const { offset, line } = pages[page];
      let value = editorController.readContent ? editorController.readContent(source, offset)
        : source.slice(offset, offset + 64 * 1024);
      if (offset + value.length < info.length) {
        // Prefer complete lines; a single very long line is still bounded.
        const newline = value.lastIndexOf("\n");
        if (newline >= 0) value = value.slice(0, newline + 1);
        else if (/[\uD800-\uDBFF]$/.test(value)) value = value.slice(0, -1);
      }
      const newlines = value.split("\n").length - 1;
      following = { offset: offset + value.length, line: line + newlines };
      text.textContent = value;
      text.scrollTop = 0;
      const lastLine = line + newlines - (value.endsWith("\n") ? 1 : 0);
      position.textContent = `Lines ${line}–${Math.max(line, lastLine)}`;
      previous.disabled = page === 0;
      next.disabled = following.offset >= info.length;
    }
    previous.addEventListener("click", () => { page--; render(); });
    next.addEventListener("click", () => { pages[++page] = following; render(); });
    render();
  }

  function mode() {
    return selected.endsWith(".md") ? "markdown" : "code";
  }

  function language() {
    return editorLanguageForPath(selected);
  }

  function sendContent({ resetHistoryOnEdit = false } = {}) {
    if (!ready || !editorController) return;
    root.dataset.editorLoading = "true";
    const file = state.files.find((file) => file.path === selected);
    const source = selectedSource();
    const info = editorController.contentInfo?.(source);
    const selectedFile = file && { ...file, content: info?.content ?? selectedContent() };
    editorMount.parentElement.querySelector(".project-editor__image-view")?.remove();
    editorMount.parentElement.querySelector(".project-editor__asset-view")?.remove();
    const largeSource = info && !isProjectImage(selectedFile) && editorDocumentLimits &&
      (info.length > editorDocumentLimits.maxCharacters || info.lines > editorDocumentLimits.maxLines);
    editorMount.hidden = isProjectImage(selectedFile) || Boolean(largeSource);
    if (largeSource) {
      showSourcePages(source, info);
      delete root.dataset.editorLoading;
      return;
    }
    if (isProjectImage(selectedFile)) {
      const image = document.createElement("img");
      image.className = "project-editor__image-view";
      image.src = source;
      image.alt = selectedFile.path;
      editorMount.parentElement.append(image);
      delete root.dataset.editorLoading;
      return;
    }
    editorController.setContent(selectedContent(), language(), {
      path: selected, readOnly: readOnly || selected === "config", resetHistoryOnEdit,
    });
    delete root.dataset.editorLoading;
  }

  function renderPreview() {
    clearTimeout(editorPreviewTimer);
    editorPreviewTimer = 0;
    // History, import, and configuration changes render immediately. Typing
    // uses the trailing-edge timer below; the bootstrap owns compilation,
    // iframe lifetime, errors, and the clean swap to the next output.
    editorController?.setSnapshot(state);
    editorController?.renderSnapshot();
  }

  async function mountEditorMachine(reason = "project-open") {
    const generation = ++editorGeneration;
    ready = false;
    editorController?.destroy();
    editorController = null;
    delete root.dataset.editorMachineId;
    root.dataset.editorMachineState = "starting";
    root.dataset.editorMachineReason = reason;
    try {
      const controller = await mountResourcesProjectEditor({
        root: editorMount,
        limits: false,
        onChange: receiveEditorChange,
        onOutputError(error) {
          setStatus(`Output stopped: ${error.message}`, "error", null, "output");
        },
        onOutputReady() {
          if (activeStatusSurface !== "output") return;
          activeError = "";
          activeErrorAction = null;
          renderStatusState();
        },
        onViolation(error) {
          setStatus(`Editor stopped: ${error.message}`, true, { label: root.dataset.resetLabel || "Reset", run: resetStoppedEditor }, "editor");
        },
      });
      if (generation !== editorGeneration) {
        controller.destroy();
        return;
      }
      editorController = controller;
      root.dataset.editorMachineStage = "snapshot";
      editorController.setSnapshot(state);
      const inspection = controller.inspect();
      editorDocumentLimits = inspection?.limits;
      root.dataset.editorMachineId = inspection?.machine?.machineId || "quickjs-editor";
      root.dataset.editorMachineState = "ready";
      root.dataset.editorMachineStage = "history";
      if (localHistory && historyInEditorMachine) localHistory = editorController.history.initialize(localHistory);
      ready = true;
      root.dataset.editorMachineStage = "content";
      sendContent();
      root.dataset.editorMachineStage = "ready";
      if (root.dataset.outputMachineError) {
        setStatus(`Output stopped: ${root.dataset.outputMachineError}`, "error", null, "output");
      }
      // Recovery candidates defer initial output until this guest picks the
      // snapshot. Render even when the candidate was invalid or unchanged.
      if (root.dataset.outputMachineState === "waiting" ||
          !projectSnapshotsEqual(initialOutputSnapshot, state)) renderPreview();
      if (recoveryFailure) setStatus(`Draft recovery failed: ${recoveryFailure}. Stored recovery data was kept.`,
        "warning", null, "editor");
    } catch (error) {
      if (generation !== editorGeneration) return;
      root.dataset.editorMachineState = "failed";
      root.dataset.editorMachineError = error.stack || error.message;
      setStatus(`Editor failed to start: ${error.message}`, true, null, "editor");
    }
  }

  function rotateContainerMachines(reason = "container-change") {
    mountEditorMachine(reason);
  }

  function renderTabs() {
    const menu = root.querySelector("[data-project-file-options]");
    const tabs = root.querySelector("[data-project-tabs]");
    const available = new Set([...state.files.map((file) => file.path), "config"]);
    const selectedAvailable = typeof selected === "string" && available.has(selected);
    openTabs = openTabs.filter((path, index) => available.has(path) && openTabs.indexOf(path) === index);
    if (!openTabs.length) openTabs.push(selectedAvailable ? selected : state.files[0]?.path || "config");
    if (selectedAvailable && !openTabs.includes(selected)) openTabs.push(selected);
    rememberSession(tabSessionKey, JSON.stringify(openTabs));
    menu.replaceChildren();
    for (const button of tabs.querySelectorAll("[data-instant-tooltip-attached='true']")) {
      button._hideInstantTooltip?.();
    }
    tabs.replaceChildren();
    const availableChoices = document.createElement("div");
    availableChoices.className = "project-editor__file-choices";
    availableChoices.dataset.projectFileAvailable = "";
    availableChoices.setAttribute("role", "group");
    const openSection = document.createElement("section");
    openSection.className = "project-editor__open-files";
    openSection.dataset.projectOpenFiles = "";
    const openHeading = document.createElement("p");
    openHeading.textContent = menu.dataset.openFilesLabel || "Open files";
    const openChoices = document.createElement("div");
    openChoices.className = "project-editor__open-file-choices";
    openChoices.setAttribute("role", "group");
    openChoices.setAttribute("aria-label", openHeading.textContent);
    openSection.append(openHeading, openChoices);
    menu.append(availableChoices, openSection);
    function addChoice({ path, label, config = false, open = false }) {
      const tabPath = config ? "config" : path;
      const row = document.createElement("div");
      row.className = "project-editor__file-option-row";
      row.dataset.projectFileChoice = open ? "open" : "available";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-editor__tab";
      if (config) button.dataset.projectConfig = "";
      else button.dataset.projectFile = path;
      button.setAttribute("aria-selected", (config ? selected === "config" : path === selected) ? "true" : "false");
      button.textContent = label;
      const option = button;
      option.className = "project-editor__file-option";
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", button.getAttribute("aria-selected"));
      option.removeAttribute("aria-selected");
      row.append(option);
      if (open && openTabs.length > 1) {
        const close = document.createElement("button");
        close.type = "button";
        close.className = "project-editor__file-option-close";
        close.dataset.closeMenuTab = tabPath;
        close.setAttribute("aria-label", `Close ${label}`);
        close.textContent = "×";
        row.append(close);
      }
      (open ? openChoices : availableChoices).append(row);
    }
    for (const file of state.files) {
      if (!openTabs.includes(file.path)) addChoice({ path: file.path, label: file.path });
    }
    if (!openTabs.includes("config")) addChoice({ label: root.dataset.configLabel || "Configuration", config: true });
    for (const path of openTabs) {
      const file = state.files.find((candidate) => candidate.path === path);
      addChoice({ path: file?.path, label: path === "config" ? root.dataset.configLabel || "Configuration" : file?.path || path, config: path === "config", open: true });
    }
    for (const path of openTabs) {
      const tab = document.createElement("div");
      tab.className = "project-editor__open-tab";
      tab.dataset.tabPath = path;
      tab.setAttribute("draggable", "true");
      const select = document.createElement("button");
      select.type = "button";
      select.dataset.openTab = path;
      select.setAttribute("role", "tab");
      select.setAttribute("aria-selected", String(path === selected));
      const tabLabel = path === "config" ? root.dataset.configLabel || "Configuration" : path.split("/").at(-1);
      select.textContent = tabLabel;
      const nestedPath = path !== "config" && path.includes("/");
      attachInstantTooltip(select, path === "config" ? tabLabel : path, (button) => nestedPath || button.scrollWidth > button.clientWidth);
      tab.append(select);
      if (openTabs.length > 1 && path === selected) {
        const close = document.createElement("button");
        close.type = "button";
        close.className = "project-editor__tab-close";
        close.dataset.closeTab = path;
        close.setAttribute("aria-label", `Close ${tabLabel}`);
        close.textContent = "×";
        tab.append(close);
      }
      tabs.append(tab);
    }
    root.querySelector("[data-project-file-current]").textContent = selected === "config"
      ? root.dataset.configLabel || "Configuration"
      : selected;
  }

  function renderStatusState() {
    status.dataset.state = activeError ? "error" : activeNotice || recoveryWriteError ? "warning" : persistenceState;
    const persistenceWarning = !activeError && !activeNotice && (persistenceState === "warning" || Boolean(recoveryWriteError));
    const workspaceView = root.querySelector(".project-editor__workspace")?.dataset.view;
    const targetSurface = workspaceView !== "preview" &&
      (activeStatusSurface === "editor" || workspaceView === "editor" || (persistenceWarning && recoveryWriteError))
      ? editorMount.closest(".project-editor__source")
      : preview.closest(".project-editor__preview");
    if (targetSurface && status.parentElement !== targetSurface) targetSurface.append(status);
    status.hidden = !(activeError || activeNotice || persistenceWarning);
    statusNotice.hidden = !activeNotice || Boolean(activeError);
    statusError.hidden = !activeError;
    statusSave.hidden = !persistenceWarning;
    statusSave.textContent = recoveryWriteError
      ? `Draft recovery could not be saved: ${recoveryWriteError}. Your edits remain in this tab. Save the project or export a ZIP before closing it.`
      : persistenceText;
    if (recoveryWriteError) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "project-editor__status-action";
      retry.textContent = "Retry";
      retry.addEventListener("click", retryRecovery);
      statusSave.append(document.createTextNode(" "), retry);
    }
    statusError.replaceChildren();
    if (activeError) statusError.append(document.createTextNode(activeError));
    if (activeErrorAction) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "project-editor__status-action";
      action.textContent = activeErrorAction.label;
      action.addEventListener("click", activeErrorAction.run);
      statusError.append(document.createTextNode(" "), action);
    }
  }

  function clearNotice() {
    activeNotice = false;
    statusNotice.replaceChildren();
    renderStatusState();
  }

  function showTemplateNotice(previousSnapshot) {
    activeNotice = true;
    activeStatusSurface = "editor";
    statusNotice.replaceChildren(document.createTextNode(`${root.dataset.templateReplacedLabel || "Template replaced the project."} `));
    const undo = document.createElement("button");
    undo.type = "button";
    undo.textContent = root.dataset.undoLabel || "Undo";
    undo.addEventListener("click", () => {
      applyTemplateSnapshot(previousSnapshot, { notice: false });
      clearNotice();
    }, { once: true });
    statusNotice.append(undo);
    renderStatusState();
  }

  function setStatus(text, severity = "normal", action = null, surface = "editor") {
    const nextState = severity === true ? "error" : severity;
    if (nextState === "error") {
      activeError = text;
      activeErrorAction = action;
      activeStatusSurface = surface;
    }
    else {
      persistenceState = nextState;
      persistenceText = text;
    }
    renderStatusState();
  }

  function resetStoppedEditor() {
    activeError = "";
    activeErrorAction = null;
    renderStatusState();
    mountEditorMachine("manual-reset");
  }

  function storeRecovery(key, value) {
    let error = "";
    try { writeProjectRecovery(key, value); }
    catch (failure) { error = failure.message || String(failure); }
    if (error !== recoveryWriteError) {
      recoveryWriteError = error;
      renderStatusState();
    }
    return !error;
  }

  function retryRecovery() {
    clearTimeout(saveTimer);
    // Browsing history must not replace the latest recovery copy with the
    // historical file currently on screen.
    if (!storeRecovery(draft ? DRAFT_KEY : pendingSnapshotKey,
      JSON.stringify(draft ? localHistory : currentSnapshot))) return;
    if (pending && !viewingHistorical) save();
    else if (draft) {
      root.dataset.draftState = "saved";
      setStatus("Draft saved in this session");
    }
  }

  function updateSnapshot(next, { destructive = false } = {}) {
    const normalized = normalizeProjectSnapshot(next);
    if (projectSnapshotsEqual(state, normalized)) return false;
    const branchedFromHistory = viewingHistorical;
    viewingHistorical = false;
    selectedStoredSequence = null;
    selectedVersionField.value = "";
    state = normalized;
    recoveryFailure = "";
    editorController?.setSnapshot(state);
    currentUpdatedAt = Date.now();
    showCurrentVersion();
    currentSnapshot = state;
    // Form submission and crash recovery need the same immutable snapshot.
    const serialized = JSON.stringify(state);
    snapshotField.value = serialized;
    pending = true;
    if (pendingSnapshotKey && !draft && !memoryOnly) storeRecovery(pendingSnapshotKey, serialized);
    root.dataset.draftDirty = "true";
    root.dataset.draftState = "dirty";
    unsavedChangeCount += 1;
    if (workspacePayload) workspacePayload.hasUnpublishedChanges = true;
    refreshSubmitLabel();
    if (draft) root.closest("form")?.querySelector("[data-draft-actions]")?.removeAttribute("hidden");
    changeGeneration += 1;
    pendingDestructive ||= destructive || branchedFromHistory;
    if (draft || memoryOnly) {
      localHistory.snapshot = state;
      if (editorController && historyInEditorMachine) localHistory = editorController.history.setCurrent(state);
      if (draft) storeRecovery(DRAFT_KEY, JSON.stringify(localHistory));
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1_500);
    return true;
  }

  function checkpointDraft({ destructive = false } = {}) {
    if (viewingHistorical) return true;
    if (recoveryFailure) return false;
    const now = Date.now();
    if (editorController && historyInEditorMachine) {
      localHistory = editorController.history.checkpoint(state, {
        now,
        destructive,
        checkpointIntervalMs: CHECKPOINT_MS,
      });
    } else if (destructive || now - localHistory.lastVersionAt >= CHECKPOINT_MS) {
      const patch = diffProjectSnapshots(localHistory.snapshots.at(-1), state);
      if (!projectPatchIsEmpty(patch)) {
        localHistory.patches.push(patch);
        localHistory.snapshots.push(state);
        localHistory.versionTimes.push(now);
        localHistory.checkpoint = state;
        localHistory.lastVersionAt = now;
        localHistory.snapshot = state;
      }
    }
    versionCount.textContent = String(localHistory.patches.length);
    return !draft || storeRecovery(DRAFT_KEY, JSON.stringify(localHistory));
  }

  async function save() {
    if (!pending || saving) return;
    if (draft || memoryOnly) {
      if ((!templateOnlyPending || recoveryWriteError) &&
          !checkpointDraft({ destructive: pendingDestructive || selected === "config" })) {
        root.dataset.draftState = "warning";
        return;
      }
      pending = false;
      pendingDestructive = false;
      templateOnlyPending = false;
      delete root.dataset.draftDirty;
      root.dataset.draftState = "saved";
      setStatus(memoryOnly ? "" : "Draft saved in this session");
      return;
    }
    const savingGeneration = changeGeneration;
    const savingSnapshot = state;
    const savingDestructive = pendingDestructive && !templateOnlyPending;
    saving = true;
    setStatus("Saving…");
    try {
      const requestSave = () => fetch(`/api/projects/${encodeURIComponent(projectId)}/snapshot`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-resources-csrf": root.dataset.csrf },
        body: JSON.stringify({ snapshot: savingSnapshot, destructive: savingDestructive }),
      });
      let response = await requestSave();
      if (response.status === 403) {
        const failure = await response.clone().json().catch(() => null);
        if (failure?.error === "request_token") {
          // Refresh only the action-bound token, without reloading the editor
          // and losing its in-memory state, then retry this exact snapshot.
          const page = await fetch(location.href, { cache: "no-store" });
          const documentCopy = new DOMParser().parseFromString(await page.text(), "text/html");
          const fresh = [...documentCopy.querySelectorAll("[data-project-editor]")]
            .find((editor) => editor.dataset.projectId === projectId)?.dataset.csrf;
          if (fresh) {
            root.dataset.csrf = fresh;
            response = await requestSave();
          }
        }
      }
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.message || `Save failed (${response.status})`);
      }
      const result = await response.json();
      versionCount.textContent = String(result.versionCount);
      if (changeGeneration === savingGeneration) {
        pending = false;
        pendingDestructive = false;
        templateOnlyPending = false;
        delete root.dataset.draftDirty;
        root.dataset.draftState = "saved";
        const cleared = !pendingSnapshotKey || removeRecovery(pendingSnapshotKey);
        recoveryWriteError = "";
        setStatus(cleared ? "Saved" : `Draft saved on server, but local recovery could not be cleared: ${recoveryFailure}.`,
          cleared ? "normal" : "warning");
      } else {
        setStatus("Saving…");
      }
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      saving = false;
      if (pending && changeGeneration !== savingGeneration) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 250);
      }
    }
  }

  function renderDraftVersions() {
    versionList.replaceChildren();
    const current = versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, { current: !viewingHistorical });
    current.addEventListener("click", () => {
      clearNotice();
      if (!viewingHistorical) return;
      state = currentSnapshot;
      viewingHistorical = false;
      selectedStoredSequence = null;
      snapshotField.value = JSON.stringify(state);
      historyPanel.hidden = true;
      versionButton.setAttribute("aria-expanded", "false");
      renderTabs();
      sendContent();
      renderPreview();
      showCurrentVersion();
      setStatus("Current version");
    });
    versionList.append(current);
    [...localHistory.patches].reverse().forEach((_, reverseIndex) => {
      const sequence = localHistory.patches.length - reverseIndex;
      const button = versionChoice(relativeVersionTime(localHistory.versionTimes[sequence - 1]), localHistory.versionTimes[sequence - 1], {
        sequence, current: viewingHistorical && selectedStoredSequence === sequence,
      });
      button.addEventListener("click", () => {
        clearNotice();
        if (pending) checkpointDraft({ destructive: pendingDestructive });
        pending = false;
        pendingDestructive = false;
        currentSnapshot = localHistory.snapshot;
        const target = normalizeProjectSnapshot(localHistory.snapshots[sequence - 1] || rebuildDraft(localHistory.patches, sequence));
        state = target;
        viewingHistorical = true;
        selectedStoredSequence = sequence;
        snapshotField.value = JSON.stringify(state);
        renderTabs();
        historyPanel.hidden = true;
        versionButton.setAttribute("aria-expanded", "false");
        sendContent();
        renderPreview();
        setStatus(`Viewing version ${sequence}`);
        showSelectedVersion(button.textContent, localHistory.versionTimes[sequence - 1]);
      });
      versionList.append(button);
    });
  }

  async function renderStoredVersions() {
    versionList.textContent = "Loading…";
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/versions`);
    if (!response.ok) { versionList.textContent = "Version history unavailable."; return; }
    const { versions } = await response.json();
    latestStoredSequence = versions.find(version => version.latest)?.sequence ?? null;
    versionList.replaceChildren();
    if (!viewingHistorical) showCurrentVersion();
    const hasCurrentDraft = workspacePayload?.hasUnpublishedChanges === true || unsavedChangeCount > 0 || recoveredPendingSnapshot;
    if (!viewingHistorical && !hasCurrentDraft && latestStoredSequence !== null) {
      selectedStoredSequence = latestStoredSequence;
      selectedVersionField.value = String(latestStoredSequence);
    }
    const current = versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, { current: !viewingHistorical });
    current.addEventListener("click", () => {
      clearNotice();
      if (!viewingHistorical) return;
      state = currentSnapshot;
      viewingHistorical = false;
      selectedStoredSequence = null;
      selectedVersionField.value = "";
      snapshotField.value = JSON.stringify(state);
      historyPanel.hidden = true;
      versionButton.setAttribute("aria-expanded", "false");
      renderTabs();
      sendContent();
      renderPreview();
      showCurrentVersion();
      refreshSubmitLabel();
      setStatus("Current version");
    });
    if (hasCurrentDraft && latestStoredSequence === null) versionList.append(current);
    for (const version of versions) {
      const timestamp = version.latest ? version.savedAt || version.createdAt : version.createdAt;
      const button = versionChoice(relativeVersionTime(timestamp), timestamp, {
        sequence: version.sequence, title: version.title, latest: version.latest,
        current: viewingHistorical ? selectedStoredSequence === version.sequence : !hasCurrentDraft && version.latest,
      });
      button.addEventListener("click", async () => {
        clearNotice();
        await save();
        if (!viewingHistorical) currentSnapshot = state;
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/versions/${version.sequence}`);
        if (!response.ok) { setStatus("Version unavailable", true); return; }
        const result = await response.json();
        state = normalizeProjectSnapshot(result.snapshot);
        viewingHistorical = true;
        selectedStoredSequence = version.sequence;
        selectedVersionField.value = String(version.sequence);
        snapshotField.value = JSON.stringify(state);
        historyPanel.hidden = true;
        versionButton.setAttribute("aria-expanded", "false");
        renderTabs();
        sendContent();
        renderPreview();
        showSelectedVersion(relativeVersionTime(timestamp), timestamp);
        refreshSubmitLabel();
        setStatus(`Viewing ${button.textContent}`);
      });
      versionList.append(button);
      if (hasCurrentDraft && version.latest) versionList.append(current);
    }
  }

  function receiveEditorChange(content, { syntaxErrors = false } = {}) {
    if (typeof content !== "string") return;
    if (readOnly || editorMount.hidden || selected === "config" || content === selectedContent()) return;
    try {
      clearNotice();
      if (updateSnapshot({ files: state.files.map((file) => file.path === selected ? { ...file, content } : file), config: state.config })) templateOnlyPending = false;
      clearTimeout(editorPreviewTimer);
      if (syntaxErrors) {
        // Briefly invalid source is normal while typing. Keep the last good
        // output visible and only surface the warning if it remains invalid.
        editorPreviewTimer = setTimeout(() => {
          setStatus("Blocked: Output is waiting for valid syntax.", "error", null, "output");
        }, 5_000);
      } else {
        // Keep the current output alive while the user is typing. Rebuilding
        // its DOM and QuickJS machine is intentionally a trailing-edge task.
        const debounceMs = Math.min(5_000, Math.max(250, Number(state.config?.output?.debounceMs) || 900));
        editorPreviewTimer = setTimeout(() => editorController?.renderSnapshot(), debounceMs);
      }
    } catch (error) {
      setStatus(`Editor update failed: ${error.message || String(error)}`, "error", null, "editor");
    }
  }
  function selectProjectFile(event) {
    let target = event.target;
    let next = "";
    while (target && target !== fileMenu) {
      const path = target.getAttribute?.("data-project-file");
      if (path !== null && path !== undefined) {
        next = path;
        break;
      }
      if (target.hasAttribute?.("data-project-config")) {
        next = "config";
        break;
      }
      target = target.parentElement;
    }
    if (!next) return;
    selected = next;
    if (!openTabs.includes(selected)) openTabs.push(selected);
    renderTabs();
    sendContent();
  }
  const openTabList = root.querySelector("[data-project-tabs]");
  const tabScrollBack = document.createElement("button");
  const tabScrollForward = document.createElement("button");
  for (const [button, label, text] of [[tabScrollBack, "Scroll tabs left", "‹"], [tabScrollForward, "Scroll tabs right", "›"]]) {
    button.type = "button";
    button.className = "project-editor__tab-scroll";
    button.setAttribute("aria-label", label);
    button.textContent = text;
    button.hidden = true;
  }
  openTabList.before(tabScrollBack);
  openTabList.after(tabScrollForward);
  function syncTabOverflow() {
    const overflowed = openTabList.scrollWidth > openTabList.clientWidth + 2;
    tabScrollBack.hidden = !overflowed;
    tabScrollForward.hidden = !overflowed;
    tabScrollBack.disabled = openTabList.scrollLeft <= 1;
    tabScrollForward.disabled = openTabList.scrollLeft + openTabList.clientWidth >= openTabList.scrollWidth - 1;
  }
  tabScrollBack.addEventListener("click", () => openTabList.scrollBy({ left: -Math.max(120, openTabList.clientWidth * .7), behavior: "smooth" }));
  tabScrollForward.addEventListener("click", () => openTabList.scrollBy({ left: Math.max(120, openTabList.clientWidth * .7), behavior: "smooth" }));
  openTabList.addEventListener("scroll", syncTabOverflow);
  new ResizeObserver(syncTabOverflow).observe(openTabList);
  function closeOpenTab(path) {
    if (openTabs.length <= 1) return;
    const index = openTabs.indexOf(path);
    if (index < 0) return;
    openTabs.splice(index, 1);
    if (selected === path) selected = openTabs[Math.min(index, openTabs.length - 1)];
    renderTabs();
    requestAnimationFrame(syncTabOverflow);
    sendContent();
  }
  openTabList.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-tab]");
    if (close && openTabs.length > 1) {
      closeOpenTab(close.dataset.closeTab);
      return;
    }
    const tab = event.target.closest("[data-open-tab]");
    if (!tab) return;
    selected = tab.dataset.openTab;
    renderTabs();
    requestAnimationFrame(syncTabOverflow);
    sendContent();
  });
  let draggedTab = "";
  openTabList.addEventListener("dragstart", (event) => {
    draggedTab = event.target.closest("[data-tab-path]")?.dataset.tabPath || "";
    if (draggedTab) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedTab);
    }
  });
  openTabList.addEventListener("dragover", (event) => { if (draggedTab) event.preventDefault(); });
  openTabList.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest("[data-tab-path]")?.dataset.tabPath;
    if (!draggedTab || !target || draggedTab === target) return;
    const sourceIndex = openTabs.indexOf(draggedTab);
    const targetIndex = openTabs.indexOf(target);
    openTabs.splice(sourceIndex, 1);
    openTabs.splice(targetIndex, 0, draggedTab);
    draggedTab = "";
    renderTabs();
    requestAnimationFrame(syncTabOverflow);
  });
  openTabList.addEventListener("dragend", () => { draggedTab = ""; });
  const fileTrigger = root.querySelector("[data-project-file-trigger]");
  const fileTriggerIcon = fileTrigger.querySelector("svg");
  fileTriggerIcon.replaceChildren();
  for (const d of ["M7 4h12v14H7zM4 7v14h12", "M10 8h6M10 11h6M10 14h4"]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    fileTriggerIcon.append(path);
  }
  const fileTriggerArrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  fileTriggerArrow.classList.add("project-editor__file-arrow");
  fileTriggerArrow.setAttribute("viewBox", "0 0 12 12");
  fileTriggerArrow.setAttribute("fill", "none");
  fileTriggerArrow.setAttribute("stroke", "currentColor");
  fileTriggerArrow.setAttribute("stroke-width", "1.5");
  fileTriggerArrow.setAttribute("aria-hidden", "true");
  const fileTriggerArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  fileTriggerArrowPath.setAttribute("d", "m2 4 4 4 4-4");
  fileTriggerArrow.append(fileTriggerArrowPath);
  fileTrigger.append(fileTriggerArrow);
  const fileMenu = root.querySelector("[data-project-file-menu]");
  const fileFilter = root.querySelector("[data-project-file-filter]");
  fileFilter.previousElementSibling?.remove();
  fileFilter.setAttribute("aria-label", "Filter files");
  const fileEmpty = root.querySelector("[data-project-file-empty]");
  function filterProjectFiles() {
    const query = fileFilter.value.trim().toLowerCase();
    let visible = 0;
    for (const option of fileMenu.querySelectorAll('[role="menuitemradio"]')) {
      const row = option.closest(".project-editor__file-option-row");
      row.hidden = Boolean(query && !option.textContent.toLowerCase().includes(query));
      if (!row.hidden) visible += 1;
    }
    for (const group of fileMenu.querySelectorAll("[data-project-file-available], [data-project-open-files]")) {
      group.hidden = !group.querySelector(".project-editor__file-option-row:not([hidden])");
    }
    fileEmpty.hidden = visible !== 0;
  }
  function closeFileMenu({ focus = false } = {}) {
    fileMenu.hidden = true;
    fileTrigger.setAttribute("aria-expanded", "false");
    if (focus) fileTrigger.focus();
  }
  fileTrigger.addEventListener("click", () => {
    const opening = fileMenu.hidden;
    fileMenu.hidden = !opening;
    fileTrigger.setAttribute("aria-expanded", String(opening));
    if (opening) {
      fileFilter.value = "";
      filterProjectFiles();
      fileFilter.focus();
    }
  });
  fileFilter.addEventListener("input", filterProjectFiles);
  fileMenu.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-menu-tab]");
    if (close) {
      closeOpenTab(close.dataset.closeMenuTab);
      filterProjectFiles();
      return;
    }
    selectProjectFile(event);
    closeFileMenu({ focus: true });
  });
  fileMenu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeFileMenu({ focus: true });
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const options = [...fileMenu.querySelectorAll('[role="menuitemradio"]')].filter((option) => !option.closest(".project-editor__file-option-row").hidden);
    const current = Math.max(0, options.indexOf(document.activeElement));
    const next = event.key === "Home" ? 0
      : event.key === "End" ? options.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!root.querySelector("[data-project-file-picker]").contains(event.target)) closeFileMenu();
  });
  const editorOverflow = root.querySelector("[data-editor-overflow]");
  const editorOverflowTrigger = root.querySelector("[data-editor-overflow-trigger]");
  const editorOverflowMenu = root.querySelector("[data-editor-overflow-menu]");
  function closeEditorOverflow({ focus = false } = {}) {
    editorOverflowMenu.hidden = true;
    editorOverflowTrigger.setAttribute("aria-expanded", "false");
    if (focus) editorOverflowTrigger.focus();
  }
  editorOverflowTrigger.addEventListener("click", () => {
    const opening = editorOverflowMenu.hidden;
    editorOverflowMenu.hidden = !opening;
    editorOverflowTrigger.setAttribute("aria-expanded", String(opening));
    if (opening) editorOverflowMenu.querySelector('[role="menuitem"]')?.focus();
  });
  editorOverflowMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeEditorOverflow({ focus: true });
  });
  document.addEventListener("pointerdown", (event) => {
    if (!editorOverflow.contains(event.target)) closeEditorOverflow();
  });
  root.querySelector("[data-save-tab-configuration]").addEventListener("click", () => {
    closeEditorOverflow();
    updateSnapshot({ files: state.files, config: { ...state.config, editorTabs: [...openTabs] } });
    setStatus("Tab configuration saved");
  });
  const archiveInput = root.querySelector("[data-project-archive-file]");
  root.querySelector("[data-project-import]").addEventListener("click", () => { closeEditorOverflow(); archiveInput.click(); });
  root.querySelector("[data-project-export]").addEventListener("click", () => {
    closeEditorOverflow();
    try {
      const projectName = String(root.closest("form")?.elements?.namedItem("slug")?.value || root.dataset.projectSlug || "").trim();
      downloadProjectArchive(state, projectName);
    } catch (error) { setStatus(error.message, "error"); }
  });
  archiveInput.addEventListener("change", async () => {
    try {
      const imported = normalizeProjectSnapshot(await importProjectArchive());
      selected = imported.config.entry && imported.files.some((item) => item.path === imported.config.entry) ? imported.config.entry : imported.files[0].path;
      updateSnapshot(imported, { destructive: true });
      if (template) template.value = imported.config.template || "blank";
      if (linkPatterns) {
        linkPatterns.value = (imported.config?.containerOptions?.allowedLinkPatterns || []).join("\n");
        growTextarea(linkPatterns);
      }
      renderTabs();
      sendContent();
      renderPreview();
      setStatus("ZIP imported");
    } catch (error) { setStatus(error.message, "error"); }
    finally { archiveInput.value = ""; }
  });
  const workspace = root.querySelector(".project-editor__workspace");
  const outputOverflow = root.querySelector("[data-output-overflow]");
  const outputOverflowTrigger = root.querySelector("[data-output-overflow-trigger]");
  const outputOverflowMenu = root.querySelector("[data-output-overflow-menu]");
  const fullscreenButton = root.querySelector("[data-project-fullscreen]");
  function closeOutputOverflow({ focus = false } = {}) {
    outputOverflowMenu.hidden = true;
    outputOverflowTrigger.setAttribute("aria-expanded", "false");
    if (focus) outputOverflowTrigger.focus();
  }
  outputOverflowTrigger.addEventListener("click", () => {
    const opening = outputOverflowMenu.hidden;
    outputOverflowMenu.hidden = !opening;
    outputOverflowTrigger.setAttribute("aria-expanded", String(opening));
    if (opening) fullscreenButton.focus();
  });
  fullscreenButton.addEventListener("click", async () => {
    closeOutputOverflow();
    const frame = root.querySelector(".project-editor__output-frame");
    if (!frame) return setStatus("Output is not ready", "error");
    try { await frame.requestFullscreen(); }
    catch (error) { setStatus(`Full screen failed: ${error?.message || String(error)}`, "error"); }
  });
  outputOverflowMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeOutputOverflow({ focus: true });
  });
  document.addEventListener("pointerdown", (event) => {
    if (!outputOverflow.contains(event.target)) closeOutputOverflow();
  });
  const splitter = root.querySelector(".project-editor__splitter");
  const projectLayout = root.closest(".project-create__layout");
  const projectClose = projectLayout.querySelector(".project-fields__toolbar .project-close");
  const projectCloseHome = projectClose?.parentElement;
  const projectViewControls = root.querySelector(".project-editor__view-controls");
  const projectDetails = root.querySelector('[data-project-view="details"]');
  function placeProjectClose(detailsVisible) {
    if (!projectClose) return;
    if (detailsVisible) {
      // The close button may still be in the other toolbar. Restore it before
      // using it as an insertion anchor in its original parent.
      projectCloseHome.append(projectClose);
      projectCloseHome.insertBefore(projectDetails, projectClose);
    } else {
      projectViewControls.append(projectDetails);
      projectViewControls.append(projectClose);
    }
  }
  function setSplit(clientX) {
    const rect = workspace.getBoundingClientRect();
    const percent = Math.max(20, Math.min(80, ((clientX - rect.left) / rect.width) * 100));
    root.style.setProperty("--source-width", `${percent}%`);
    splitter.setAttribute("aria-valuenow", String(Math.round(percent)));
  }
  splitter.addEventListener("pointerdown", (event) => { splitter.setPointerCapture(event.pointerId); setSplit(event.clientX); });
  splitter.addEventListener("pointermove", (event) => { if (splitter.hasPointerCapture(event.pointerId)) setSplit(event.clientX); });
  splitter.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = Math.max(20, Math.min(80, Number(splitter.getAttribute("aria-valuenow")) + (event.key === "ArrowRight" ? 5 : -5)));
    root.style.setProperty("--source-width", `${next}%`);
    splitter.setAttribute("aria-valuenow", String(next));
  });
  for (const button of root.querySelectorAll("[data-project-view]")) button.addEventListener("click", () => {
    const detailsButton = projectDetails;
    if (button.dataset.projectView === "details") {
      if (narrowWorkspace.matches) {
        const showing = projectLayout.dataset.mobileView === "details";
        if (showing) delete projectLayout.dataset.mobileView;
        else projectLayout.dataset.mobileView = "details";
        detailsButton.setAttribute("aria-pressed", String(!showing));
        placeProjectClose(!showing);
      } else {
        const showing = projectLayout.dataset.detailsVisible !== "false";
        projectLayout.dataset.detailsVisible = String(!showing);
        detailsButton.setAttribute("aria-pressed", String(!showing));
        placeProjectClose(!showing);
      }
    } else {
      delete projectLayout.dataset.mobileView;
      workspace.dataset.view = button.dataset.projectView;
      for (const item of root.querySelectorAll('.project-view-segments [data-project-view]')) item.setAttribute("aria-pressed", item === button ? "true" : "false");
      if (narrowWorkspace.matches) {
        detailsButton.setAttribute("aria-pressed", "false");
        // Leaving Details via a view button hides its pane too. Bring the
        // toggle and close link back before they disappear with that pane.
        placeProjectClose(false);
      }
    }
    renderStatusState();
    if (button.dataset.projectView === "editor") editorController?.focus();
  });
  const narrowWorkspace = matchMedia("(max-width: 760px)");
  function syncResponsiveWorkspace() {
    const view = narrowWorkspace.matches ? "preview" : "split";
    const selectedButton = root.querySelector(`[data-project-view="${view}"]`);
    const detailsButton = projectDetails;
    if (narrowWorkspace.matches) {
      projectLayout.dataset.detailsVisible = "false";
      delete projectLayout.dataset.mobileView;
      detailsButton.setAttribute("aria-pressed", "false");
      placeProjectClose(false);
    } else {
      delete projectLayout.dataset.mobileView;
      projectLayout.dataset.detailsVisible = "true";
      detailsButton.setAttribute("aria-pressed", "true");
      placeProjectClose(true);
    }
    workspace.dataset.view = view;
    for (const item of root.querySelectorAll('.project-view-segments [data-project-view]')) item.setAttribute("aria-pressed", item === selectedButton ? "true" : "false");
    renderStatusState();
  }
  syncResponsiveWorkspace();
  narrowWorkspace.addEventListener?.("change", syncResponsiveWorkspace);
  // Read-only public projects use the same Details fields without wrapping
  // them in a form. Keep their container description synchronized with the
  // asynchronously loaded project snapshot too.
  const form = root.closest("form") || document.querySelector("[data-project-fields]");
  const template = form?.querySelector("[data-project-template]");
  const linkPatterns = form?.querySelector("#project-link-patterns");
  if (template && !template.querySelector('option[value="slides"]')) {
    const option = document.createElement("option");
    option.setAttribute("value", "slides");
    option.textContent = "Presentation";
    template.append(option);
  }
  function growTextarea(textarea) {
    if (!textarea) return;
    const replica = textarea.closest("[data-autogrow-replica]");
    if (replica) {
      const measure = replica.querySelector("[data-autogrow-measure]");
      if (measure) measure.textContent = `${textarea.value} `;
      textarea.style.removeProperty("height");
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }
  if (template && state.config?.template) template.value = state.config.template;
  if (linkPatterns) linkPatterns.value = (state.config?.containerOptions?.allowedLinkPatterns || []).join("\n");
  growTextarea(linkPatterns);
  function updateContainer() {
    const allowedLinkPatterns = String(linkPatterns?.value || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    try {
      validateAllowedUrlPatterns(allowedLinkPatterns);
      linkPatterns?.setCustomValidity("");
      linkPatterns?.setAttribute("aria-invalid", "false");
    } catch (error) {
      linkPatterns?.setCustomValidity(error.message);
      linkPatterns?.setAttribute("aria-invalid", "true");
      return;
    }
    clearNotice();
    templateOnlyPending = false;
    updateSnapshot({ files: state.files, config: { ...state.config, containerOptions: { ...state.config.containerOptions, allowedLinkPatterns } } }, { destructive: true });
    sendContent();
    renderPreview();
  }

  function applyTemplateSnapshot(next, { notice = true, previousSnapshot = state } = {}) {
    if (linkPatterns) linkPatterns.value = (next.config.containerOptions?.allowedLinkPatterns || []).join("\n");
    if (template) template.value = next.config.template || "blank";
    growTextarea(linkPatterns);
    selected = next.files[0].path;
    openTabs = Array.isArray(next.config?.editorTabs) ? [...next.config.editorTabs] : next.files.map((file) => file.path);
    updateSnapshot(next, { destructive: true });
    templateOnlyPending = true;
    renderTabs();
    sendContent();
    renderPreview();
    if (notice) showTemplateNotice(previousSnapshot);
  }

  template?.addEventListener("change", async () => {
    const next = STARTING_POINTS[template.value];
    if (!next) return;
    if (memoryOnly && (location.pathname === "/try" || location.pathname.startsWith("/try/"))) {
      replaceFrontendPath(`/try/${encodeURIComponent(template.value)}`);
    }
    if (pending) {
      if (templateOnlyPending) {
        clearTimeout(saveTimer);
        pending = false;
        pendingDestructive = false;
      } else if (draft || memoryOnly) checkpointDraft({ destructive: true });
      else await save();
    }
    const previousSnapshot = state;
    applyTemplateSnapshot(next, { previousSnapshot });
  });
  for (const textarea of form?.querySelectorAll("textarea[data-autogrow]") || []) {
    textarea.addEventListener("input", () => growTextarea(textarea));
    growTextarea(textarea);
  }
  linkPatterns?.addEventListener("input", updateContainer);
  for (const field of form?.querySelectorAll("[data-project-fields] input:not([type=hidden]), [data-project-fields] textarea:not([data-project-snapshot]), [data-project-fields] select") || []) {
    if (field.matches("[data-project-template], #project-link-patterns, [data-version-title-input]")) continue;
    field.addEventListener("input", () => { unsavedChangeCount += 1; refreshSubmitLabel(); }, { once: true });
    field.addEventListener("change", () => { if (!unsavedChangeCount) { unsavedChangeCount = 1; refreshSubmitLabel(); } });
  }
  function closeHistory({ restoreFocus = false } = {}) {
    historyPanel.hidden = true;
    versionButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) versionButton.focus();
  }
  function positionHistory() {
    const gap = 5;
    const edge = 8;
    const buttonRect = versionButton.getBoundingClientRect();
    const panelRect = historyPanel.getBoundingClientRect();
    const containingRect = historyPanel.parentElement?.getBoundingClientRect() || { left: 0, top: 0 };
    historyPanel.style.left = `${Math.max(edge, Math.min(buttonRect.left, innerWidth - panelRect.width - edge)) - containingRect.left}px`;
    historyPanel.style.top = `${buttonRect.bottom + gap - containingRect.top}px`;
    historyPanel.style.maxHeight = `${Math.max(120, innerHeight - buttonRect.bottom - gap - edge)}px`;
  }
  const openVersionHistory = () => {
    if (!historyPanel.hidden) {
      closeHistory();
      return;
    }
    versionButton._hideInstantTooltip?.();
    historyPanel.hidden = false;
    versionButton.setAttribute("aria-expanded", "true");
    positionHistory();
    if (readOnly) {
      versionList.replaceChildren(versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, { current: true }));
      positionHistory();
    } else if (draft || memoryOnly) {
      renderDraftVersions();
      positionHistory();
    } else {
      renderStoredVersions().then(positionHistory).catch((error) => {
        versionList.textContent = `Version history unavailable: ${error.message}`;
        positionHistory();
      });
    }
  };
  versionButton.addEventListener("click", openVersionHistory);
  // This listener is registered after asynchronous project initialization.
  // A synchronous read provides the bridge boundary that publishes it before
  // control returns to the browser.
  versionButton.getBoundingClientRect();
  document.addEventListener("pointerdown", (event) => {
    if (historyPanel.hidden || historyPanel.contains(event.target) || versionButton.contains(event.target)) return;
    closeHistory();
  });
  setInterval(() => { if (readOnly) return; if (draft || memoryOnly) checkpointDraft(); else if (pending) save(); }, CHECKPOINT_MS);
  setInterval(() => {
    for (const label of root.closest(".project-create__layout")?.querySelectorAll("[data-version-time]") || []) {
      label.textContent = relativeVersionTime(label.dataset.versionTime);
    }
  }, 30_000);
  if (!readOnly && !draft && !memoryOnly) renderStoredVersions();
  root.closest("form")?.addEventListener("submit", (event) => {
    try {
      if (!editorController) throw new Error("The project editor is still loading");
      editorController.prepareSubmit?.();
    } catch (error) {
      event.preventDefault();
      setStatus(`Save failed: ${error.message || String(error)}`, "error", null, "editor");
    }
  });
  renderTabs();
  mountEditorMachine();
  if (recoveredPendingSnapshot) saveTimer = setTimeout(save, 0);
  addEventListener("pagehide", () => {
    historyPanel.remove();
    editorGeneration += 1;
    editorController?.destroy();
    clearTimeout(editorPreviewTimer);
  }, { once: true });
}

for (const root of document.querySelectorAll("[data-project-editor]")) {
  mountProjectRoot(root).catch((error) => globalThis.__wwcReportError?.(
    error?.stack || error?.message || String(error)));
}

for (const figure of document.querySelectorAll(".blog-example-block")) {
  const button = figure.querySelector(".blog-example-fullscreen");
  const frame = figure.querySelector(".blog-example");
  const error = figure.querySelector(".blog-example-error");
  let presentationReady = false;
  function focusBlogPresentation() {
    if (!presentationReady) return;
    frame?.focus({ preventScroll: true });
    frame?.contentWindow?.postMessage({ protocol: "resources-project-presentation-v1", type: "focus" }, "*");
  }
  if (!button) continue;
  const blogContentBlock = figure.closest(".content-block");
  function closeBlogPresentation({ focus = true } = {}) {
    if (!figure.classList.contains("blog-example-block--fullscreen")) return;
    figure.classList.remove("blog-example-block--fullscreen");
    blogContentBlock?.style.removeProperty("animation");
    blogContentBlock?.style.removeProperty("backdrop-filter");
    blogContentBlock?.style.removeProperty("transform");
    document.body.classList.remove("blog-example-presenting");
    button.textContent = "View full screen ↗";
    button.setAttribute("aria-label", "View full screen");
    if (focus) button.focus();
  }
  button.addEventListener("click", (event) => {
    if (figure.classList.contains("blog-example-block--fullscreen")) {
      closeBlogPresentation({ focus: event.detail === 0 });
      return;
    }
    figure.classList.add("blog-example-block--fullscreen");
    blogContentBlock?.style.setProperty("animation", "none");
    blogContentBlock?.style.setProperty("backdrop-filter", "none");
    blogContentBlock?.style.setProperty("transform", "none");
    document.body.classList.add("blog-example-presenting");
    button.textContent = "×";
    button.setAttribute("aria-label", "Close full screen");
    button.blur();
    requestAnimationFrame(focusBlogPresentation);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !figure.classList.contains("blog-example-block--fullscreen")) return;
    event.preventDefault();
    closeBlogPresentation();
  });
  addEventListener("message", (event) => {
    if (event.source !== frame?.contentWindow || event.data?.protocol !== "resources-project-presentation-v1") return;
    if (event.data.type === "ready") {
      presentationReady = true;
      if (figure.classList.contains("blog-example-block--fullscreen")) focusBlogPresentation();
    }
    if (event.data.type === "escape") closeBlogPresentation();
    if (event.data.type === "status") {
      error.hidden = event.data.status !== "blocked";
      error.textContent = event.data.status === "blocked" ? `Blocked: ${event.data.message}` : "";
    }
  });
  addEventListener("pagehide", () => closeBlogPresentation({ focus: false }), { once: true });
}

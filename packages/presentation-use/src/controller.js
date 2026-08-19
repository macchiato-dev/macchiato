const PROTOCOL = "macchiato-presentation-use-v1";
const CDN_ORIGINS = new Set(["https://cdn.jsdelivr.net", "https://unpkg.com"]);
const DEFAULT_FETCH_LIMITS = Object.freeze({ maxFiles: 10, maxUrlLength: 100, maxFileBytes: 1024 * 1024, maxTotalBytes: 4 * 1024 * 1024 });

export function validateProjectFetchConfig(config = {}) {
  const limits = { ...DEFAULT_FETCH_LIMITS, ...(config.limits || {}) };
  const resources = [...new Set(config.resources || [])];
  if (resources.length > Math.min(10, limits.maxFiles)) throw new Error(`Project fetch allows at most ${Math.min(10, limits.maxFiles)} files`);
  for (const value of resources) {
    if (typeof value !== "string" || value.length > Math.min(100, limits.maxUrlLength)) throw new Error("Project fetch URL exceeds 100 characters");
    const url = new URL(value);
    if (!CDN_ORIGINS.has(url.origin)) throw new Error(`Project fetch origin not allowed: ${url.origin}`);
    if (url.search || url.hash) throw new Error("Project fetch URLs cannot contain a query string or fragment");
    if (url.protocol !== "https:") throw new Error("Project fetch requires HTTPS");
  }
  return { resources, limits };
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  return btoa(binary);
}

async function loadProjectFetchResources(config) {
  if (!config?.resources?.length) return {};
  const { resources, limits } = validateProjectFetchConfig(config);
  const loaded = {};
  let totalBytes = 0;
  await Promise.all(resources.map(async (value) => {
    const response = await fetch(value, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" });
    if (!response.ok) throw new Error(`Project fetch response ${response.status}: ${value}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limits.maxFileBytes) throw new Error(`Project fetch file exceeds ${limits.maxFileBytes} bytes: ${value}`);
    totalBytes += bytes.byteLength;
    if (totalBytes > limits.maxTotalBytes) throw new Error(`Project fetch total exceeds ${limits.maxTotalBytes} bytes`);
    const type = (response.headers.get("content-type") || "application/octet-stream").split(";", 1)[0].toLowerCase();
    const text = /^(?:text\/|application\/(?:json|javascript|xml)|image\/svg\+xml)/.test(type) ? new TextDecoder().decode(bytes) : "";
    loaded[value] = { status: response.status, type, text, dataUrl: `data:${type};base64,${bytesToBase64(bytes)}` };
  }));
  return loaded;
}

export function mountPresentationUse({ root, runnerUrl, project, onStatus = () => {} }) {
  if (!(root instanceof Element)) throw new TypeError("presentation-use root must be an Element");
  if (!runnerUrl) throw new TypeError("presentation-use runnerUrl is required");
  const channel = crypto.randomUUID();
  const frame = document.createElement("iframe");
  frame.className = "project-editor__presentation-frame";
  frame.title = project.title || "Presentation";
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.src = runnerUrl;
  root.replaceChildren(frame);
  const colorScheme = () => document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const language = () => document.documentElement.lang || "en";
  const projectPayload = (project.fileUrl
    ? fetch(project.fileUrl, { credentials: "omit", referrerPolicy: "no-referrer" }).then(async (response) => {
      if (!response.ok) throw new Error(`Presentation entry response: ${response.status}`);
      return { ...project, file: await response.text(), fileUrl: undefined };
    })
    : Promise.resolve(project)).then(async (payload) => ({
      ...payload,
      fetchResources: await loadProjectFetchResources(payload.capabilities?.fetch),
    }));

  function receive(event) {
    if (event.source !== frame.contentWindow || event.data?.protocol !== PROTOCOL || event.data.channel !== channel) return;
    if (event.data.type === "ready") projectPayload
      .then((payload) => frame.contentWindow.postMessage({
        protocol: PROTOCOL,
        channel,
        type: "mount",
        project: { ...payload, colorScheme: colorScheme(), environment: { ...payload.environment, language: language() } },
      }, "*"))
      .catch((error) => onStatus({ type: "blocked", message: error.message }));
    else {
      if (event.data.runtime) frame.dataset.runtime = event.data.runtime;
      onStatus(event.data);
    }
  }
  window.addEventListener("message", receive);
  const syncTheme = () => frame.contentWindow?.postMessage({
    protocol: PROTOCOL,
    channel,
    type: "theme",
    colorScheme: colorScheme(),
  }, "*");
  document.addEventListener("themechange", syncTheme);
  frame.addEventListener("load", () => frame.contentWindow.postMessage({ protocol: PROTOCOL, channel, type: "connect" }, "*"), { once: true });
  return {
    frame,
    focus() {
      frame.focus({ preventScroll: true });
      frame.contentWindow?.postMessage({ protocol: PROTOCOL, channel, type: "focus" }, "*");
    },
    inspect: () => ({ runtime: frame.dataset.runtime || "loading" }),
    destroy() {
      window.removeEventListener("message", receive);
      document.removeEventListener("themechange", syncTheme);
      frame.contentWindow?.postMessage({ protocol: PROTOCOL, channel, type: "destroy" }, "*");
      frame.remove();
    },
  };
}

export { PROTOCOL as presentationUseProtocol };

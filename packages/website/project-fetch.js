// Network policy belongs to the project controller, not to the machine or app.
// Local files need no grant. Remote requests require an explicit HTTPS origin;
// neither ambient credentials, referrers, nor redirects cross that boundary.
const encoder = new TextEncoder(), decoder = new TextDecoder();
const methods = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const forbiddenHeaders = /^(?:cookie2?|host|origin|referer|connection|content-length|transfer-encoding|upgrade|proxy-.*|sec-.*)$/i;

export function resourceResult(bytes, mime = "application/octet-stream", body) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return { status: 200, headers: [["content-type", mime]], body: body ?? decoder.decode(bytes),
    resourceUrl: `data:${mime};base64,${btoa(binary)}` };
}

function requestOptions(init, maxBytes) {
  const method = String(init.method || "GET").toUpperCase();
  if (!methods.has(method)) throw new Error("Fetch method is not allowed");
  const headers = new Headers(init.headers || []);
  let headerBytes = 0;
  for (const [name, value] of headers) {
    if (forbiddenHeaders.test(name)) throw new Error(`Fetch header is not allowed: ${name}`);
    headerBytes += encoder.encode(name + value).length;
  }
  if (headerBytes > 16_384) throw new Error("Fetch headers exceed 16384 bytes");
  const body = init.body == null ? undefined : init.body;
  if (body !== undefined && typeof body !== "string") throw new Error("Fetch body must be text");
  if (body !== undefined && encoder.encode(body).length > maxBytes) throw new Error("Fetch body is too large");
  if (body !== undefined && (method === "GET" || method === "HEAD")) throw new Error(`${method} cannot have a body`);
  return { method, headers, body, signal: init.signal, credentials: "omit",
    referrerPolicy: "no-referrer", redirect: "error" };
}

async function readLimited(response, maxBytes) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader(), chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error(`Fetch response exceeds ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export function createConstrainedFetch(allowedOrigins = [], maxBytes = 1_048_576) {
  const origins = new Set(allowedOrigins.map(value => {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
      throw new Error("Fetch permissions must be HTTPS origins");
    return url.origin;
  }));
  return async (value, init = {}) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !origins.has(url.origin))
      throw new Error(`Fetch blocked for ${url.origin}`);
    const response = await fetch(url, requestOptions(init, maxBytes));
    const bytes = await readLimited(response, maxBytes);
    return { ...resourceResult(bytes, response.headers.get("content-type")?.split(";", 1)[0]),
      status: response.status, headers: [...response.headers] };
  };
}

export function createProjectFetch(files = [], allowedOrigins = [], maxBytes = 1_048_576) {
  const projectFiles = new Map(files.map(file => [file.path, file]));
  const remoteFetch = createConstrainedFetch(allowedOrigins, maxBytes);
  return async (value, init = {}) => {
    if (/^https:\/\//.test(value)) return remoteFetch(value, init);
    if (typeof value !== "string" || value.includes("?") || value.includes("#"))
      throw new Error("Project file fetch requires a relative file path");
    if (init.method && init.method.toUpperCase() !== "GET") throw new Error("Project files are read-only");
    const path = value.replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").includes(".."))
      throw new Error("Project file fetch path is invalid");
    const file = projectFiles.get(path);
    if (!file) throw new Error(`Project file not found: ${path}`);
    const data = /^data:([^;,]+);base64,(.*)$/s.exec(file.content);
    const bytes = data ? Uint8Array.from(atob(data[2]), c => c.charCodeAt(0)) : encoder.encode(file.content);
    if (bytes.length > maxBytes) throw new Error(`Project file exceeds ${maxBytes} bytes: ${path}`);
    const mime = { css: "text/css", gif: "image/gif", html: "text/html", jpeg: "image/jpeg", jpg: "image/jpeg",
      js: "text/javascript", json: "application/json", png: "image/png", svg: "image/svg+xml", txt: "text/plain" }
      [path.split(".").at(-1).toLowerCase()] || "application/octet-stream";
    return resourceResult(bytes, data?.[1] || mime, data ? "" : file.content);
  };
}

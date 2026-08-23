const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const requestForbiddenHeaders = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade"]);
const responseForbiddenHeaders = new Set([...requestForbiddenHeaders, "content-length"]);
const methodPattern = /^[A-Z]+$/;
const routeNamePattern = /^[a-z][a-z0-9.-]{0,63}$/;
const maximumRequestBytes = 128 * 1024 * 1024;
const maximumResponseBytes = 128 * 1024 * 1024;
const maximumChunkBytes = 64 * 1024;

function fail(message) {
  throw new Error(`server-use: ${message}`);
}

function boundedInteger(value, fallback, maximum) {
  const number = Number(value ?? fallback);
  if (!Number.isSafeInteger(number) || number < 0 || number > maximum) fail("invalid byte limit");
  return number;
}

function route(specification, defaults) {
  if (!specification || !routeNamePattern.test(specification.name || "") ||
      !methodPattern.test(specification.method || "") ||
      (typeof specification.path !== "string" && !(specification.pathPattern instanceof RegExp))) {
    fail("routes require a name, uppercase method, and an absolute path or pathPattern");
  }
  if (typeof specification.path === "string" && !specification.path.startsWith("/")) {
    fail(`route ${specification.name} path must be absolute`);
  }
  if (typeof specification.path === "string" && (specification.path.includes("?") || specification.path.includes("#"))) {
    fail(`route ${specification.name} path must not include query or fragment`);
  }
  if (specification.pathPattern &&
      (specification.pathPattern.flags || !specification.pathPattern.source.startsWith("^") ||
       !specification.pathPattern.source.endsWith("$"))) {
    fail(`route ${specification.name} pathPattern must be anchored and have no flags`);
  }
  const requestBody = specification.requestBody || "bytes";
  if (requestBody !== "bytes" && requestBody !== "text" && requestBody !== "resource") {
    fail(`route ${specification.name} requestBody must be bytes, text, or resource`);
  }
  return Object.freeze({
    name: specification.name,
    method: specification.method,
    path: specification.path,
    pathPattern: specification.pathPattern
      ? new RegExp(specification.pathPattern.source)
      : null,
    requestHeaders: new Set((specification.requestHeaders || []).map((name) => String(name).toLowerCase())),
    requestBody,
    responseHeaders: new Set((specification.responseHeaders || defaults.responseHeaders)
      .map((name) => String(name).toLowerCase())),
    maxRequestBytes: boundedInteger(specification.maxRequestBytes, defaults.maxRequestBytes,
      maximumRequestBytes),
    maxResponseBytes: boundedInteger(specification.maxResponseBytes, defaults.maxResponseBytes,
      maximumResponseBytes),
  });
}

class RequestBodyResource {
  #carry = new Uint8Array();
  #done = false;
  #maxBytes;
  #reader;
  #total = 0;

  constructor(stream, maxBytes) {
    this.#reader = stream?.getReader() || null;
    this.#maxBytes = maxBytes;
    if (!this.#reader) this.#done = true;
  }

  async read(maxBytes = 64 * 1024) {
    const size = Number(maxBytes);
    if (!Number.isSafeInteger(size) || size < 1 || size > maximumChunkBytes) {
      fail(`request body chunks must be between 1 and ${maximumChunkBytes} bytes`);
    }
    while (!this.#done && this.#carry.length < size) {
      const { value, done } = await this.#reader.read();
      if (done) { this.#done = true; break; }
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      this.#total += chunk.length;
      if (this.#total > this.#maxBytes) {
        await this.cancel("request body is too large");
        fail("request body exceeds its byte limit");
      }
      const combined = new Uint8Array(this.#carry.length + chunk.length);
      combined.set(this.#carry); combined.set(chunk, this.#carry.length);
      this.#carry = combined;
    }
    const length = Math.min(size, this.#carry.length);
    const result = this.#carry.slice(0, length);
    this.#carry = this.#carry.slice(length);
    return result;
  }

  async cancel(reason = "request body was not consumed") {
    if (!this.#done) await this.#reader.cancel(reason);
    this.#done = true;
    this.#carry = new Uint8Array();
  }

  get done() { return this.#done && this.#carry.length === 0; }
}

function bodyBytes(body) {
  if (body === undefined || body === null) return new Uint8Array();
  if (typeof body === "string") return encoder.encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  fail("response body must be a string or bytes");
}

/**
 * Turns host Request objects into bounded plain data and accepts only bounded
 * response descriptors. A machine controller owns the dispatch callback.
 */
export class ServerUse {
  #dispatch;
  #routes;

  constructor({ routes, dispatch, maxRequestBytes = 1024 * 1024,
    maxResponseBytes = 4 * 1024 * 1024,
    responseHeaders = ["cache-control", "content-language", "content-type", "location", "set-cookie"] }) {
    if (typeof dispatch !== "function") fail("dispatch must be a controller function");
    const defaults = { maxRequestBytes, maxResponseBytes, responseHeaders };
    this.#routes = (routes || []).map((value) => route(value, defaults));
    if (!this.#routes.length) fail("at least one route is required");
    this.#dispatch = dispatch;
  }

  #match(request) {
    const pathname = new URL(request.url).pathname;
    for (const candidate of this.#routes) {
      if (candidate.method !== request.method) continue;
      if (candidate.path === pathname) return { route: candidate, params: [] };
      const match = candidate.pathPattern?.exec(pathname);
      if (match) return { route: candidate, params: match.slice(1) };
    }
    return null;
  }

  accepts(request) {
    if (!(request instanceof Request)) fail("accepts requires a Request");
    return Boolean(this.#match(request));
  }

  async handle(request, context = {}) {
    if (!(request instanceof Request)) fail("handle requires a Request");
    const url = new URL(request.url);
    const match = this.#match(request);
    if (!match) return new Response("Not found", { status: 404 });
    const { route: selected, params } = match;
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (!Number.isFinite(declaredLength) || declaredLength < 0 ||
        declaredLength > selected.maxRequestBytes) {
      return new Response("Request too large", { status: 413 });
    }
    let body = new Uint8Array();
    let bodyResource = null;
    if (selected.requestBody === "resource") {
      body = null;
      bodyResource = new RequestBodyResource(
        request.method === "GET" || request.method === "HEAD" ? null : request.body,
        selected.maxRequestBytes);
    } else {
      const bodyBytesValue = request.method === "GET" || request.method === "HEAD"
        ? new Uint8Array()
        : new Uint8Array(await request.arrayBuffer());
      if (bodyBytesValue.length > selected.maxRequestBytes) {
        return new Response("Request too large", { status: 413 });
      }
      body = bodyBytesValue;
      if (selected.requestBody === "text") {
        try { body = decoder.decode(bodyBytesValue); }
        catch { return new Response("Request body is not valid UTF-8", { status: 400 }); }
      }
    }
    const headers = {};
    for (const name of selected.requestHeaders) {
      if (requestForbiddenHeaders.has(name)) fail(`route ${selected.name} cannot expose ${name}`);
      const value = request.headers.get(name);
      if (value !== null) headers[name] = value;
    }
    let descriptor;
    try {
      descriptor = await this.#dispatch(Object.freeze({
        route: selected.name,
        request: Object.freeze({ method: request.method, origin: url.origin, path: url.pathname,
          query: url.search.slice(1), params: Object.freeze(params),
          headers: Object.freeze(headers), body }),
        resources: Object.freeze({ body: bodyResource }),
        context,
      }));
    } finally {
      if (bodyResource && !bodyResource.done) await bodyResource.cancel();
    }
    if (!descriptor || typeof descriptor !== "object") fail("controller returned no response descriptor");
    const status = Number(descriptor.status ?? 200);
    if (!Number.isInteger(status) || status < 100 || status > 599) fail("response status is invalid");
    const output = bodyBytes(descriptor.body);
    if (output.length > selected.maxResponseBytes) fail(`route ${selected.name} response is too large`);
    const bodyForbidden = status < 200 || status === 204 || status === 205 || status === 304;
    if (bodyForbidden && output.length) fail(`route ${selected.name} status ${status} cannot include a body`);
    const responseHeaders = new Headers();
    for (const [rawName, value] of Object.entries(descriptor.headers || {})) {
      const name = rawName.toLowerCase();
      if (!selected.responseHeaders.has(name) || responseForbiddenHeaders.has(name)) {
        fail(`route ${selected.name} cannot return header ${rawName}`);
      }
      responseHeaders.append(name, String(value));
    }
    return new Response(request.method === "HEAD" || bodyForbidden ? null : output,
      { status, headers: responseHeaders });
  }
}

export function createServerUse(options) {
  return new ServerUse(options);
}

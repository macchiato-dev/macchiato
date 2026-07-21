function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function project(value, schema, label = "response") {
  if (schema.type === "array") {
    if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
    return value.map((item, index) => project(item, schema.items, `${label}[${index}]`));
  }
  if (schema.type === "object") {
    plainObject(value, label);
    const result = {};
    for (const [name, property] of Object.entries(schema.properties || {})) {
      if (value[name] === undefined) {
        if ((schema.required || []).includes(name)) throw new TypeError(`${label}.${name} is required`);
        continue;
      }
      result[name] = project(value[name], property, `${label}.${name}`);
    }
    return result;
  }
  if (schema.type === "integer" && !Number.isInteger(value)) throw new TypeError(`${label} must be an integer`);
  if (schema.type === "string" && typeof value !== "string") throw new TypeError(`${label} must be a string`);
  if (schema.type === "boolean" && typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`);
  return value;
}

function input(body, schema = { type: "object", properties: {} }) {
  return project(body ?? {}, schema, "request");
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export class HttpUse {
  constructor(config) {
    this.config = plainObject(config, "http-use config");
    this.operations = new Map();
    for (const [name, operation] of Object.entries(config.operations || {})) {
      const key = `${operation.method || "GET"} ${operation.path}`;
      if (this.operations.has(key)) throw new Error(`Duplicate http-use route: ${key}`);
      this.operations.set(key, { name, ...operation, method: operation.method || "GET" });
    }
  }

  async handle(request, context = {}) {
    const url = new URL(request.url);
    const operation = this.operations.get(`${request.method} ${url.pathname}`);
    if (!operation) return null;
    try {
      const body = request.method === "GET" || request.method === "HEAD" ? {} : await request.json();
      const value = await operation.run(input(body, operation.request), { request, context, url });
      return json(project(value, operation.response));
    } catch (error) {
      return json({ error: error.message }, error.status || 400);
    }
  }

  browserConfig() {
    const operations = {};
    for (const [name, operation] of Object.entries(this.config.operations || {})) {
      operations[name] = { method: operation.method || "GET", path: operation.path };
    }
    return { operations };
  }
}

export class HttpUseClient {
  constructor(config, fetchImpl = (...args) => globalThis.fetch(...args)) {
    this.operations = plainObject(config, "http-use browser config").operations || {};
    this.fetch = fetchImpl;
  }

  async request(name, body = {}) {
    const operation = this.operations[name];
    if (!operation) throw new Error(`HTTP operation not allowed: ${name}`);
    const response = await this.fetch(operation.path, {
      method: operation.method,
      headers: operation.method === "GET" ? undefined : { "content-type": "application/json" },
      body: operation.method === "GET" ? undefined : JSON.stringify(body),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    return value;
  }
}

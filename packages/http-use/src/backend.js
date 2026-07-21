function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function project(value, schema, label) {
  if (schema.type === "array") {
    if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
    return value.map((item, index) => project(item, schema.items, `${label}[${index}]`));
  }
  if (schema.type === "object") {
    object(value, label);
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

function send(res, status, value) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

function browserConfig(config) {
  const operations = {};
  for (const [name, operation] of Object.entries(config.operations || {})) {
    operations[name] = { method: operation.method || "GET", path: operation.path };
  }
  return { operations };
}

/**
 * Make a Node-style request handler whose JSON boundary is controlled by schemas.
 * The intentionally small req/res surface also runs under the QuickJS node:http adapter.
 */
export function createHttpUseHandler(config) {
  const routes = new Map();
  for (const [name, operation] of Object.entries(config.operations || {})) {
    routes.set(`${operation.method || "GET"} ${operation.path}`, { name, ...operation });
  }

  return (req, res) => {
    const pathname = String(req.url || "/").split("?")[0];
    if (req.method === "GET" && pathname === "/api/config") {
      send(res, 200, browserConfig(config));
      return;
    }
    const operation = routes.get(`${req.method || "GET"} ${pathname}`);
    if (!operation) {
      send(res, 404, { error: "Not found" });
      return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(String(chunk)));
    req.on("end", () => {
      try {
        const raw = chunks.join("");
        const body = raw ? JSON.parse(raw) : {};
        const request = project(body, operation.request || { type: "object", properties: {} }, "request");
        const value = operation.run(request);
        send(res, 200, project(value, operation.response, "response"));
      } catch (error) {
        send(res, error.status || 400, { error: error.message });
      }
    });
  };
}

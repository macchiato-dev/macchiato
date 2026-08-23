const operationKinds = new Set(["read", "write"]);
const namePattern = /^[a-z][a-z0-9.-]{0,63}$/;

function fail(message) {
  throw new Error(`sql-use: ${message}`);
}

function parameter(specification) {
  if (typeof specification === "string") {
    if (!namePattern.test(specification)) fail(`invalid parameter name ${specification}`);
    return Object.freeze({ source: "input", name: specification });
  }
  if (!specification || !["input", "context"].includes(specification.source) ||
      !namePattern.test(specification.name || "")) {
    fail("parameters must name an input or host-context value");
  }
  return Object.freeze({ source: specification.source, name: specification.name });
}

function operation(name, specification, defaultRows) {
  if (!namePattern.test(name)) fail(`invalid operation name ${name}`);
  if (!specification || !operationKinds.has(specification.kind) ||
      typeof specification.sql !== "string" || !specification.sql.trim()) {
    fail(`operation ${name} requires a read/write kind and fixed SQL`);
  }
  const maxRows = specification.kind === "read"
    ? Math.max(1, Math.min(Number(specification.maxRows) || defaultRows, defaultRows))
    : 0;
  return Object.freeze({
    kind: specification.kind,
    sql: specification.sql,
    parameters: Object.freeze((specification.parameters || []).map(parameter)),
    maxRows,
  });
}

function plainRecord(value, label) {
  if (value === undefined) return {};
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(`${label} must be a plain object`);
  }
  return value;
}

/**
 * Executes only build-time named SQL operations. The guest selects a name and
 * supplies values; it never supplies SQL, a table name, or an authorization
 * predicate. Host context parameters are suitable for tenant and actor IDs.
 */
export class SqlUse {
  #operations;
  #read;
  #write;

  constructor({ read, write = read, operations, maxRows = 1_000 }) {
    if (typeof read?.execute !== "function" || typeof write?.execute !== "function") {
      fail("read and write clients must provide execute()");
    }
    const rowLimit = Math.max(1, Math.min(Number(maxRows) || 1_000, 10_000));
    this.#read = read;
    this.#write = write;
    this.#operations = new Map(Object.entries(operations || {}).map(([name, value]) =>
      [name, operation(name, value, rowLimit)]));
    if (!this.#operations.size) fail("at least one named operation is required");
  }

  async call(name, input = {}, context = {}) {
    const selected = this.#operations.get(name);
    if (!selected) fail(`operation ${name} is not allowed`);
    input = plainRecord(input, "input");
    context = plainRecord(context, "context");
    const args = selected.parameters.map(({ source, name: parameterName }) => {
      const values = source === "context" ? context : input;
      if (!Object.hasOwn(values, parameterName)) {
        fail(`operation ${name} requires ${source}.${parameterName}`);
      }
      const value = values[parameterName];
      if (typeof value === "number" && !Number.isSafeInteger(value)) {
        fail(`operation ${name} received a non-integer number`);
      }
      if (!["string", "number", "boolean"].includes(typeof value) && value !== null &&
          !(value instanceof Uint8Array)) {
        fail(`operation ${name} received an unsupported value`);
      }
      return value;
    });
    const client = selected.kind === "read" ? this.#read : this.#write;
    const result = await client.execute({ sql: selected.sql, args });
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    if (selected.kind === "read" && rows.length > selected.maxRows) {
      fail(`operation ${name} exceeded its ${selected.maxRows}-row limit`);
    }
    return Object.freeze({
      rows: Object.freeze(rows.map((row) => Object.freeze({ ...row }))),
      rowsAffected: Number(result?.rowsAffected) || 0,
      lastInsertRowid: result?.lastInsertRowid ?? null,
    });
  }

  async callValues(name, values = [], context = {}) {
    const selected = this.#operations.get(name);
    if (!selected) fail(`operation ${name} is not allowed`);
    if (!Array.isArray(values)) fail("positional values must be an array");
    const names = selected.parameters.filter(item => item.source === "input").map(item => item.name);
    if (values.length !== names.length) fail(`operation ${name} requires ${names.length} values`);
    return this.call(name, Object.fromEntries(names.map((key, index) => [key, values[index]])), context);
  }

  async batchValues(calls, context = {}) {
    if (!Array.isArray(calls) || !calls.length || typeof this.#write.batch !== "function") {
      fail("a non-empty batch and a write client with batch() are required");
    }
    context = plainRecord(context, "context");
    const queries = calls.map(({ name, values = [] }) => {
      const selected = this.#operations.get(name);
      if (!selected || selected.kind !== "write") fail(`write operation ${name} is not allowed`);
      if (!Array.isArray(values)) fail(`operation ${name} values must be an array`);
      let inputIndex = 0;
      const args = selected.parameters.map(({ source, name: parameterName }) => {
        const value = source === "context" ? context[parameterName] : values[inputIndex++];
        if (value === undefined) fail(`operation ${name} is missing ${source}.${parameterName}`);
        if (typeof value === "number" && !Number.isSafeInteger(value)) fail(`operation ${name} received a non-integer number`);
        if (!["string", "number", "boolean"].includes(typeof value) && value !== null && !(value instanceof Uint8Array)) {
          fail(`operation ${name} received an unsupported value`);
        }
        return value;
      });
      if (inputIndex !== values.length) fail(`operation ${name} received too many values`);
      return { sql: selected.sql, args };
    });
    return this.#write.batch(queries);
  }
}

export function createSqlUse(options) {
  return new SqlUse(options);
}

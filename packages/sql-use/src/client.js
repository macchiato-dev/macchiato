import { SqlUse } from "./index.js";

function fail(message) {
  throw new Error(`sql-use client: ${message}`);
}

/** Exact-SQL migration adapter for trusted libSQL-style model code. */
export function createSqlUseClient({ read, write = read, operations }) {
  const bySql = new Map();
  const configured = {};
  for (const [name, specification] of Object.entries(operations || {})) {
    if (bySql.has(specification.sql)) fail(`duplicate SQL for ${name}`);
    const count = Number(specification.parameterCount || 0);
    if (!Number.isSafeInteger(count) || count < 0 || count > 256) fail(`invalid parameter count for ${name}`);
    bySql.set(specification.sql, name);
    configured[name] = { ...specification,
      parameters: Array.from({ length: count }, (_, index) => `arg-${index}`) };
  }
  const use = new SqlUse({ read, write, operations: configured });
  function operation(query) {
    const name = bySql.get(query?.sql);
    if (!name) fail("statement is not in the build-time policy");
    return { name, values: Array.isArray(query.args) ? query.args : [] };
  }
  return Object.freeze({
    async execute(query) {
      const selected = operation(query);
      return use.callValues(selected.name, selected.values);
    },
    async batch(queries) {
      if (!Array.isArray(queries)) fail("batch must be an array");
      return use.batchValues(queries.map(operation));
    },
  });
}

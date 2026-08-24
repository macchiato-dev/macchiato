var policyPending = null;

function policyFail(message) { throw new Error("resources policy: " + message); }

function policyValues(values, count) {
  if (!(values instanceof Array) || values.length !== count) {
    policyFail("SQL operation has invalid values");
  }
  for (var index = 0; index < values.length; index++) {
    var value = values[index];
    if (value !== null && typeof value !== "string" && typeof value !== "boolean" &&
        !(typeof value === "number" && isFinite(value) && Math.floor(value) === value) &&
        !(value instanceof Uint8Array)) policyFail("SQL operation value is not supported");
  }
}

function policyOperation(name, values) {
  var selected = SQL_OPERATIONS[name];
  if (!selected) policyFail("SQL operation " + name + " is not allowed");
  policyValues(values, (selected.parameters || []).length);
  return selected;
}

function serverHandle(input) {
  if (!(input instanceof Array) || input.length !== 3 || typeof input[1] !== "string") {
    policyFail("request is invalid");
  }
  if (input[0] === "database-client") {
    if (input[1] === "execute") {
      if (!(input[2] instanceof Array) || input[2].length !== 2 ||
          typeof input[2][0] !== "string") policyFail("store query is invalid");
      var storeOperation = STORE_SQL_OPERATIONS[input[2][0]];
      if (!storeOperation) policyFail("store statement is not allowed");
      policyValues(input[2][1], storeOperation.parameterCount);
      policyPending = { compatibility: true, operation: storeOperation };
      return [2, "database", storeOperation.kind, input[2]];
    }
    if (input[1] === "batch") {
      if (!(input[2] instanceof Array) || !input[2].length) policyFail("store batch is invalid");
      for (var storeIndex = 0; storeIndex < input[2].length; storeIndex++) {
        var query = input[2][storeIndex];
        var batchOperation = query instanceof Array && STORE_SQL_OPERATIONS[query[0]];
        if (!batchOperation || batchOperation.kind !== "write") {
          policyFail("store batch statement is not allowed");
        }
        policyValues(query[1], batchOperation.parameterCount);
      }
      policyPending = { compatibilityBatch: true };
      return [2, "database", "batch", input[2]];
    }
    policyFail("store operation is not available");
  }
  if (input[0] !== "sql") policyFail("request device is not available");
  if (input[1] === "batch") {
    if (!(input[2] instanceof Array) || !input[2].length) policyFail("batch is invalid");
    var queries = [];
    for (var index = 0; index < input[2].length; index++) {
      var call = input[2][index];
      if (!(call instanceof Array) || call.length !== 2) policyFail("batch call is invalid");
      var selected = policyOperation(call[0], call[1]);
      if (selected.kind !== "write") policyFail("batch may contain only writes");
      queries.push([selected.sql, call[1]]);
    }
    policyPending = { result: "batch" };
    return [2, "database", "batch", queries];
  }
  var operation = policyOperation(input[1], input[2]);
  policyPending = operation;
  return [2, "database", operation.kind, [operation.sql, input[2]]];
}

function converted(value, kind) {
  if (kind === "number") return Number(value);
  if (kind === "nullable-number") return value === null ? null : Number(value);
  if (kind === "boolean") return Boolean(value);
  if (kind === "string-empty") return String(value || "");
  return String(value);
}

function policyResult(value) { return ["ok", value]; }

function serverResume(ok, result) {
  if (!ok) { policyPending = null; throw new Error(String(result)); }
  var selected = policyPending;
  policyPending = null;
  if (selected.compatibilityBatch) return policyResult(result);
  if (selected.compatibility) {
    if (!(result[1] instanceof Array) || selected.operation.kind === "read" &&
        result[1].length > selected.operation.maxRows) policyFail("store result exceeds its row limit");
    return policyResult(result);
  }
  if (selected.result === "batch") {
    return policyResult(result.map(function (item) { return Number(item) || 0; }));
  }
  var names = result[0];
  var rows = result[1];
  if (!(rows instanceof Array) || rows.length > (selected.maxRows || 0) && selected.kind === "read") {
    policyFail("database result exceeds its row limit");
  }
  if (selected.result === "affected") return policyResult([Number(result[2]) || 0]);
  if (selected.result === "exists") return policyResult(rows.length ? [1] : []);
  var columns = selected.result instanceof Array && typeof selected.result[0] === "string"
    ? [selected.result] : selected.result;
  return policyResult(rows.map(function (row) {
    return columns.map(function (column) {
      var index = names.indexOf(column[0]);
      if (index < 0) policyFail("database result lacks " + column[0]);
      return converted(row[index], column[1]);
    });
  }));
}

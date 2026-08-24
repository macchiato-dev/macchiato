var policyPending = null;

function policyFail(message) { throw new Error("resources policy: " + message); }

function policyOperation(name, values) {
  var selected = SQL_OPERATIONS[name];
  if (!selected) policyFail("SQL operation " + name + " is not allowed");
  if (!(values instanceof Array) || values.length !== (selected.parameters || []).length) {
    policyFail("SQL operation " + name + " has invalid values");
  }
  for (var index = 0; index < values.length; index++) {
    var value = values[index];
    if (value !== null && typeof value !== "string" && typeof value !== "boolean" &&
        !(typeof value === "number" && isFinite(value) && Math.floor(value) === value) &&
        !(value instanceof Uint8Array)) policyFail("SQL operation value is not supported");
  }
  return selected;
}

function serverHandle(input) {
  if (!(input instanceof Array) || input.length !== 3 || input[0] !== "sql" ||
      typeof input[1] !== "string") policyFail("request is invalid");
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

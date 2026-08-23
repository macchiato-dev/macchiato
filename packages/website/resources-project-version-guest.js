var spliceState = null;

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function configDiff(before, after, path, operations) {
  if (same(before, after)) return;
  var beforeObject = before && typeof before === "object" && !(before instanceof Array);
  var afterObject = after && typeof after === "object" && !(after instanceof Array);
  if (!beforeObject || !afterObject) {
    operations.push({ op: "set", path: path, before: before, value: after });
    return;
  }
  var keys = Object.keys(before).concat(Object.keys(after)).sort();
  var previous = null;
  for (var index = 0; index < keys.length; index++) {
    var key = keys[index];
    if (key === previous) continue;
    previous = key;
    var nextPath = path.concat([key]);
    if (!own(after, key)) operations.push({ op: "delete", path: nextPath,
      before: before[key] });
    else if (!own(before, key)) operations.push({ op: "set", path: nextPath,
      absent: true, value: after[key] });
    else configDiff(before[key], after[key], nextPath, operations);
  }
}

function serverHandle(input) {
  if (!(input instanceof Array)) throw new Error("Project history input is invalid");
  if (input[0] === "splice") {
    if (input.length !== 3 || typeof input[1] !== "number" ||
        typeof input[2] !== "number" || input[1] < 0 || input[2] < 0 ||
        input[1] % 1 !== 0 || input[2] % 1 !== 0) {
      throw new Error("Project splice input is invalid");
    }
    spliceState = { phase: "prefix", start: 0, beforeEnd: input[1],
      afterEnd: input[2] };
    return nextSpliceChunk();
  }
  if (input[0] === "config") {
    if (input.length !== 3 || typeof input[1] !== "string" ||
        typeof input[2] !== "string") throw new Error("Project config input is invalid");
    var beforeConfig = JSON.parse(input[1]);
    var afterConfig = JSON.parse(input[2]);
    var operations = [];
    configDiff(beforeConfig, afterConfig, [], operations);
    return JSON.stringify(operations);
  }
  if (input[0] === "validate") {
    if (input.length !== 5 || !(input[1] instanceof Array) ||
        typeof input[2] !== "string" || typeof input[3] !== "number" ||
        typeof input[4] !== "number") throw new Error("Project snapshot metadata is invalid");
    if (input[1].length > 64) throw new Error("Project snapshot exceeds 64 files");
    var paths = [];
    for (var fileIndex = 0; fileIndex < input[1].length; fileIndex++) {
      var file = input[1][fileIndex];
      if (!(file instanceof Array) || file.length !== 2 || typeof file[0] !== "string" ||
          typeof file[1] !== "number") throw new Error("Project file metadata is invalid");
      var path = file[0];
      var parts = path.split("/");
      if (!path || path.length > 240 || path.charAt(0) === "/" ||
          path.indexOf("//") !== -1 || path.indexOf("\\") !== -1 ||
          !/^[A-Za-z0-9._~/-]+$/.test(path)) throw new Error("Invalid project file path: " + path);
      for (var partIndex = 0; partIndex < parts.length; partIndex++) {
        if (parts[partIndex].charAt(0) === ".") {
          throw new Error("Invalid project file path: " + path);
        }
      }
      if (paths.indexOf(path) !== -1) throw new Error("Duplicate project file path: " + path);
      if (file[1] < 0 || file[1] > 70 * 1024 * 1024) {
        throw new Error("Project file exceeds the 50 MB portable-artifact budget: " + path);
      }
      paths.push(path);
    }
    var config = JSON.parse(input[2]);
    if (!config || typeof config !== "object" || config instanceof Array) {
      throw new Error("Project configuration must be an object");
    }
    if (input[3] < 0 || input[3] > 64000) throw new Error("Project configuration is too large");
    if (input[4] < 0 || input[4] > 70 * 1024 * 1024) {
      throw new Error("Project snapshot is too large");
    }
    return true;
  }
  if (input[0] !== "version" || input.length !== 7 ||
      typeof input[1] !== "boolean" || typeof input[2] !== "boolean" ||
      typeof input[3] !== "boolean" || typeof input[5] !== "boolean" ||
      typeof input[6] !== "number" || input[6] < 0 || input[6] % 1 !== 0 ||
      (input[4] !== "periodic" && input[4] !== "manual" && input[4] !== "restore")) {
    throw new Error("Project version planning input is invalid");
  }
  var changeEmpty = input[1];
  var pendingEmpty = input[2];
  var destructive = input[3];
  var reason = input[4];
  var checkpointDue = input[5];
  var sequence = input[6];
  if (changeEmpty) {
    if (reason !== "manual" || pendingEmpty) {
      return ["unchanged", sequence, "", "", "", "unchanged"];
    }
    return ["checkpoint", sequence + 1, "manual", "", "", "current"];
  }
  var checkpointReason = "";
  var nextReason = "";
  var nextBase = "";
  var checkpointTarget = "unchanged";
  if (destructive || reason === "restore") {
    if (!pendingEmpty) {
      checkpointReason = "before_destructive";
      sequence++;
      nextBase = "current";
    } else nextBase = "checkpoint";
    nextReason = reason === "restore" ? "restore" : "destructive";
    checkpointTarget = "next";
    sequence++;
  } else if (checkpointDue || reason === "manual") {
    nextReason = reason === "manual" ? "manual" : "periodic";
    nextBase = "checkpoint";
    checkpointTarget = "next";
    sequence++;
  }
  return ["update", sequence, checkpointReason, nextReason, nextBase,
    checkpointTarget];
}

function nextSpliceChunk() {
  var count;
  if (spliceState.phase === "prefix") {
    count = Math.min(32768, spliceState.beforeEnd - spliceState.start,
      spliceState.afterEnd - spliceState.start);
    if (count === 0) return [spliceState.start, spliceState.beforeEnd,
      spliceState.afterEnd];
    spliceState.chunkCount = count;
    return [2, "text", "units", [spliceState.start, spliceState.start, count]];
  }
  count = Math.min(32768, spliceState.beforeEnd - spliceState.start,
    spliceState.afterEnd - spliceState.start);
  if (count === 0) return [spliceState.start, spliceState.beforeEnd,
    spliceState.afterEnd];
  spliceState.chunkCount = count;
  return [2, "text", "units", [spliceState.beforeEnd - count,
    spliceState.afterEnd - count, count]];
}

function serverResume(ok, result) {
  if (!ok || !spliceState || !(result instanceof Array) || result.length !== 2 ||
      typeof result[0] !== "string" || typeof result[1] !== "string" ||
      result[0].length !== spliceState.chunkCount ||
      result[1].length !== spliceState.chunkCount) {
    throw new Error("Project splice chunk is invalid");
  }
  var count = spliceState.chunkCount;
  if (spliceState.phase === "prefix") {
    for (var index = 0; index < count; index++) {
      if (result[0].charCodeAt(index) !== result[1].charCodeAt(index)) {
        spliceState.start += index;
        spliceState.phase = "suffix";
        return nextSpliceChunk();
      }
    }
    spliceState.start += count;
    return nextSpliceChunk();
  }
  for (var suffixIndex = count - 1; suffixIndex >= 0; suffixIndex--) {
    if (result[0].charCodeAt(suffixIndex) !== result[1].charCodeAt(suffixIndex)) {
      spliceState.beforeEnd = spliceState.beforeEnd - count + suffixIndex + 1;
      spliceState.afterEnd = spliceState.afterEnd - count + suffixIndex + 1;
      return [spliceState.start, spliceState.beforeEnd, spliceState.afterEnd];
    }
  }
  spliceState.beforeEnd -= count;
  spliceState.afterEnd -= count;
  return nextSpliceChunk();
}

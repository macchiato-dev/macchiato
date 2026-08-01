const PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/?)(?!.*\\)[A-Za-z0-9._~/-]{1,240}$/;
const MAX_FILES = 64;
const MAX_FILE_BYTES = 1_000_000;
const MAX_CONFIG_BYTES = 64_000;

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function jsonValue(value, label) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item) => jsonValue(item, label));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, jsonValue(value[key], label)]));
  }
  throw new Error(`${label} must contain only JSON values`);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fileMap(snapshot) {
  return new Map(snapshot.files.map((file) => [file.path, file.content]));
}

export function normalizeProjectSnapshot(value = {}) {
  const sourceFiles = Array.isArray(value.files) ? value.files : [];
  if (sourceFiles.length > MAX_FILES) throw new Error(`Project snapshot exceeds ${MAX_FILES} files`);
  const seen = new Set();
  const files = sourceFiles.map((file) => {
    const path = String(file?.path || "");
    const content = String(file?.content ?? "");
    if (!PATH.test(path) || path.includes("//")) throw new Error(`Invalid project file path: ${path}`);
    if (seen.has(path)) throw new Error(`Duplicate project file path: ${path}`);
    if (new TextEncoder().encode(content).byteLength > MAX_FILE_BYTES) throw new Error(`Project file is too large: ${path}`);
    seen.add(path);
    return Object.freeze({ path, content });
  }).sort((left, right) => left.path.localeCompare(right.path));
  const config = jsonValue(value.config ?? {}, "Project configuration");
  if (!config || Array.isArray(config) || typeof config !== "object") throw new Error("Project configuration must be an object");
  if (new TextEncoder().encode(JSON.stringify(config)).byteLength > MAX_CONFIG_BYTES) throw new Error("Project configuration is too large");
  return Object.freeze({ files: Object.freeze(files), config: Object.freeze(config) });
}

function textSplice(before, after) {
  let start = 0;
  const common = Math.min(before.length, after.length);
  while (start < common && before.charCodeAt(start) === after.charCodeAt(start)) start++;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > start && afterEnd > start && before.charCodeAt(beforeEnd - 1) === after.charCodeAt(afterEnd - 1)) {
    beforeEnd--;
    afterEnd--;
  }
  return Object.freeze({ start, remove: before.slice(start, beforeEnd), insert: after.slice(start, afterEnd) });
}

function configDiff(before, after, path, operations) {
  if (same(before, after)) return;
  const beforeObject = before && typeof before === "object" && !Array.isArray(before);
  const afterObject = after && typeof after === "object" && !Array.isArray(after);
  if (!beforeObject || !afterObject) {
    operations.push(Object.freeze({ op: "set", path: Object.freeze(path), before, value: after }));
    return;
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  for (const key of keys) {
    if (!own(after, key)) operations.push(Object.freeze({ op: "delete", path: Object.freeze([...path, key]), before: before[key] }));
    else if (!own(before, key)) operations.push(Object.freeze({ op: "set", path: Object.freeze([...path, key]), absent: true, value: after[key] }));
    else configDiff(before[key], after[key], [...path, key], operations);
  }
}

export function diffProjectSnapshots(beforeValue, afterValue) {
  const before = normalizeProjectSnapshot(beforeValue);
  const after = normalizeProjectSnapshot(afterValue);
  const beforeFiles = fileMap(before);
  const afterFiles = fileMap(after);
  const files = [];
  for (const path of [...new Set([...beforeFiles.keys(), ...afterFiles.keys()])].sort()) {
    if (!afterFiles.has(path)) files.push(Object.freeze({ op: "delete", path, before: beforeFiles.get(path) }));
    else if (!beforeFiles.has(path)) files.push(Object.freeze({ op: "add", path, content: afterFiles.get(path) }));
    else if (beforeFiles.get(path) !== afterFiles.get(path)) files.push(Object.freeze({ op: "splice", path, ...textSplice(beforeFiles.get(path), afterFiles.get(path)) }));
  }
  const config = [];
  configDiff(before.config, after.config, [], config);
  return Object.freeze({ version: 1, files: Object.freeze(files), config: Object.freeze(config) });
}

function configParent(root, path) {
  let current = root;
  for (const key of path.slice(0, -1)) {
    if (!current || typeof current !== "object" || Array.isArray(current) || !own(current, key)) throw new Error(`Configuration patch path does not exist: ${path.join(".")}`);
    current = current[key];
  }
  return { parent: current, key: path.at(-1) };
}

export function applyProjectPatch(snapshotValue, patch) {
  if (!patch || patch.version !== 1 || !Array.isArray(patch.files) || !Array.isArray(patch.config)) throw new Error("Invalid project patch");
  const snapshot = normalizeProjectSnapshot(snapshotValue);
  const files = fileMap(snapshot);
  for (const operation of patch.files) {
    const path = String(operation.path || "");
    if (!PATH.test(path)) throw new Error(`Invalid project patch path: ${path}`);
    if (operation.op === "add") {
      if (files.has(path)) throw new Error(`Project patch expected missing file: ${path}`);
      files.set(path, String(operation.content ?? ""));
    } else if (operation.op === "delete") {
      if (!files.has(path) || files.get(path) !== operation.before) throw new Error(`Project patch delete mismatch: ${path}`);
      files.delete(path);
    } else if (operation.op === "splice") {
      const content = files.get(path);
      const start = Number(operation.start);
      if (typeof content !== "string" || !Number.isSafeInteger(start) || start < 0 || content.slice(start, start + operation.remove.length) !== operation.remove) {
        throw new Error(`Project patch splice mismatch: ${path}`);
      }
      files.set(path, content.slice(0, start) + operation.insert + content.slice(start + operation.remove.length));
    } else throw new Error(`Unsupported project file operation: ${operation.op}`);
  }
  const config = structuredClone(snapshot.config);
  for (const operation of patch.config) {
    if (!Array.isArray(operation.path) || operation.path.length === 0 || operation.path.some((key) => typeof key !== "string" || !key)) throw new Error("Invalid configuration patch path");
    const { parent, key } = configParent(config, operation.path);
    if (!parent || typeof parent !== "object" || Array.isArray(parent)) throw new Error(`Invalid configuration patch parent: ${operation.path.join(".")}`);
    if (operation.op === "delete") {
      if (!own(parent, key) || !same(parent[key], operation.before)) throw new Error(`Configuration patch delete mismatch: ${operation.path.join(".")}`);
      delete parent[key];
    } else if (operation.op === "set") {
      if (operation.absent ? own(parent, key) : !own(parent, key) || !same(parent[key], operation.before)) throw new Error(`Configuration patch set mismatch: ${operation.path.join(".")}`);
      parent[key] = structuredClone(operation.value);
    } else throw new Error(`Unsupported configuration operation: ${operation.op}`);
  }
  return normalizeProjectSnapshot({ files: [...files].map(([path, content]) => ({ path, content })), config });
}

export function projectPatchIsEmpty(patch) {
  return patch?.version === 1 && patch.files?.length === 0 && patch.config?.length === 0;
}

export function emptyProjectSnapshot() {
  return normalizeProjectSnapshot({ files: [], config: {} });
}

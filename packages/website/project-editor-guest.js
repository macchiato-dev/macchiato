import "../code-editor-use/src/guest.js";
import {
  diffProjectSnapshots,
  normalizeProjectSnapshot,
  projectPatchIsEmpty,
} from "../hub/src/project-history.js";

// QuickJS does not provide browser encoders or structuredClone. The history
// model only needs byte length and JSON values, so keep these guest polyfills
// deliberately narrower than the browser APIs with the same names.
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = class TextEncoder {
    encode(value) {
      let byteLength = 0;
      for (const character of String(value)) {
        const point = character.codePointAt(0);
        byteLength += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
      }
      return { byteLength };
    }
  };
}
if (!globalThis.structuredClone) globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));

let history = null;

function normalizeHistory(value) {
  if (!value || typeof value !== "object") throw new TypeError("Project editor history is required");
  const snapshot = normalizeProjectSnapshot(value.snapshot);
  const snapshots = Array.isArray(value.snapshots) && value.snapshots.length
    ? value.snapshots.map(normalizeProjectSnapshot)
    : [snapshot];
  const patches = Array.isArray(value.patches) ? value.patches : [];
  const versionTimes = Array.isArray(value.versionTimes) ? value.versionTimes.map(Number) : [];
  if (patches.length !== snapshots.length || patches.length !== versionTimes.length) {
    throw new Error("Project editor history arrays must have equal lengths");
  }
  return {
    snapshot,
    checkpoint: normalizeProjectSnapshot(value.checkpoint || snapshots.at(-1)),
    snapshots,
    patches,
    versionTimes,
    createdAt: Number(value.createdAt || versionTimes[0] || Date.now()),
    lastVersionAt: Number(value.lastVersionAt || versionTimes.at(-1) || Date.now()),
  };
}

function result() {
  return JSON.stringify(history);
}

globalThis.__resourcesProjectHistoryInitialize = (json) => {
  history = normalizeHistory(JSON.parse(json));
  return result();
};

globalThis.__resourcesProjectHistorySetCurrent = (json) => {
  if (!history) throw new Error("Project editor history is not initialized");
  history.snapshot = normalizeProjectSnapshot(JSON.parse(json).snapshot);
  return result();
};

globalThis.__resourcesProjectHistoryCheckpoint = (json) => {
  if (!history) throw new Error("Project editor history is not initialized");
  const request = JSON.parse(json);
  const snapshot = normalizeProjectSnapshot(request.snapshot);
  const now = Number(request.now || Date.now());
  const interval = Number(request.checkpointIntervalMs);
  history.snapshot = snapshot;
  if (request.destructive !== true && now - history.lastVersionAt < interval) return result();
  const patch = diffProjectSnapshots(history.snapshots.at(-1), snapshot);
  if (projectPatchIsEmpty(patch)) return result();
  history.patches.push(patch);
  history.snapshots.push(snapshot);
  history.versionTimes.push(now);
  history.checkpoint = snapshot;
  history.lastVersionAt = now;
  return result();
};

globalThis.__resourcesProjectHistoryInspect = () => result();

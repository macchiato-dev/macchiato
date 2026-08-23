import { ServerMachineController } from "../server-use/src/machine-controller.js";
import { MachineWtf8String } from "../server-use/src/wire.js";
import { diffProjectSnapshotsWithSplice } from "@macchiato-dev/hub/project-history";

const states = new Set(["unchanged", "checkpoint", "update"]);
const versionReasons = new Set(["", "manual", "periodic", "before_destructive",
  "destructive", "restore"]);
const bases = new Set(["", "checkpoint", "current"]);
const targets = new Set(["unchanged", "current", "next"]);
const textEncoder = new TextEncoder();

function machineFailure(result) {
  if (Array.isArray(result) && result.length === 3 && Number(result[0]) >= 400 &&
      typeof result[2] === "string") return result[2];
  return null;
}

function wtf8(value, offset, count) {
  const bytes = [];
  const end = offset + count;
  for (let index = offset; index < end; index++) {
    let code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < end) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + low - 0xdc00;
        index++;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12),
      0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63),
      0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return new MachineWtf8String(Uint8Array.from(bytes));
}

export function createProjectVersionPlanner(module) {
  if (!(module instanceof WebAssembly.Module)) {
    throw new Error("Project version planner requires a WebAssembly module");
  }
  return async function planProjectVersionUpdate(input) {
    // Each plan gets a fresh MicroQuickJS context. The module is compiled once,
    // while the small disposable instance cannot retain authority or state from
    // a previous project write.
    const controller = new ServerMachineController(module);
    const result = await controller.request([
      "version", input.changeEmpty, input.pendingCheckpointEmpty, input.destructive,
      input.reason, input.checkpointDue, input.lastVersionSequence,
    ]);
    const failure = machineFailure(result);
    if (failure) throw new Error(`Project version machine: ${failure}`);
    if (!Array.isArray(result) || result.length !== 6 || !states.has(result[0]) ||
        !Number.isSafeInteger(result[1]) || result[1] < 0 ||
        !versionReasons.has(result[2]) || !versionReasons.has(result[3]) ||
        !bases.has(result[4]) || !targets.has(result[5])) {
      throw new Error("Project version machine returned an invalid plan");
    }
    return Object.freeze({
      state: result[0], sequence: result[1],
      checkpointVersionReason: result[2] || null,
      nextVersionReason: result[3] || null,
      nextVersionBase: result[4] || null,
      checkpointTarget: result[5],
    });
  };
}

export function createProjectSnapshotDiffer(module) {
  if (!(module instanceof WebAssembly.Module)) {
    throw new Error("Project snapshot differ requires a WebAssembly module");
  }
  return (before, after) => diffProjectSnapshotsWithSplice(before, after,
    async (beforeText, afterText) => {
      const controller = new ServerMachineController(module, { devices: {
        text(operation, input) {
          if (operation !== "units" || !Array.isArray(input) || input.length !== 3 ||
              input.some((value) => !Number.isSafeInteger(value) || value < 0)) {
            throw new Error("Project text operation is invalid");
          }
          const [beforeOffset, afterOffset, count] = input;
          if (count < 1 || count > 32768 || beforeOffset + count > beforeText.length ||
              afterOffset + count > afterText.length) {
            throw new Error("Project text range is invalid");
          }
          return [wtf8(beforeText, beforeOffset, count),
            wtf8(afterText, afterOffset, count)];
        },
      } });
      const result = await controller.request(["splice", beforeText.length,
        afterText.length]);
      const failure = machineFailure(result);
      if (failure) throw new Error(`Project splice machine: ${failure}`);
      if (!Array.isArray(result) || result.length !== 3 ||
          result.some((value) => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error("Project splice machine returned an invalid range");
      }
      return { start: result[0], beforeEnd: result[1], afterEnd: result[2] };
    }, async (beforeConfig, afterConfig) => {
      const controller = new ServerMachineController(module);
      const result = await controller.request(["config", JSON.stringify(beforeConfig),
        JSON.stringify(afterConfig)]);
      const failure = machineFailure(result);
      if (failure) throw new Error(`Project config machine: ${failure}`);
      if (typeof result !== "string") {
        throw new Error("Project config machine returned an invalid result");
      }
      let operations;
      try { operations = JSON.parse(result); }
      catch { throw new Error("Project config machine returned invalid JSON"); }
      if (!Array.isArray(operations)) {
        throw new Error("Project config machine returned invalid operations");
      }
      return operations;
    });
}

export function createProjectSnapshotValidator(module) {
  if (!(module instanceof WebAssembly.Module)) {
    throw new Error("Project snapshot validator requires a WebAssembly module");
  }
  return async function validateProjectSnapshot(snapshot) {
    const configJson = JSON.stringify(snapshot.config);
    const snapshotJson = JSON.stringify(snapshot);
    const files = snapshot.files.map((file) => [file.path,
      textEncoder.encode(file.content).length]);
    const controller = new ServerMachineController(module);
    const result = await controller.request(["validate", files, configJson,
      textEncoder.encode(configJson).length, textEncoder.encode(snapshotJson).length]);
    const failure = machineFailure(result);
    if (failure) throw new Error(`Project snapshot machine: ${failure}`);
    if (result !== true) throw new Error("Project snapshot machine rejected valid metadata");
  };
}

import { ServerMachineController } from "../server-use/src/machine-controller.js";

function applicationError(result, fallback) {
  const detail = Array.isArray(result) && result[1] &&
    typeof result[1] === "object" ? result[1] : {};
  const error = new Error(detail.message || fallback);
  error.name = detail.name || "Error";
  error.code = detail.code || "";
  error.field = detail.field || "";
  error.providers = Array.isArray(detail.providers) ? detail.providers : [];
  return error;
}

export class ResourcesApplicationMachine {
  #controller;

  constructor(module, { bytecode, sqlDevice, clock = Date.now,
    randomId = () => crypto.randomUUID() } = {}) {
    if (!(bytecode instanceof Uint8Array) || typeof sqlDevice !== "function") {
      throw new TypeError("Application machine requires bytecode and a SQL device");
    }
    this.#controller = new ServerMachineController(module, {
      bytecodes: [bytecode], maxMessageBytes: 128 * 1024 * 1024,
      devices: {
        sql: sqlDevice,
        clock(operation) {
          if (operation !== "now") throw new Error("Clock operation is not available");
          return clock();
        },
        random(operation) {
          if (operation !== "uuid") throw new Error("Random operation is not available");
          return randomId();
        },
      },
    });
  }

  async initialize() {
    const result = await this.#controller.request(["initialize"]);
    if (!Array.isArray(result) || result[0] !== "ok") {
      throw applicationError(result, "Application machine initialization failed");
    }
  }

  async store(store, method, args) {
    const result = await this.#controller.request(["store", store, method, args]);
    if (Array.isArray(result) && result[0] === "ok") return result[1];
    throw applicationError(result, "Application store operation failed");
  }

  async documentPlan(input) {
    const result = await this.#controller.request(["document-plan", input]);
    if (Array.isArray(result) && result[0] === "ok") return result[1];
    throw applicationError(result, "Application document plan failed");
  }
}

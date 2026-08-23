import { decodeMachineValue, encodeMachineValue } from "./wire.js";

const SEND_MAGIC = Uint8Array.of(87, 87, 77, 83); // WWMS

function fail(message) {
  throw new Error(`server-use controller: ${message}`);
}

function sameMagic(memory, offset) {
  return SEND_MAGIC.every((byte, index) => memory[offset + index] === byte);
}

export function createServerMachineBridge({ devices = {}, maxMessageBytes = 16 * 1024 * 1024 } = {}) {
  const grantedDevices = Object.assign(Object.create(null), devices);
  for (const [name, device] of Object.entries(grantedDevices)) {
    if (typeof device !== "function") fail(`device ${name} is invalid`);
  }
  let instance;
  let delivery;
  let nextRequest = 1;
  let activeRequest = 0;
  let pumping = false;
  const requests = new Map();
  const deviceResults = [];
  const deviceCalls = new Map();

  function memory() {
    const value = instance?.exports?.memory;
    if (!(value instanceof WebAssembly.Memory)) fail("guest does not export memory");
    return new Uint8Array(value.buffer);
  }

  function send(value) {
    if (delivery) fail("guest delivery is already pending");
    delivery = encodeMachineValue(value, { maxBytes: maxMessageBytes });
    instance.exports.onmsg(delivery.length);
    if (delivery) fail("guest did not receive its message");
  }

  function completeDeviceCall(id, requestId, ok, value) {
    if (deviceCalls.get(id) !== requestId || !requests.has(requestId)) return;
    deviceCalls.delete(id);
    deviceResults.push([3, id, ok, value]);
    queueMicrotask(pump);
  }

  function outbound(value) {
    if (!Array.isArray(value) || !Number.isSafeInteger(value[0])) fail("guest message envelope is invalid");
    if (value[0] === 1) {
      const pending = requests.get(value[1]);
      if (!pending) fail(`response ${value[1]} has no request`);
      requests.delete(value[1]);
      if (activeRequest === value[1]) activeRequest = 0;
      pending.resolve(value[2]);
      return;
    }
    if (value[0] === 2) {
      const [, id, deviceName, operation, input] = value;
      if (!Number.isSafeInteger(id) || typeof deviceName !== "string" || typeof operation !== "string") {
        fail("device call is invalid");
      }
      if (deviceCalls.has(id)) fail(`device call ${id} is already pending`);
      const request = requests.get(activeRequest);
      if (!request) fail("device call has no active request");
      const requestId = activeRequest;
      deviceCalls.set(id, requestId);
      const device = Object.hasOwn(request.devices, deviceName)
        ? request.devices[deviceName]
        : grantedDevices[deviceName];
      if (typeof device !== "function") {
        completeDeviceCall(id, requestId, false, `device ${deviceName} is not available`);
        return;
      }
      Promise.resolve().then(() => device(operation, input)).then(
        result => completeDeviceCall(id, requestId, true, result),
        error => completeDeviceCall(id, requestId, false, error?.message || String(error)),
      );
      return;
    }
    fail(`guest message type ${value[0]} is not supported`);
  }

  function msg(offset, capacity) {
    const bytes = memory();
    if (!Number.isInteger(offset) || !Number.isInteger(capacity) || offset < 0 || capacity < 0 ||
        offset > bytes.length || capacity > bytes.length - offset) {
      fail("guest buffer is outside memory");
    }
    if (capacity >= SEND_MAGIC.length && sameMagic(bytes, offset)) {
      const encoded = bytes.slice(offset + SEND_MAGIC.length, offset + capacity);
      let value;
      try { value = decodeMachineValue(encoded, { maxBytes: maxMessageBytes }); }
      catch (error) {
        const prefix = [...encoded.slice(0, 32)].map(byte => byte.toString(16).padStart(2, "0")).join(" ");
        fail(`guest sent malformed wire data (${prefix}${encoded.length > 32 ? " …" : ""}): ${error.message}`);
      }
      outbound(value);
      return capacity - SEND_MAGIC.length;
    }
    if (!delivery) return 0;
    if (delivery.length > capacity) return delivery.length;
    bytes.set(delivery, offset);
    const length = delivery.length;
    delivery = undefined;
    return length;
  }

  function pump() {
    if (pumping || !instance) return;
    pumping = true;
    try {
      while (deviceResults.length) send(deviceResults.shift());
    } finally {
      pumping = false;
    }
  }

  return Object.freeze({
    imports: Object.freeze({ host: Object.freeze({ msg }) }),
    connect(nextInstance) {
      if (instance) fail("a guest is already connected");
      if (typeof nextInstance?.exports?.onmsg !== "function" ||
          !(nextInstance?.exports?.memory instanceof WebAssembly.Memory)) {
        fail("guest exports do not match the msg/onmsg ABI");
      }
      instance = nextInstance;
      instance.exports.onmsg(0);
    },
    request(value, { devices: requestedDevices = {} } = {}) {
      if (!instance) fail("guest is not connected");
      if (activeRequest) fail("a guest request is already active");
      const requestDevices = Object.assign(Object.create(null), requestedDevices);
      for (const [name, device] of Object.entries(requestDevices)) {
        if (typeof device !== "function") fail(`request device ${name} is invalid`);
      }
      const id = nextRequest++;
      return new Promise((resolve, reject) => {
        requests.set(id, { resolve, reject, devices: requestDevices });
        activeRequest = id;
        try { send([0, id, value]); }
        catch (error) { requests.delete(id); activeRequest = 0; reject(error); }
      });
    },
  });
}

export class ServerMachineController {
  #bridge;
  #tail = Promise.resolve();

  constructor(module, options = {}) {
    if (!(module instanceof WebAssembly.Module)) fail("module must be a WebAssembly.Module");
    this.#bridge = createServerMachineBridge(options);
    const instance = new WebAssembly.Instance(module, this.#bridge.imports);
    this.#bridge.connect(instance);
  }

  request(value, options) {
    const result = this.#tail.then(() => this.#bridge.request(value, options));
    this.#tail = result.catch(() => {});
    return result;
  }
}

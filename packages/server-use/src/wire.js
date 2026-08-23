const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const MAX_DEPTH = 32;
const MAX_ITEMS = 65_536;

function fail(message) {
  throw new Error(`server-use wire: ${message}`);
}

export class MachineWtf8String {
  constructor(bytes) {
    if (!(bytes instanceof Uint8Array)) fail("WTF-8 string requires bytes");
    this.bytes = bytes.slice();
    Object.freeze(this);
  }
}

class Writer {
  bytes = [];
  items = 0;

  byte(value) { this.bytes.push(value); }
  uint(value) {
    if (!Number.isSafeInteger(value) || value < 0) fail("unsigned integer is invalid");
    do {
      const next = value % 128;
      value = Math.floor(value / 128);
      this.byte(next | (value ? 128 : 0));
    } while (value);
  }
  text(value) {
    const bytes = encoder.encode(value);
    this.uint(bytes.length);
    for (const byte of bytes) this.byte(byte);
  }
  value(value, depth = 0) {
    if (++this.items > MAX_ITEMS || depth > MAX_DEPTH) fail("value is too complex");
    if (value === null) return this.byte(0);
    if (value === false) return this.byte(1);
    if (value === true) return this.byte(2);
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) fail("only safe integers are supported");
      this.byte(value >= 0 ? 3 : 4);
      return this.uint(value >= 0 ? value : -value - 1);
    }
    if (typeof value === "string") { this.byte(5); return this.text(value); }
    if (value instanceof Uint8Array) {
      this.byte(6); this.uint(value.length);
      for (const byte of value) this.byte(byte);
      return;
    }
    if (value instanceof MachineWtf8String) {
      this.byte(9); this.uint(value.bytes.length);
      for (const byte of value.bytes) this.byte(byte);
      return;
    }
    if (Array.isArray(value)) {
      this.byte(7); this.uint(value.length);
      for (const item of value) this.value(item, depth + 1);
      return;
    }
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
      const entries = Object.entries(value);
      this.byte(8); this.uint(entries.length);
      for (const [key, item] of entries) { this.text(key); this.value(item, depth + 1); }
      return;
    }
    fail("unsupported value");
  }
}

class Reader {
  at = 0;
  items = 0;
  constructor(bytes) { this.bytes = bytes; }
  byte() {
    if (this.at >= this.bytes.length) fail("truncated value");
    return this.bytes[this.at++];
  }
  uint() {
    let value = 0, scale = 1;
    for (let index = 0; index < 8; index++) {
      const byte = this.byte();
      value += (byte & 127) * scale;
      if (!(byte & 128)) {
        if (!Number.isSafeInteger(value)) fail("integer exceeds the safe range");
        return value;
      }
      scale *= 128;
    }
    fail("integer is too long");
  }
  take(length) {
    if (length > this.bytes.length - this.at) fail("truncated bytes");
    const result = this.bytes.slice(this.at, this.at + length);
    this.at += length;
    return result;
  }
  text() { return decoder.decode(this.take(this.uint())); }
  value(depth = 0) {
    if (++this.items > MAX_ITEMS || depth > MAX_DEPTH) fail("value is too complex");
    const type = this.byte();
    if (type === 0) return null;
    if (type === 1) return false;
    if (type === 2) return true;
    if (type === 3) return this.uint();
    if (type === 4) return -this.uint() - 1;
    if (type === 5) return this.text();
    if (type === 6) return this.take(this.uint());
    if (type === 7) {
      const result = [], length = this.uint();
      for (let index = 0; index < length; index++) result.push(this.value(depth + 1));
      return result;
    }
    if (type === 8) {
      const result = {}, length = this.uint();
      for (let index = 0; index < length; index++) {
        const key = this.text();
        if (Object.hasOwn(result, key) || key === "__proto__") fail("duplicate or unsafe object key");
        result[key] = this.value(depth + 1);
      }
      return result;
    }
    if (type === 9) return new MachineWtf8String(this.take(this.uint()));
    fail(`unknown type ${type}`);
  }
}

export function encodeMachineValue(value, { maxBytes = 16 * 1024 * 1024 } = {}) {
  const writer = new Writer();
  writer.value(value);
  if (writer.bytes.length > maxBytes) fail("encoded value exceeds its byte limit");
  return Uint8Array.from(writer.bytes);
}

export function decodeMachineValue(bytes, { maxBytes = 16 * 1024 * 1024 } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length > maxBytes) fail("input exceeds its byte limit");
  const reader = new Reader(bytes);
  const value = reader.value();
  if (reader.at !== bytes.length) fail("trailing data");
  return value;
}

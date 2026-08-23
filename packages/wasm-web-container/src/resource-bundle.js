const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const VERSION = 1;

class Writer {
  bytes = [];

  uint(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("bundle integer is invalid");
    do {
      const next = value % 128;
      value = Math.floor(value / 128);
      this.bytes.push(next | (value ? 128 : 0));
    } while (value);
  }

  text(value) {
    const bytes = encoder.encode(value);
    this.uint(bytes.length);
    this.bytes.push(...bytes);
  }
}

class Reader {
  constructor(bytes) { this.bytes = bytes; this.at = 0; }

  uint() {
    let value = 0, scale = 1;
    for (let count = 0; count < 8; count += 1) {
      if (this.at >= this.bytes.length) throw new Error("resource bundle header is truncated");
      const byte = this.bytes[this.at++];
      value += (byte & 127) * scale;
      if (!(byte & 128)) return value;
      scale *= 128;
    }
    throw new Error("resource bundle integer is too large");
  }

  text() {
    const length = this.uint();
    if (length > this.bytes.length - this.at) throw new Error("resource bundle name is truncated");
    const value = decoder.decode(this.bytes.subarray(this.at, this.at + length));
    this.at += length;
    return value;
  }
}

function validName(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 255 &&
    !name.startsWith("/") && !name.includes("\\") &&
    name.split("/").every(part => part && part !== "." && part !== "..");
}

export function encodeResourceBundle(input) {
  const files = [...(input instanceof Map ? input : Object.entries(input))].map(([name, bytes]) => {
    if (!validName(name)) throw new TypeError(`resource filename is invalid: ${name}`);
    if (!(bytes instanceof Uint8Array)) throw new TypeError(`resource is not bytes: ${name}`);
    return { name, bytes };
  });
  if (files.length > 65535) throw new RangeError("resource bundle has too many files");
  const names = new Set();
  for (const file of files) {
    if (names.has(file.name)) throw new TypeError(`resource filename is duplicated: ${file.name}`);
    names.add(file.name);
  }
  const header = new Writer();
  header.uint(VERSION);
  header.uint(files.length);
  for (const file of files) { header.text(file.name); header.uint(file.bytes.length); }
  const length = header.bytes.length + files.reduce((sum, file) => sum + file.bytes.length, 0);
  const output = new Uint8Array(length);
  output.set(header.bytes);
  let offset = header.bytes.length;
  for (const file of files) { output.set(file.bytes, offset); offset += file.bytes.length; }
  return output;
}

export function decodeResourceBundle(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("resource bundle must be bytes");
  const reader = new Reader(bytes);
  if (reader.uint() !== VERSION) throw new Error("resource bundle version is not supported");
  const count = reader.uint();
  if (count > 65535) throw new RangeError("resource bundle has too many files");
  const entries = [], names = new Set();
  for (let index = 0; index < count; index += 1) {
    const name = reader.text(), length = reader.uint();
    if (!validName(name) || names.has(name)) throw new Error(`resource filename is invalid: ${name}`);
    names.add(name); entries.push({ name, length });
  }
  const files = new Map();
  let offset = reader.at;
  for (const entry of entries) {
    if (entry.length > bytes.length - offset) throw new Error(`resource is truncated: ${entry.name}`);
    files.set(entry.name, bytes.subarray(offset, offset + entry.length));
    offset += entry.length;
  }
  if (offset !== bytes.length) throw new Error("resource bundle has trailing bytes");
  return files;
}

async function streamBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function gzipResourceBundle(input) {
  return streamBytes(encodeResourceBundle(input), new CompressionStream("gzip"));
}

export async function decodeResourceArtifact(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("resource artifact must be bytes");
  const gzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const bundle = gzip ? await streamBytes(bytes, new DecompressionStream("gzip")) : bytes;
  return decodeResourceBundle(bundle);
}

const sectionName = "wasm-web-machine";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function unsigned(value) {
  const bytes = [];
  do {
    const next = value & 127;
    value = Math.floor(value / 128);
    bytes.push(next | (value ? 128 : 0));
  } while (value);
  return Uint8Array.from(bytes);
}

function readUnsigned(bytes, offset) {
  let value = 0, scale = 1, byte;
  const start = offset;
  do {
    if (offset >= bytes.length || offset - start === 5) throw new Error("invalid Wasm length");
    byte = bytes[offset++];
    value += (byte & 127) * scale;
    scale *= 128;
  } while (byte & 128);
  return { value, offset };
}

function join(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function withoutOldStamp(wasm) {
  if (wasm.length < 8 || decoder.decode(wasm.subarray(0, 4)) !== "\0asm") {
    throw new Error("input is not a WebAssembly module");
  }
  const kept = [wasm.subarray(0, 8)];
  let offset = 8;
  while (offset < wasm.length) {
    const start = offset++;
    const size = readUnsigned(wasm, offset);
    const content = size.offset;
    const end = content + size.value;
    if (end > wasm.length) throw new Error("truncated Wasm section");
    let keep = true;
    if (wasm[start] === 0) {
      const nameLength = readUnsigned(wasm, content);
      const nameEnd = nameLength.offset + nameLength.value;
      if (nameEnd > end) throw new Error("truncated custom section name");
      keep = decoder.decode(wasm.subarray(nameLength.offset, nameEnd)) !== sectionName;
    }
    if (keep) kept.push(wasm.subarray(start, end));
    offset = end;
  }
  return kept;
}

async function io() {
  if (typeof Deno !== "undefined") {
    return { args: Deno.args, read: Deno.readFile, write: Deno.writeFile };
  }
  const fs = await import("node:fs/promises");
  return { args: process.argv.slice(2), read: fs.readFile, write: fs.writeFile };
}

const { args, read, write } = await io();
if (args.length < 4) {
  throw new Error("usage: stamp-wasm.js INPUT OUTPUT NAME=FILE NAME=FILE ...");
}
const [input, output, ...entries] = args;
const files = [];
for (const entry of entries) {
  const equals = entry.indexOf("=");
  if (equals < 1) throw new Error(`invalid resource argument: ${entry}`);
  const name = entry.slice(0, equals);
  if (/[,|:]/.test(name)) throw new Error(`resource name contains a delimiter: ${name}`);
  files.push({ name, bytes: new Uint8Array(await read(entry.slice(equals + 1))) });
}
let stampedFiles, header;
for (let padding = 0; padding < 8; padding++) {
  stampedFiles = [{ name: "padding", bytes: new Uint8Array(padding) }, ...files];
  header = encoder.encode(stampedFiles.map(
    ({ name, bytes }) => `${name}:${bytes.length}`).join(",") + "|");
  if ((header.length + padding) % 8 === 0) break;
}
const payload = join([header, ...stampedFiles.map(({ bytes }) => bytes)]);
const name = encoder.encode(sectionName);
const content = join([unsigned(name.length), name, payload]);
const section = join([Uint8Array.of(0), unsigned(content.length), content]);
const wasm = new Uint8Array(await read(input));
await write(output, join([...withoutOldStamp(wasm), section]));

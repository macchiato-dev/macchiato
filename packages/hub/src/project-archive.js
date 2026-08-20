const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 256;
const IMAGE_TYPES = Object.freeze({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" });

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value, true); }
function extension(path) { return path.split(".").at(-1).toLowerCase(); }
function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}
function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function fileBytes(file) {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(file.content);
  return match ? base64ToBytes(match[2]) : encoder.encode(file.content);
}

export function isProjectImage(file) {
  return Boolean(file && IMAGE_TYPES[extension(file.path)] && /^data:image\//.test(file.content));
}

export function projectArchiveFilename(name) {
  const value = String(name || "").trim();
  return `${/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : "untitled-project"}.zip`;
}

export function encodeProjectArchive(snapshot) {
  const manifest = { format: "resources-project", version: 1, config: snapshot.config };
  const entries = [...snapshot.files, { path: "macchiato.project.json", content: JSON.stringify(manifest, null, 2) + "\n" }]
    .map((file) => ({ name: encoder.encode(file.path), bytes: fileBytes(file), crc: 0 }));
  if (entries.length > MAX_FILES + 1) throw new Error(`Archive exceeds ${MAX_FILES} project files`);
  for (const entry of entries) entry.crc = crc32(entry.bytes);
  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.bytes.length, 0);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
  if (localSize + centralSize + 22 > MAX_ARCHIVE_BYTES) throw new Error("Archive exceeds 50 MB");
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;
  const records = [];
  for (const entry of entries) {
    const start = offset;
    write32(view, offset, 0x04034b50); write16(view, offset + 4, 20); write16(view, offset + 6, 0x800); write16(view, offset + 8, 0);
    write32(view, offset + 14, entry.crc); write32(view, offset + 18, entry.bytes.length); write32(view, offset + 22, entry.bytes.length); write16(view, offset + 26, entry.name.length);
    output.set(entry.name, offset + 30); output.set(entry.bytes, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.bytes.length;
    records.push({ entry, start });
  }
  const centralStart = offset;
  for (const { entry, start } of records) {
    write32(view, offset, 0x02014b50); write16(view, offset + 4, 20); write16(view, offset + 6, 20); write16(view, offset + 8, 0x800);
    write32(view, offset + 16, entry.crc); write32(view, offset + 20, entry.bytes.length); write32(view, offset + 24, entry.bytes.length); write16(view, offset + 28, entry.name.length); write32(view, offset + 42, start);
    output.set(entry.name, offset + 46); offset += 46 + entry.name.length;
  }
  write32(view, offset, 0x06054b50); write16(view, offset + 8, records.length); write16(view, offset + 10, records.length); write32(view, offset + 12, offset - centralStart); write32(view, offset + 16, centralStart);
  return output;
}

async function inflate(bytes) {
  if (typeof DecompressionStream !== "function") throw new Error("This browser cannot import compressed ZIP entries");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function decodeProjectArchive(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length > MAX_ARCHIVE_BYTES) throw new Error("Archive exceeds 50 MB");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65_557) && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error("ZIP end record is missing");
  const count = view.getUint16(end + 10, true);
  if (count > MAX_FILES + 1) throw new Error(`Archive exceeds ${MAX_FILES} project files`);
  let offset = view.getUint32(end + 16, true);
  const files = [];
  let config = { entry: "index.html", template: "blank", container: "presentation", sandbox: { network: false, storage: "session" } };
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("ZIP directory is invalid");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const path = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (!path || path.endsWith("/") || path.startsWith("/") || path.includes("..") || path.includes("\\")) { offset += 46 + nameLength + extraLength + commentLength; continue; }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const compressed = bytes.subarray(localOffset + 30 + localNameLength + localExtraLength, localOffset + 30 + localNameLength + localExtraLength + compressedSize);
    const contentBytes = method === 0 ? compressed : method === 8 ? await inflate(compressed) : (() => { throw new Error(`Unsupported ZIP compression method ${method}`); })();
    if (path === "macchiato.project.json") {
      const manifest = JSON.parse(decoder.decode(contentBytes));
      if (manifest?.format !== "resources-project" || manifest.version !== 1) throw new Error("Project manifest is invalid");
      config = manifest.config;
    } else {
      const type = IMAGE_TYPES[extension(path)];
      files.push({ path, content: type && type !== "image/svg+xml" ? `data:${type};base64,${bytesToBase64(contentBytes)}` : decoder.decode(contentBytes) });
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (!files.length) throw new Error("Archive contains no project files");
  return { files, config };
}

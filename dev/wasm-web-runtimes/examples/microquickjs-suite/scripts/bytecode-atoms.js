// Build-time reader for this vendored MicroQuickJS's unrelocated wasm32
// bytecode. Layouts: JSBytecodeHeader32, JSValueArray_32, and JSString_32 in
// mquickjs.h/mquickjs.c; four header bits and three string flags precede len.
// This is not a general bytecode validator and never runs in the browser.
export function bytecodeAtoms(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fail = () => { throw new Error("Unsupported MicroQuickJS atom table"); };
  if (bytes.length < 16 || view.getUint16(0, true) !== 0xacfb ||
      view.getUint16(2, true) !== 1 || view.getUint32(4, true) !== 0) fail();
  function pointer(value) {
    const offset = 16 + value - 1;
    if ((value & 3) !== 1 || offset > bytes.length - 4) fail();
    return offset;
  }
  const table = pointer(view.getUint32(8, true));
  const header = view.getUint32(table, true);
  const count = header >>> 4;
  if ((header & 14) !== 10 || count > (bytes.length - table - 4) / 4) fail();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const atoms = [];
  for (let index = 0; index < count; index++) {
    const offset = pointer(view.getUint32(table + 4 + index * 4, true));
    const flags = view.getUint32(offset, true), length = flags >>> 7;
    if ((flags & 30) !== 22 || length >= bytes.length - offset - 4 ||
        bytes[offset + 4 + length] !== 0) fail();
    atoms.push(decoder.decode(bytes.subarray(offset + 4, offset + 4 + length)));
  }
  return atoms;
}

export function atomCatalogSource(bytecodes) {
  const atoms = new Set(bytecodes.flatMap(bytecodeAtoms));
  // Only property names need to be interned. This program is loaded, never
  // executed; use bounded objects rather than one enormous object literal.
  const names = [...atoms].sort(), lines = [];
  for (let index = 0; index < names.length; index += 64) {
    lines.push("({" + names.slice(index, index + 64)
      .map(name => JSON.stringify(name) + ":0").join(",") + "});");
  }
  return lines.join("\n") + "\n";
}

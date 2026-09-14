/** Assemble annotated byte lists; never infer or translate Wasm instructions. */
type Item = {
  id: string;
  line: number;
  code: string;
  children: Item[];
};

export type Assembly = {
  bytes: Uint8Array<ArrayBuffer>;
  resolved: string;
  map: {
    id: string;
    line: number;
    offset: number;
    length: number;
    subtreeLength: number;
  }[];
};

export function uleb(value: number): number[] {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`Not an unsigned 32-bit count: ${value}`);
  }
  const result = [];
  do {
    const byte = value % 128;
    value = Math.floor(value / 128);
    result.push(byte | (value ? 128 : 0));
  } while (value);
  return result;
}

function hex(bytes: Iterable<number>): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

export function assemble(markdown: string): Assembly {
  const lines = markdown.split(/\r?\n/);
  const roots: Item[] = [];
  const labels = new Map<string, Item>();
  const stack: Item[] = [];
  let inside = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line === "<!-- microwasm:start -->") {
      if (inside) throw new Error(`Line ${index + 1}: nested byte region`);
      inside = true;
      stack.length = 0;
      continue;
    }
    if (line === "<!-- microwasm:end -->") {
      if (!inside) throw new Error(`Line ${index + 1}: unmatched region end`);
      inside = false;
      continue;
    }
    if (!inside || !line.trim()) continue;
    const match = /^( *)- ([a-z][a-z0-9-]*):(?: `([^`]*)`)?(?: — .*)?$/.exec(
      line,
    );
    if (!match || match[1].length % 2) {
      throw new Error(
        `Line ${index + 1}: expected an annotated byte-list item`,
      );
    }
    const depth = match[1].length / 2;
    if (depth > stack.length) {
      throw new Error(`Line ${index + 1}: skipped nesting level`);
    }
    const item: Item = {
      id: match[2],
      line: index + 1,
      code: match[3] ?? "",
      children: [],
    };
    if (labels.has(item.id)) {
      throw new Error(`Line ${item.line}: duplicate label ${item.id}`);
    }
    labels.set(item.id, item);
    (depth ? stack[depth - 1].children : roots).push(item);
    stack[depth] = item;
    stack.length = depth + 1;
  }
  if (inside) throw new Error("Unclosed byte region");
  if (!roots.length) throw new Error("No executable byte lists");

  const encoded = new Map<Item, number[]>();
  const lengths = new Map<Item, number>();
  const visiting = new Set<Item>();
  function ownBytes(item: Item): number[] {
    const cached = encoded.get(item);
    if (cached) return cached;
    const result: number[] = [];
    for (const token of item.code.trim().split(/\s+/).filter(Boolean)) {
      if (/^(?:[0-9a-fA-F]{2})+$/.test(token)) {
        for (let offset = 0; offset < token.length; offset += 2) {
          result.push(parseInt(token.slice(offset, offset + 2), 16));
        }
        continue;
      }
      const placeholder = /^\{\{(size|count):([a-z][a-z0-9-]*)\}\}$/.exec(
        token,
      );
      if (!placeholder) {
        throw new Error(
          `Line ${item.line}: invalid byte or placeholder ${token}`,
        );
      }
      const target = labels.get(placeholder[2]);
      if (!target) {
        throw new Error(`Line ${item.line}: unknown label ${placeholder[2]}`);
      }
      result.push(
        ...uleb(
          placeholder[1] === "size" ? size(target) : target.children.length,
        ),
      );
    }
    encoded.set(item, result);
    return result;
  }
  function size(item: Item): number {
    const cached = lengths.get(item);
    if (cached !== undefined) return cached;
    if (visiting.has(item)) {
      throw new Error(
        `Line ${item.line}: cyclic size dependency at ${item.id}`,
      );
    }
    visiting.add(item);
    const length = ownBytes(item).length +
      item.children.reduce((sum, child) => sum + size(child), 0);
    visiting.delete(item);
    if (length > 0xffff_ffff) {
      throw new Error(`Item ${item.id} exceeds a Wasm u32 length`);
    }
    lengths.set(item, length);
    return length;
  }

  const length = roots.reduce((sum, item) => sum + size(item), 0);
  const bytes = new Uint8Array(length);
  const map: Assembly["map"] = [];
  let offset = 0;
  function emit(item: Item) {
    const own = ownBytes(item);
    map.push({
      id: item.id,
      line: item.line,
      offset,
      length: own.length,
      subtreeLength: size(item),
    });
    bytes.set(own, offset);
    offset += own.length;
    if (item.code) {
      lines[item.line - 1] = lines[item.line - 1].replace(
        /`[^`]*`/,
        () => `\`${hex(own)}\``,
      );
    }
    item.children.forEach(emit);
  }
  roots.forEach(emit);
  return { bytes, map, resolved: lines.join("\n") };
}

export function toHex(bytes: Uint8Array): string {
  const lines = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    lines.push(hex(bytes.subarray(offset, offset + 16)));
  }
  return lines.join("\n") + "\n";
}

export function fromHex(source: string): Uint8Array<ArrayBuffer> {
  const tokens = source.trim().split(/\s+/);
  if (
    !tokens.length ||
    tokens.some((token) => !/^(?:[0-9a-fA-F]{2})+$/.test(token))
  ) {
    throw new Error("Hex file must contain only whitespace-separated bytes");
  }
  const compact = tokens.join("");
  return Uint8Array.from(compact.match(/../g)!, (token) => parseInt(token, 16));
}

if (import.meta.main) {
  const [path, exportName, ...arguments_] = Deno.args;
  if (!path || !path.endsWith(".md")) {
    throw new Error(
      "Usage: deno run --allow-read=. --allow-write=dist microwasm.ts example.md [export [integer ...]]",
    );
  }
  const assembled = assemble(await Deno.readTextFile(path));
  const name = path.split(/[\\/]/).at(-1)!.slice(0, -3);
  await Deno.mkdir("dist", { recursive: true });
  const prefix = `dist/${name}`;
  await Deno.writeTextFile(`${prefix}.resolved.md`, assembled.resolved);
  await Deno.writeTextFile(
    `${prefix}.map.json`,
    JSON.stringify(assembled.map, null, 2) + "\n",
  );
  await Deno.writeTextFile(`${prefix}.hex`, toHex(assembled.bytes));
  // Intentionally consume the intermediate file, not the in-memory assembly.
  const bytes = fromHex(await Deno.readTextFile(`${prefix}.hex`));
  if (!WebAssembly.validate(bytes)) {
    throw new Error(`Invalid WebAssembly; inspect ${prefix}.hex`);
  }
  await Deno.writeFile(`${prefix}.wasm`, bytes);
  const { instance } = await WebAssembly.instantiate(bytes);
  console.log(`${path}: ${bytes.length} validated bytes -> ${prefix}.wasm`);
  if (exportName) {
    const fn = instance.exports[exportName];
    if (typeof fn !== "function") {
      throw new Error(`No function export ${exportName}`);
    }
    const args = arguments_.map((value) => {
      if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
        throw new Error(`Not a safe integer argument: ${value}`);
      }
      return Number(value);
    });
    console.log(`${exportName}(${args.join(", ")}) = ${fn(...args)}`);
  }
}

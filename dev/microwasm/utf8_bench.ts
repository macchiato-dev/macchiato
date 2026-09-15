// Optional comparison, not shipped code. The scalar reference removes only
// the explicitly labeled fast-path instruction group from the same document.
import { assemble } from "./microwasm.ts";

const source = await Deno.readTextFile(
  new URL("transforms/00-calendar-lines.md", import.meta.url),
);
const marker = /^ +\- cl-utf8-ascii-block:.*\n/gm;
if ([...source.matchAll(marker)].length !== 1) {
  throw Error("Expected one SIMD fast-path group");
}
const nBytes = assemble(
  await Deno.readTextFile(
    new URL("numbers/02-json-number.md", import.meta.url),
  ),
).bytes;
const enc = new TextEncoder();
for (
  const [group, text] of [
    ["ASCII 64KiB", "a".repeat(65536)],
    ["JSON-like ASCII", '{"name":"Milo","score":1234},'.repeat(2000)],
    ["Mixed text", "A paragraph about compilers, then 雪と猫. ".repeat(1000)],
    ["Unicode text", "雪と猫😀".repeat(5000)],
  ]
) {
  for (
    const [name, doc] of [["scalar", source.replace(marker, "")], [
      "SIMD",
      source,
    ]]
  ) {
    const n = (await WebAssembly.instantiate(nBytes)).instance.exports;
    const c =
      (await WebAssembly.instantiate(assemble(doc).bytes, { n })).instance
        .exports;
    const bytes = enc.encode(text);
    new Uint8Array((c.memory as WebAssembly.Memory).buffer).set(bytes);
    const check = c.utf8 as (s: number, e: number) => void;
    Deno.bench({
      name,
      group,
      baseline: name === "scalar",
      fn() {
        check(0, bytes.length);
      },
    });
  }
}

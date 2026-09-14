import { fromHex } from "./microwasm.ts";

type Node = { tag: string; text: string; children: Node[] };

Deno.test("the supplied app4 binary drives externref calls to build its own hex table", async () => {
  const markdown = await Deno.readTextFile(
    new URL("docs/handwritten-reference.md", import.meta.url),
  );
  const source = /```hex\n([\s\S]*?)\n```/.exec(markdown)?.[1];
  if (!source) throw new Error("Reference hex is missing");
  const bytes = fromHex(source);
  const module = await WebAssembly.compile(bytes);
  let memory: WebAssembly.Memory;
  const instance = await WebAssembly.instantiate(module, {
    m: {
      str(offset: number, length: number) {
        return new TextDecoder().decode(
          new Uint8Array(memory.buffer, offset, length),
        );
      },
      "str:hex"(offset: number, length: number) {
        return [...new Uint8Array(memory.buffer, offset, length)]
          .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      },
      "el:new"(tag: string): Node {
        return { tag, text: "", children: [] };
      },
      "el:text="(node: Node, text: string) {
        node.text = text;
      },
      "el:append"(parent: Node, child: Node) {
        parent.children.push(child);
      },
    },
  });
  memory = instance.exports.memory as WebAssembly.Memory;
  new Uint8Array(memory.buffer).set(bytes);
  const go = instance.exports.go as (root: Node, length: number) => void;
  for (const length of [1, 8, 9, 16, bytes.length]) {
    const root: Node = { tag: "root", text: "", children: [] };
    go(root, length);
    if (root.children.length !== Math.ceil(length / 8)) {
      throw new Error("Wrong row count");
    }
    const cells = root.children.flatMap((row) => {
      if (row.tag !== "div" || row.children.length > 8) {
        throw new Error("Wrong row structure");
      }
      return row.children;
    });
    const actual = cells.map((cell) => {
      if (cell.tag !== "div") throw new Error("Wrong cell tag");
      return cell.text;
    }).join("");
    const expected = [...bytes.slice(0, length)].map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    if (actual !== expected) {
      throw new Error(`Wrong contents for ${length} bytes`);
    }
  }
  const empty: Node = { tag: "root", text: "", children: [] };
  go(empty, 0);
  if (empty.children[0]?.children.length !== 1) {
    throw new Error("The reference's documented do-while behavior changed");
  }
});

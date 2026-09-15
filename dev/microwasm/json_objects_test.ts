import { assemble, toHex } from "./microwasm.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}
function traps(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) return;
    throw error;
  }
  throw new Error("Expected Wasm trap");
}
const fence = (body: string) => "```json\n" + body + "\n```\n";
const encoder = new TextEncoder(), decoder = new TextDecoder();
const escapeCell = (value: string) =>
  value.replace(/[\x00-\x20&<>|\\`*_\[\]]/g, (c) => `&#${c.charCodeAt(0)};`);
function table(headers: string[], rows: (string | undefined)[][]) {
  const row = (cells: (string | undefined)[]) =>
    "| " + cells.map((cell) => cell === undefined ? "" : escapeCell(cell))
      .join(" | ") +
    " |\n";
  return row(headers) + "|" + headers.map(() => " --- |").join("") + "\n" +
    rows.map(row).join("");
}
async function converter() {
  const imports: Record<string, WebAssembly.Exports> = {};
  for (
    const [name, path] of [
      ["n", "numbers/02-json-number"],
      ["p", "transforms/02-json-to-list"],
      ["k", "transforms/00-json-string-keys"],
      ["o", "transforms/08-json-objects-to-table"],
    ]
  ) {
    const b = assemble(
      await Deno.readTextFile(new URL(path + ".md", import.meta.url)),
    );
    equal(toHex(assemble(b.resolved).bytes), toHex(b.bytes));
    const module = await WebAssembly.compile(b.bytes);
    if (name === "o") {
      equal(
        JSON.stringify(WebAssembly.Module.imports(module)),
        JSON.stringify([
          { module: "p", name: "compact", kind: "function" },
          { module: "k", name: "equal", kind: "function" },
          { module: "p", name: "memory", kind: "memory" },
        ]),
      );
    }
    imports[name] = (await WebAssembly.instantiate(module, imports)).exports;
  }
  const bytes = new Uint8Array((imports.n.memory as WebAssembly.Memory).buffer);
  const run = imports.o.run as (length: number) => number;
  function convert(input: string) {
    const encoded = encoder.encode(input);
    bytes.set(encoded);
    const length = run(encoded.length);
    equal(toHex(bytes.subarray(0, encoded.length)), toHex(encoded));
    return decoder.decode(bytes.subarray(65536, 65536 + length));
  }
  return { bytes, run, convert, json: (body: string) => convert(fence(body)) };
}

Deno.test("JSON objects: ordered union, missing versus null, exact value tokens", async () => {
  const c = await converter();
  equal(
    c.json('[{"name":"Ben","score":12.50},{"active":true,"name":"Ada"},{}]'),
    table(['"name"', '"score"', '"active"'], [
      ['"Ben"', "12.50", undefined],
      ['"Ada"', undefined, "true"],
      [undefined, undefined, undefined],
    ]),
  );
  equal(
    c.json('[{}, {"x":null}, {"x":""}, {"x":false}, {"x":0}]'),
    table(['"x"'], [[undefined], ["null"], ['""'], ["false"], ["0"]]),
  );
  equal(
    c.json('[{"20":-0,"2":1.2300E+40,"":"a|b","__proto__":1e9999}]'),
    table(['"20"', '"2"', '""', '"__proto__"'], [[
      "-0",
      "1.2300E+40",
      '"a|b"',
      "1e9999",
    ]]),
  );
  equal(
    c.json('[{"x":{"a":1,"a":2},"y":[{},["a:b,c}]"]]}]'),
    table(['"x"', '"y"'], [['{"a":1,"a":2}', '[{},["a:b,c}]"]]']]),
  );
  equal(c.json("[]"), "");
  equal(
    c.convert(' \r\n```json\r\n[{"x": 1}]\r\n```\r\n'),
    table(['"x"'], [["1"]]),
  );
});

Deno.test("JSON object columns: semantic key equality and literal Markdown", async () => {
  const c = await converter();
  const keys = ['"\\u006eame"', '"😀"', '"\\ud800"', '"é"', '"e\\u0301"'];
  const input = "[{" + keys.map((key, i) => `${key}:${i}`).join(",") +
    '},{"name":5,"\\ud83d\\ude00":6,"\\uD800":7,"\\u00e9":8,"é":9}]';
  equal(
    c.json(input),
    table(keys, [["0", "1", "2", "3", "4"], ["5", "6", "7", "8", "9"]]),
  );
  const text = "[link](https://example.com/) <script> & &#124; ` | \\ **";
  const encoded = JSON.stringify(text);
  equal(c.json(`[{${encoded}:${encoded}}]`), table([encoded], [[encoded]]));
  for (let i = 0; i < 128; i++) {
    const key = JSON.stringify(String.fromCharCode(i));
    equal(c.json(`[{${key}:${key}}]`), table([key], [[key]]));
  }
});

Deno.test("JSON object tables: 500 generated sparse row sets", async () => {
  const c = await converter();
  let seed = 761;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const names = [
    "a",
    "b",
    "猫",
    "😀",
    "constructor",
    "__proto__",
    "",
    "x|y",
    "\\",
    '"',
  ];
  const values = [null, false, true, 0, -20.5, " a | b ", {}, [1, "猫"], {
    x: [null],
  }];
  for (let n = 0; n < 500; n++) {
    const rows: Record<string, unknown>[] = [];
    const headers: string[] = [];
    for (let r = 0, count = random() % 8 + 1; r < count; r++) {
      const row = Object.create(null);
      for (let j = 0, width = random() % 12; j < width; j++) {
        const key = names[random() % names.length];
        row[key] = values[random() % values.length];
        if (!headers.includes(key)) headers.push(key);
      }
      rows.push(row);
    }
    const source = JSON.stringify(rows);
    if (!headers.length) {
      traps(() => c.json(source));
      continue;
    }
    equal(
      c.json(source),
      table(
        headers.map((key) => JSON.stringify(key)),
        rows.map((row) =>
          headers.map((key) =>
            Object.hasOwn(row, key) ? JSON.stringify(row[key]) : undefined
          )
        ),
      ),
    );
  }
});

Deno.test("JSON objects: invalid shapes, duplicate keys and recovery", async () => {
  const c = await converter();
  for (
    const body of [
      "{}",
      "null",
      "1",
      "[1]",
      "[[]]",
      "[{},false]",
      "[{}]",
      "[{},{}]",
      '[{"x":1,"x":2}]',
      '[{"x":1,"\\u0078":2}]',
      '[{"😀":1,"\\ud83d\\ude00":2}]',
      '[{"":1,"":2}]',
      '[{"x":1},]',
      '[{"x":01}]',
      '[{"x":"\\q"}]',
    ]
  ) {
    traps(() => c.json(body));
    equal(c.json('[{"x":1},{"x":2}]'), table(['"x"'], [["1"], ["2"]]));
  }
  for (const input of ['[{"x":1}]', "```js\n[]\n```", "```json\n[]\n```junk"]) {
    traps(() => c.convert(input));
  }
});

Deno.test("JSON objects: bounded columns, nesting and metadata reset", async () => {
  const c = await converter();
  const object = (n: number) =>
    "{" + Array.from({ length: n }, (_, i) => `"k${i}":${i}`).join(",") + "}";
  const result = c.json("[" + object(1024) + "]");
  equal(result.split("\n")[0].split("|").length, 1026);
  traps(() => c.json("[" + object(1025) + "]"));
  equal(c.json('[{"new":1},{}]'), table(['"new"'], [["1"], [undefined]]));
  const nested = (n: number) => "[".repeat(n) + "0" + "]".repeat(n);
  equal(c.json('[{"x":' + nested(126) + "}]"), table(['"x"'], [[nested(126)]]));
  traps(() => c.json('[{"x":' + nested(127) + "}]"));
  // Many blank rows can overflow output even though the source is small.
  traps(() =>
    c.json("[" + object(1024) + "," + Array(40).fill("{}").join(",") + "]")
  );
  equal(c.json("[]"), "");
});

Deno.test("JSON objects: full input, source scratch boundary and output overflow", async () => {
  const c = await converter();
  // No final LF: twelve fence bytes leave exactly 65,524 body bytes,
  // exercising the compact scratch limit.
  const body = '[{"x":"' + "a".repeat(65524 - 10) + '"}]';
  equal(encoder.encode(body).length, 65524);
  const source = "```json\n" + body + "\n```";
  equal(encoder.encode(source).length, 65536);
  const output = c.convert(source);
  equal(output, table(['"x"'], [[JSON.stringify("a".repeat(65514))]]));
  equal(c.bytes[0x3ffff], 93);
  traps(() => c.convert(source + " "));
  traps(() => c.json('[{"x":"' + "|".repeat(30000) + '"}]'));
  equal(c.json('[{"x":1}]'), table(['"x"'], [["1"]]));
});

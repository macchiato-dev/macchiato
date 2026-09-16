// The documents are the source tree. This extractor is intentionally not a
// Markdown renderer; only standalone inline-code markers outside fences count.
export const documents = [
  "workflow.md",
  "markdown.md",
  "rust.md",
  "layout.md",
  "server.md",
];

export type Input = { path: string; digest: string };
export type Document = { files: Map<string, string>; inputs: Input[] };

function localPath(path: string): boolean {
  return /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(path) &&
    !path.split("/").some((part) => part === "." || part === "..");
}

export function extract(text: string): Document {
  const files = new Map<string, string>();
  const inputs: Input[] = [];
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  let pending: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = /^`([^`]+)`$/.exec(line);
    if (marker) {
      if (pending) throw new Error(`Missing source block: ${pending}`);
      const input = /^input: (\S+) sha256:([a-f0-9]{64})$/.exec(marker[1]);
      if (input) {
        if (!localPath(input[1]) || !input[1].startsWith("inputs/")) {
          throw new Error(`Invalid input path: ${input[1]}`);
        }
        inputs.push({ path: input[1], digest: input[2] });
      } else {
        if (
          !localPath(marker[1]) ||
          !(marker[1] === "Cargo.toml" || marker[1] === "server.ts" ||
            /^src\/\w+\.rs$/.test(marker[1]))
        ) {
          throw new Error(`Invalid source marker: ${marker[1]}`);
        }
        pending = marker[1];
      }
      continue;
    }
    const fence = /^(`{3,})(\w*)$/.exec(line);
    if (fence) {
      const body: string[] = [];
      const closing = new RegExp("^`{" + fence[1].length + ",}\\s*$");
      for (i++; i < lines.length && !closing.test(lines[i]); i++) {
        body.push(lines[i]);
      }
      if (i === lines.length) throw new Error("Unclosed code fence");
      if (pending) {
        if (files.has(pending)) throw new Error(`Duplicate source: ${pending}`);
        files.set(pending, body.join("\n") + "\n");
        pending = undefined;
      }
    } else if (pending && line.trim()) {
      throw new Error(`Expected code block after ${pending}`);
    }
  }
  if (pending) throw new Error(`Missing source block: ${pending}`);
  return { files, inputs };
}

export async function verify(
  bytes: Uint8Array,
  expected: string,
): Promise<void> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
  );
  const actual = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (actual !== expected) {
    throw new Error(`SHA-256 mismatch: expected ${expected}, got ${actual}`);
  }
}

async function build(): Promise<void> {
  const files = new Map<string, string>();
  const inputs = new Map<string, Uint8Array>();
  for (const name of documents) {
    const doc = extract(await Deno.readTextFile(name));
    for (const [path, source] of doc.files) {
      if (files.has(path)) throw new Error(`Duplicate source: ${path}`);
      files.set(path, source);
    }
    for (const input of doc.inputs) {
      if (inputs.has(input.path)) {
        throw new Error(`Duplicate input: ${input.path}`);
      }
      // Refuse symlinks which could turn a local input into an outside read.
      let prefix = "";
      for (const part of input.path.split("/")) {
        prefix += (prefix ? "/" : "") + part;
        if ((await Deno.lstat(prefix)).isSymlink) {
          throw new Error(`Symlink input: ${prefix}`);
        }
      }
      const bytes = await Deno.readFile(input.path);
      await verify(bytes, input.digest);
      inputs.set(input.path, bytes);
    }
  }
  // Remove stale extracted sources, but keep the small incremental Cargo cache.
  await Deno.mkdir("build", { recursive: true });
  for (const path of ["build/src", "build/inputs"]) {
    try {
      await Deno.remove(path, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    await Deno.mkdir(path);
  }
  for (const [path, source] of files) {
    await Deno.writeTextFile(`build/${path}`, source);
  }
  for (const [path, bytes] of inputs) {
    await Deno.mkdir(`build/${path.slice(0, path.lastIndexOf("/"))}`, {
      recursive: true,
    });
    await Deno.writeFile(`build/${path}`, bytes);
  }
  await Deno.mkdir("dist", { recursive: true });
  const status = await new Deno.Command("cargo", {
    args: [
      "build",
      "--offline",
      "--release",
      "--target",
      "wasm32-unknown-unknown",
    ],
    cwd: "build",
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!status.success) throw new Error("Wasm build failed");
  const bytes = await Deno.readFile(
    "build/target/wasm32-unknown-unknown/release/document_workflow.wasm",
  );
  const module = await WebAssembly.compile(bytes);
  if (WebAssembly.Module.imports(module).length) {
    throw new Error("Unexpected Wasm imports");
  }
  const { exports } = await WebAssembly.instantiate(module, {});
  for (
    const name of [
      "test_markdown",
      "test_rust",
      "test_layout",
      "test_composition",
    ]
  ) {
    (exports.reset as () => void)();
    const count = (exports[name] as () => number)();
    console.log(`${name}: ${count} cases passed in Wasm`);
  }
  const html = render(exports, inputs.get("inputs/article.md")!, 2, 0);
  await Deno.writeTextFile("dist/sample.html", html);
  // Build the complete reading document from the same authoring sources. It is
  // rendered by the Wasm too, not by Deno or a second Markdown implementation.
  const sections = [await Deno.readTextFile("README.md")];
  for (const name of documents) sections.push(await Deno.readTextFile(name));
  for (
    const name of [
      "workflow.ts",
      "workflow_test.ts",
      "browser-test.ts",
      "deno.json",
    ]
  ) {
    const language = name.endsWith(".ts") ? "ts" : "json";
    sections.push(
      `## Tooling: ${name}\n\n` + "`````" + language + "\n" +
        await Deno.readTextFile(name) + "\n`````\n",
    );
  }
  sections.push(
    "## Verified sample\n\n" +
      new TextDecoder().decode(inputs.get("inputs/article.md")),
  );
  const book = new TextEncoder().encode(sections.join("\n\n"));
  await Deno.writeTextFile("dist/index.html", render(exports, book, 3, 0));
  await Deno.writeTextFile("dist/dark.html", render(exports, book, 3, 1));
  await Deno.writeFile("dist/workflow.wasm", bytes);
  console.log(
    `Wasm: ${bytes.length} bytes; HTML: ${
      new TextEncoder().encode(html).length
    } bytes`,
  );
}

export function render(
  exports: WebAssembly.Exports,
  input: Uint8Array,
  kind: number,
  theme: number,
): string {
  const alloc = exports.allocate as (length: number) => number;
  const reset = exports.reset as () => void;
  const run = exports.render as (
    kind: number,
    pointer: number,
    length: number,
    theme: number,
  ) => bigint;
  const memory = exports.memory as WebAssembly.Memory;
  reset();
  const pointer = alloc(input.length);
  try {
    new Uint8Array(memory.buffer, pointer, input.length).set(input);
    const result = run(kind, pointer, input.length, theme);
    const offset = Number(result & 0xffff_ffffn);
    const length = Number(result >> 32n);
    // Read memory again: rendering may have grown it and detached the old view.
    return new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(memory.buffer, offset, length),
    );
  } finally {
    reset();
  }
}

if (import.meta.main) await build();

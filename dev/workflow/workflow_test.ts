import { extract, verify } from "./workflow.ts";

function assert(value: unknown): asserts value {
  if (!value) throw new Error("Assertion failed");
}

function rejects(text: string) {
  try { extract(text); } catch { return; }
  throw new Error("Expected document rejection");
}

Deno.test("visible source marker and longer fence preserve content", () => {
  const doc = extract("`src/lib.rs`\n\n````rust\nlet s = \"```\";\n````\n");
  assert(doc.files.get("src/lib.rs") === 'let s = "```";\n');
});

Deno.test("ordinary prose and unlabelled examples are not source files", () => {
  assert(extract("Mention `src/lib.rs` here.\n\n```rust\nhello\n```\n").files.size === 0);
});

Deno.test("reject paths, missing blocks, malformed hashes, duplicate files", () => {
  for (const text of [
    "`../escape.rs`\n```rust\nx\n```",
    "`/root/escape.rs`\n```rust\nx\n```",
    "`src/lib.rs`\nforgot the block",
    "`src/lib.rs`\n```rust\nunfinished",
    "`input: inputs/a.md sha256:bad`",
    "`src/lib.rs`\n```rust\nx\n```\n`src/lib.rs`\n```rust\ny\n```",
  ]) rejects(text);
});

Deno.test("SHA256 pins exact bytes including final newline", async () => {
  const bytes = new TextEncoder().encode("abc");
  const hash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  await verify(bytes, hash);
  let rejected = false;
  try { await verify(new TextEncoder().encode("abc\n"), hash); } catch { rejected = true; }
  assert(rejected);
});

Deno.test("all authored documents extract and external content verifies", async () => {
  const { documents } = await import("./workflow.ts");
  const seen = new Set<string>();
  for (const name of documents) {
    const doc = extract(await Deno.readTextFile(name));
    for (const path of doc.files.keys()) {
      assert(!seen.has(path)); seen.add(path);
    }
    for (const input of doc.inputs) await verify(await Deno.readFile(input.path), input.digest);
  }
  assert(seen.has("server.ts"));
  assert(seen.size === 6);
});

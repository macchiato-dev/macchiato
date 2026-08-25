type Probe = readonly [name: string, expected: number | "nonzero"];

const core: Probe = ["core_probe", 42];
const configurations: readonly (readonly [string, string, readonly Probe[]])[] =
  [
    ["minimal", "", [core]],
    ["arrays", "arrays", [core, ["arrays_probe", 1]]],
    ["async suspension", "async", [core, ["async_probe", 7]]],
    ["collections", "collections", [core, ["collections_probe", 0]]],
    ["exceptions", "exceptions", [core, ["exceptions_probe", 42]]],
    ["functions", "functions", [core, ["functions_probe", "nonzero"]]],
    [
      "objects",
      "objects",
      [core, ["objects_probe", 42], ["strings_probe", "nonzero"]],
    ],
    ["strings", "strings", [core, ["strings_probe", "nonzero"]]],
    ["promises", "promises", [core, ["promises_probe", "nonzero"]]],
    [
      "weak collections",
      "weak-collections",
      [core, ["weak_collections_probe", "nonzero"]],
    ],
    [
      "all",
      "arrays,async,collections,exceptions,functions,objects,promises,weak-collections",
      [
        core,
        ["arrays_probe", 1],
        ["async_probe", 7],
        ["collections_probe", 0],
        ["exceptions_probe", 42],
        ["functions_probe", "nonzero"],
        ["objects_probe", 42],
        ["strings_probe", "nonzero"],
        ["promises_probe", "nonzero"],
        ["weak_collections_probe", "nonzero"],
      ],
    ],
  ];

const artifact =
  "target/wasm32-unknown-unknown/release/examples/capability-size.wasm";

console.log("| Build | Wasm bytes | Gzip bytes |");
console.log("| --- | ---: | ---: |");
for (const [name, features, probes] of configurations) {
  const args = [
    "build",
    "--quiet",
    "--release",
    "--target",
    "wasm32-unknown-unknown",
    "-p",
    "microesnext",
    "--example",
    "capability-size",
    "--no-default-features",
  ];
  if (features) args.push("--features", features);
  const command = new Deno.Command("cargo", {
    args,
    stdout: "null",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) Deno.exit(result.code);
  const bytes = await Deno.readFile(artifact);
  const { instance } = await WebAssembly.instantiate(bytes);
  for (const [probe, expected] of probes) {
    const run = instance.exports[probe];
    if (typeof run !== "function") throw new Error(`${name}: missing ${probe}`);
    const actual = run();
    if (
      typeof actual !== "number" ||
      (expected === "nonzero" ? actual === 0 : actual !== expected)
    ) {
      throw new Error(
        `${name}: ${probe} returned ${actual}, expected ${expected}`,
      );
    }
  }
  const compressed = new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );
  console.log(`| ${name} | ${bytes.length} | ${compressed.length} |`);
}

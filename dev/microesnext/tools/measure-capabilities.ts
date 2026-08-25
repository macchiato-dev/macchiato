type Probe = readonly [name: string, expected: number | "nonzero"];

const core: Probe = ["core_probe", 42];
const configurations: readonly (readonly [string, string, readonly Probe[]])[] =
  [
    ["minimal", "", [core]],
    ["arrays", "arrays", [core, ["arrays_probe", 42]]],
    [
      "array iterators",
      "array-iterators",
      [core, ["arrays_probe", 42], ["iterators_probe", 11], [
        "array_iterators_probe",
        1,
      ]],
    ],
    [
      "atoms",
      "atoms",
      [core, ["atoms_probe", "nonzero"], ["strings_probe", "nonzero"]],
    ],
    ["async suspension", "async", [core, ["async_probe", 7]]],
    ["collections", "collections", [core, ["collections_probe", 0]]],
    [
      "collection iterators",
      "collection-iterators",
      [core, ["collections_probe", 0], ["iterators_probe", 11], [
        "collection_iterators_probe",
        1,
      ]],
    ],
    [
      "collection value equality",
      "collections,numbers,strings",
      [
        core,
        ["collections_probe", 0],
        ["numbers_probe", 3.25],
        ["strings_probe", "nonzero"],
        ["collection_equality_probe", 1],
      ],
    ],
    ["exceptions", "exceptions", [core, ["exceptions_probe", 42]]],
    ["functions", "functions", [core, ["functions_probe", "nonzero"]]],
    ["iterators", "iterators", [core, ["iterators_probe", 11]]],
    ["numbers", "numbers", [core, ["numbers_probe", 3.25]]],
    [
      "objects",
      "objects",
      [
        core,
        ["atoms_probe", "nonzero"],
        ["objects_probe", 42],
        ["strings_probe", "nonzero"],
      ],
    ],
    ["strings", "strings", [core, ["strings_probe", "nonzero"]]],
    ["symbols", "symbols", [core, ["symbols_probe", 1]]],
    [
      "well-known symbols",
      "well-known-symbols",
      [core, ["symbols_probe", 1], ["well_known_symbols_probe", "nonzero"]],
    ],
    ["promises", "promises", [core, ["promises_probe", "nonzero"]]],
    [
      "weak collections",
      "weak-collections",
      [core, ["weak_collections_probe", "nonzero"]],
    ],
    [
      "all",
      "array-iterators,async,collection-iterators,exceptions,functions,numbers,objects,promises,well-known-symbols,weak-collections",
      [
        core,
        ["arrays_probe", 42],
        ["array_iterators_probe", 1],
        ["atoms_probe", "nonzero"],
        ["async_probe", 7],
        ["collections_probe", 0],
        ["collection_iterators_probe", 1],
        ["collection_equality_probe", 1],
        ["exceptions_probe", 42],
        ["functions_probe", "nonzero"],
        ["iterators_probe", 11],
        ["numbers_probe", 3.25],
        ["objects_probe", 42],
        ["strings_probe", "nonzero"],
        ["symbols_probe", 1],
        ["well_known_symbols_probe", "nonzero"],
        ["promises_probe", "nonzero"],
        ["weak_collections_probe", "nonzero"],
      ],
    ],
  ];

const artifact =
  "target/wasm32-unknown-unknown/release/microesnext-capability-size.wasm";

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
    "microesnext-capability-size",
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

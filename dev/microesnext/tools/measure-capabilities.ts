const configurations = [
  ["minimal", ""],
  ["arrays", "arrays"],
  ["collections", "collections"],
  ["functions", "functions"],
  ["objects", "objects"],
  ["promises", "promises"],
  ["weak collections", "weak-collections"],
  [
    "all",
    "arrays,async,collections,functions,objects,promises,weak-collections",
  ],
] as const;

const artifact =
  "target/wasm32-unknown-unknown/release/examples/capability-size.wasm";

console.log("| Build | Wasm bytes | Gzip bytes |");
console.log("| --- | ---: | ---: |");
for (const [name, features] of configurations) {
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
  const compressed = new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );
  console.log(`| ${name} | ${bytes.length} | ${compressed.length} |`);
}

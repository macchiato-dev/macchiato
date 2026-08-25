const builds = [
  ["minimal", ""],
  ["control flow", "control-flow"],
  ["exceptions", "exceptions"],
  [
    "default language slice",
    "arrays,async-functions,control-flow,equality,exceptions,logical-operations,number-operations,objects,source-positions",
  ],
] as const;

console.log("| Compiler build | Wasm bytes | Gzip bytes |");
console.log("| --- | ---: | ---: |");
for (const [name, features] of builds) {
  const target = `target/compiler-size-${name.replaceAll(" ", "-")}`;
  const args = [
    "build",
    "--quiet",
    "--release",
    "--target",
    "wasm32-unknown-unknown",
    "--target-dir",
    target,
    "-p",
    "microesnext-compiler-size",
    "--no-default-features",
  ];
  if (features) args.push("--features", features);
  const result = await new Deno.Command("cargo", {
    args,
    stdout: "null",
    stderr: "inherit",
  }).output();
  if (!result.success) Deno.exit(result.code);

  const bytes = await Deno.readFile(
    `${target}/wasm32-unknown-unknown/release/microesnext-compiler-size.wasm`,
  );
  const { instance } = await WebAssembly.instantiate(bytes);
  const compile = instance.exports.compile_probe;
  if (typeof compile !== "function" || compile() === 0) {
    throw new Error(`${name}: linked compiler probe failed`);
  }
  const gzip = await new Response(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();
  console.log(`| ${name} | ${bytes.length} | ${gzip.byteLength} |`);
}

const builds = [
  ["minimal", ""],
  ["control flow", "control-flow"],
  ["exceptions", "exceptions"],
  ["logical operations", "logical-operations"],
  ["bounded integer operations", "integer-operations"],
  ["bounded numeric negation", "integer-negation"],
  ["JavaScript Number negation", "number-negation"],
  ["strings", "strings"],
  ["strict string concatenation", "string-operations"],
  ["locals", "locals"],
  ["basic functions", "functions"],
  ["function arguments", "function-arguments"],
  ["captured environments", "environments"],
  ["recursive named functions", "recursive-functions"],
  ["async functions", "async-functions"],
  ["recursive async functions", "recursive-async-functions"],
  [
    "default language slice",
    "arrays,async-functions,control-flow,equality,environments,exceptions,function-arguments,functions,logical-operations,number-operations,objects,receivers,recursive-async-functions,recursive-functions,source-positions",
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
  const source = features.includes("recursive-async-functions")
    ? "return async function named() { return await named(); };"
    : features.includes("async-functions")
    ? "return async function () { return await 1; };"
    : features.includes("recursive-functions")
    ? "return function named() { return named; };"
    : features.includes("environments")
    ? "let value = 1; function read() { return value; } return read();"
    : features.includes("function-arguments")
    ? "function identity(value) { return value; } return identity(1);"
    : features.includes("functions")
    ? "function value() { return 1; } return value();"
    : features.includes("exceptions")
    ? "try { throw 1; } catch (error) { return error; }"
    : features.includes("logical-operations")
    ? "return !false && true;"
    : features.includes("number-negation")
    ? "return - 0;"
    : features.includes("integer-negation")
    ? "return - 42;"
    : features.includes("integer-operations")
    ? "return 6 * 7;"
    : features.includes("control-flow")
    ? "if (true) { return 1; } else { return 2; }"
    : features.includes("string-operations")
    ? "return 'micro' + `esnext`;"
    : features.includes("strings")
    ? "return `UTF-8: café`;"
    : features.includes("locals")
    ? "let value = 1; return value;"
    : "return true;";
  const memory = instance.exports.memory;
  const pointer = instance.exports.source_pointer;
  const compile = instance.exports.compile_probe;
  if (!(memory instanceof WebAssembly.Memory) || typeof pointer !== "function") {
    throw new Error(`${name}: linked compiler source buffer is unavailable`);
  }
  const encoded = new TextEncoder().encode(source);
  new Uint8Array(memory.buffer, pointer(), encoded.length).set(encoded);
  if (typeof compile !== "function" || compile(encoded.length) === 0) {
    throw new Error(`${name}: linked compiler probe failed`);
  }
  const gzip = await new Response(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();
  console.log(`| ${name} | ${bytes.length} | ${gzip.byteLength} |`);
}

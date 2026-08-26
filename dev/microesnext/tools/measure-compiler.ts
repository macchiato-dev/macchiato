const builds = [
  ["minimal", ""],
  ["control flow", "control-flow"],
  ["conditional expressions", "conditional-expressions"],
  ["nonterminal conditionals", "nonterminal-conditionals"],
  ["nested conditionals", "nested-conditionals"],
  ["nested loops", "nested-loops"],
  ["array literals", "arrays"],
  ["array indexing", "array-indexing"],
  ["array assignment expressions", "array-assignment-expressions"],
  ["array expression values", "arrays,literal-expressions,locals"],
  ["object literals", "objects"],
  ["object expression values", "literal-expressions,locals,objects"],
  [
    "collection literal expressions",
    "arrays,literal-expressions,locals,objects",
  ],
  ["constructors", "constructors"],
  ["construction", "construction"],
  ["classes", "classes"],
  ["class methods", "class-methods"],
  ["implicit class constructors", "class-default-constructors"],
  ["static class methods", "class-static-methods"],
  ["anonymous class expressions", "class-expressions"],
  ["exceptions", "exceptions"],
  ["expression statements", "expression-statements"],
  ["logical operations", "logical-operations"],
  ["bounded integer operations", "integer-operations"],
  ["bounded numeric negation", "integer-negation"],
  ["decimal number literals", "numbers"],
  ["number division", "number-division"],
  ["number remainder", "number-remainder"],
  ["primitive Number coercion", "number-coercion"],
  ["string Number coercion", "string-number-coercion"],
  ["JavaScript Number negation", "number-negation"],
  ["strings", "strings"],
  ["strict string concatenation", "string-operations"],
  ["typeof", "typeof"],
  ["instanceof", "instanceof"],
  ["property assignment", "property-assignment"],
  ["locals", "locals"],
  ["local assignment expressions", "local-assignment-expressions"],
  ["captured assignment expressions", "captured-assignment-expressions"],
  ["property assignment expressions", "property-assignment-expressions"],
  ["basic functions", "functions"],
  ["function arguments", "function-arguments"],
  ["implicit completions", "implicit-completions"],
  ["captured environments", "environments"],
  ["recursive named functions", "recursive-functions"],
  ["recursive constructors", "recursive-constructors"],
  ["async functions", "async-functions"],
  ["recursive async functions", "recursive-async-functions"],
  [
    "default language slice",
    "array-assignment-expressions,array-indexing,arrays,async-functions,captured-assignment-expressions,class-default-constructors,class-expressions,class-methods,class-static-methods,conditional-expressions,construction,constructors,control-flow,equality,environments,exceptions,expression-statements,function-arguments,functions,implicit-completions,instanceof,literal-expressions,local-assignment-expressions,logical-operations,nested-conditionals,nested-loops,nonterminal-conditionals,number-coercion,number-division,number-negation,number-operations,number-remainder,objects,property-assignment,property-assignment-expressions,receivers,recursive-async-functions,recursive-constructors,recursive-functions,source-positions,string-number-coercion,string-operations,typeof",
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
  const source = features === "class-expressions"
    ? "let C = class { constructor(value) { this.value = value; } read() { return this.value; } }; return new C(1).read();"
    : features === "expression-statements"
    ? "1; return 42;"
    : features === "implicit-completions"
    ? ""
    : features === "captured-assignment-expressions"
    ? "let value = 1; let set = () => { return value = 2; }; return set();"
    : features === "local-assignment-expressions"
    ? "let left = 0; let right = 0; return left = right = 1;"
    : features === "property-assignment-expressions"
    ? "let object = {}; return object.value = 1;"
    : features === "nested-conditionals"
    ? "if (true) { if (false) {} else {} } else {} return 42;"
    : features === "nested-loops"
    ? "while (false) { if (true) { while (false) {} } else {} } return 42;"
    : features === "nonterminal-conditionals"
    ? "if (true) {} else {} return 42;"
    : features === "conditional-expressions"
    ? "return true ? 1 : 2;"
    : features === "array-indexing"
    ? "return [7, 42][1];"
    : features === "array-assignment-expressions"
    ? "let values = [0]; return values[0] = 42;"
    : features === "arrays,literal-expressions,locals"
    ? "let value = 1; return [value];"
    : features === "literal-expressions,locals,objects"
    ? "let value = 1; return { value: value };"
    : features.includes("literal-expressions") && !features.includes("class-expressions")
    ? "let value = 1; return { items: [value] };"
    : features === "arrays"
    ? "return [1, 2];"
    : features === "objects"
    ? "return { value: 1 };"
    : features === "class-static-methods"
    ? "class C { constructor() {} static read(value) { return value; } } return C.read(1);"
    : features === "class-default-constructors"
    ? "class Empty {} return new Empty();"
    : features === "class-methods"
    ? "class C { constructor(value) { this.value = value; } read() { return this.value; } } return new C(1).read();"
    : features === "classes"
    ? "class C { constructor(value) { this.value = value; } } return new C(1).value;"
    : features.includes("recursive-async-functions")
    ? "return async function named() { return await named(); };"
    : features.includes("async-functions")
    ? "return async function () { return await 1; };"
    : features.includes("recursive-constructors")
    ? "return function Named() { return Named; };"
    : features.includes("recursive-functions")
    ? "return function named() { return named; };"
    : features.includes("environments")
    ? "let value = 1; function read() { return value; } return read();"
    : features.includes("construction")
    ? "let C = function () { return this; }; return new C();"
    : features.includes("function-arguments")
    ? "function identity(value) { return value; } return identity(1);"
    : features.includes("property-assignment")
    ? "let value = {}; value.answer = 42; return value.answer;"
    : features.includes("functions")
    ? "function value() { return 1; } return value();"
    : features.includes("constructors")
    ? "return function () { return true; };"
    : features.includes("exceptions")
    ? "try { throw 1; } catch (error) { return error; }"
    : features.includes("logical-operations")
    ? "return !false && true;"
    : features.includes("number-negation")
    ? "return - 0;"
    : features.includes("string-number-coercion")
    ? "return +' 42 ';"
    : features.includes("number-coercion")
    ? "return +true;"
    : features.includes("integer-negation")
    ? "return - 42;"
    : features === "numbers"
    ? "return 1.25;"
    : features === "number-division"
    ? "return 7 / 2;"
    : features === "number-remainder"
    ? "return 7 % 2;"
    : features.includes("integer-operations")
    ? "return 6 * 7;"
    : features.includes("control-flow")
    ? "if (true) { return 1; } else { return 2; }"
    : features.includes("string-operations")
    ? "return 'micro' + `esnext`;"
    : features === "typeof"
    ? "return typeof true;"
    : features === "instanceof"
    ? "return null instanceof true;"
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

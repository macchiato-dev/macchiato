// Extract the two regexp regions from the pinned MicroQuickJS source. The
// output is translation input, not maintained source.

const [sourcePath, outputDirectory] = Deno.args;
if (!sourcePath || !outputDirectory) {
  console.error("usage: deno run --allow-read=<source> --allow-write=<output> " +
    "tools/extract-reference.js <mquickjs.c> <output-directory>");
  Deno.exit(2);
}

const source = await Deno.readTextFile(sourcePath);

function region(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`MicroQuickJS regexp marker changed: ${startMarker}`);
  }
  return source.slice(start, end);
}

const compiler = region("/* regexp */", "/* regexp interpreter */");
const executor = region("/* regexp interpreter */", "/* regexp js interface */");

await Deno.mkdir(outputDirectory, { recursive: true });
await Promise.all([
  Deno.writeTextFile(`${outputDirectory}/regexp-compiler.c`, compiler),
  Deno.writeTextFile(`${outputDirectory}/regexp-executor.c`, executor),
]);

console.log(`compiler: ${compiler.split("\n").length} lines`);
console.log(`executor: ${executor.split("\n").length} lines`);


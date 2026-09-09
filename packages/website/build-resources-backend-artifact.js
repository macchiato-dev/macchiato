import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipResourceBundle } from "../wasm-web-container/src/resource-bundle.js";

const here = dirname(fileURLToPath(import.meta.url));
const generated = join(here, "generated");
const files = new Map();

files.set("runtime.wasm", new Uint8Array(await readFile(join(generated,
  "microquickjs-server.wasm"))));
files.set("application-runtime.wasm", new Uint8Array(await readFile(join(generated,
  "resources-application-machine/quickjs-server.wasm"))));
files.set("resources-application/application.bin", new Uint8Array(await readFile(join(generated,
  "resources-application-machine/application.bin"))));
files.set("resources-policy/application.bin", new Uint8Array(await readFile(join(generated,
  "resources-policy-machine/application.bin"))));

for (const name of ["resources-server", "resources-document"]) {
  const directory = join(generated, `${name}-bytecode`);
  for (const entry of await readdir(directory)) {
    files.set(`${name}/${entry}`, new Uint8Array(await readFile(join(directory, entry))));
  }
}

const output = join(generated, "resources-backend.bin");
await writeFile(output, await gzipResourceBundle(files));
console.log(`${basename(output)}: ${files.size} resources`);

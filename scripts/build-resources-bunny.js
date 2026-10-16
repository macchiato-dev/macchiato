// Builds a self-contained Resources.co Bunny deployment directory:
//
//   <out>/release/      verified Edge script and revisioned Storage objects
//   <out>/bunny-deploy  compiled deploy client (deploy/bunny/deploy.js)
//   <out>/Containerfile narrow image holding only those two things
//
// Usage: deno run -A scripts/build-resources-bunny.js [out-directory]
//
// No deployment credential is read here. See deploy/bunny/README.md for the
// key-bearing step.

import { EDGE_ENTRY, sha256, storagePrefix, verifyInventory, writeInventory } from "../deploy/bunny/inventory.js";

const repo = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const website = `${repo}/packages/website`;
const out = Deno.args[0] ?? `${repo}/dist/resources-bunny`;
const release = `${out}/release`;
const REVISION_MARKER = "__MACCHIATO_GIT_REVISION__";
const GENERATED_MARKER = "// @ts-nocheck -- generated JavaScript bundle\n";
// Regional Storage API hosts; the zone's own hostname must be one of these.
const STORAGE_HOSTS = ["", "uk.", "ny.", "la.", "sg.", "se.", "br.", "jh.", "syd."]
  .map((region) => `${region}storage.bunnycdn.com`);

async function run(command, ...args) {
  const { code } = await new Deno.Command(command, { args, cwd: repo, stdout: "inherit", stderr: "inherit" }).output();
  if (code !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${code}`);
}

async function output(command, ...args) {
  const result = await new Deno.Command(command, { args, cwd: repo, stderr: "inherit" }).output();
  if (result.code !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${result.code}`);
  return new TextDecoder().decode(result.stdout).trim();
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Structural properties of this particular application that the generic
// inventory cannot know about.
async function checkRelease(deployment) {
  const site = `site/${storagePrefix(deployment.revision)}`;
  const files = new Map(deployment.files.map((file) => [file.path, file]));
  const text = (path) => Deno.readTextFile(`${release}/${path}`);

  const machines = [...files.keys()].filter((path) => path.startsWith(`${site}/machines/`));
  check(machines.length === 1 && machines[0] === `${site}/machines/backend.bin`,
    "Backend runtime and bytecode must be stored in one private artifact");
  check(!(await text(`${site}/manifest.json`)).includes("backend.bin"),
    "The private backend machine entered the public manifest");

  check(files.has(`${site}/-/resources-site/machine.js`) &&
    (await text(`${site}/-/resources-site/controller.js`)).includes('from "./machine.js"'),
    "Browser controller/machine split is missing");

  for (const path of files.keys()) {
    if (!/\/-\/resources-site\/[^/]+\.(wasm|bin|js)\.gz$/.test(path)) continue;
    const original = files.get(path.slice(0, -3));
    const decoded = await gunzip(await Deno.readFile(`${release}/${path}`));
    check(original && decoded.length === original.bytes && await sha256(decoded) === original.sha256,
      `Compressed variant differs from its source: ${path}`);
  }

  const edge = await text(EDGE_ENTRY);
  check(edge.startsWith(GENERATED_MARKER), "Edge entry is not marked as generated JavaScript");
  check(edge.includes(storagePrefix(deployment.revision)) && !edge.includes(REVISION_MARKER),
    "Edge entry does not contain its revisioned Storage prefix");
  check(edge.includes("machines/backend.bin") && edge.includes("DecompressionStream") &&
    edge.includes("WebAssembly.compile") && !edge.includes("H4sIAAAAA"),
    "Edge entry does not load the private backend artifact");
}

async function buildEdgeScript(revision) {
  const entry = `${release}/${EDGE_ENTRY}`;
  await run("deno", "bundle", "--config", `${website}/deno.json`, "--platform", "deno", "--minify",
    `${website}/backend/controller.ts`, "--output", entry);
  const bundle = await Deno.readTextFile(entry);
  check(bundle.includes(REVISION_MARKER), "Edge bundle is missing its Storage revision marker");
  await Deno.writeTextFile(entry, GENERATED_MARKER + bundle.replaceAll(REVISION_MARKER, revision));
}

async function buildDeployClient() {
  await run("deno", "compile", "--no-config", "--quiet",
    "--allow-read=/release",
    "--allow-env=BUNNY_API_KEY,BUNNY_STORAGE_ZONE_ID,BUNNY_EDGE_SCRIPT_ID",
    `--allow-net=api.bunny.net,${STORAGE_HOSTS.join(",")}`,
    "--output", `${out}/bunny-deploy`, `${repo}/deploy/bunny/deploy.js`);
  await Deno.copyFile(`${repo}/deploy/bunny/Containerfile`, `${out}/Containerfile`);
}

const revision = await output("git", "rev-parse", "--short=7", "HEAD");
const site = `${release}/site/${storagePrefix(revision)}`;
await Deno.remove(out, { recursive: true }).catch((error) => {
  if (!(error instanceof Deno.errors.NotFound)) throw error;
});
await Deno.mkdir(`${site}/machines`, { recursive: true });
await Deno.mkdir(`${release}/edge`, { recursive: true });

for (const example of ["vtv", "markdown-editor"]) {
  await run("npm", "ci", "--prefix", `${website}/blog-examples/${example}`);
  await run("npm", "run", "build", "--prefix", `${website}/blog-examples/${example}`);
}
// The controller and its child guests share a protocol. Rebuild them together;
// checked-in artifacts may predate a change to the workspace handoff.
for (const builder of ["build-project-editor", "build-resources-frontend",
  "build-resources-server", "build-resources-backend-artifact"]) {
  await run("node", `${website}/${builder}.js`);
}
await run("node", `${website}/export-static.js`, "--out", site);
await Deno.copyFile(`${website}/generated/resources-backend.bin`, `${site}/machines/backend.bin`);
await buildEdgeScript(revision);

await writeInventory(release, revision);
const deployment = await verifyInventory(release);
await checkRelease(deployment);
await buildDeployClient();

console.log(`Built ${deployment.files.length} release files for ${revision} in ${out}`);
console.log("Next: deploy/bunny/README.md");

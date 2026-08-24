import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] || "dist/resources-bunny");
const deployment = JSON.parse(readFileSync(join(root, "deployment.json"), "utf8"));
if (deployment.format !== "resources-bunny-deployment-v2" ||
    !/^[0-9a-f]{7}$/.test(deployment.revision || "")) {
  throw new Error("Resources Bunny deployment metadata is invalid");
}

const actual = [];
function visit(directory) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) visit(path);
    else if (relative(root, path) !== "deployment.json") actual.push(path);
  }
}
visit(root);

const expected = new Map(deployment.files.map(file => [file.path, file]));
if (expected.size !== deployment.files.length || actual.length !== expected.size) {
  throw new Error("Resources Bunny deployment file inventory does not match");
}
for (const path of actual) {
  const name = relative(root, path).replaceAll("\\", "/");
  const record = expected.get(name);
  if (!record) throw new Error(`Unlisted deployment file: ${name}`);
  const bytes = readFileSync(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (record.bytes !== bytes.length || record.sha256 !== sha256) {
    throw new Error(`Deployment digest mismatch: ${name}`);
  }
}

const prefix = deployment.storagePrefix.replace(/^site\//, "").replace(/\/$/, "");
const publicManifest = JSON.parse(readFileSync(join(root, "site", prefix, "manifest.json"), "utf8"));
const publicManifestText = JSON.stringify(publicManifest);
const machinePrefix = `site/${prefix}/machines/`;
const machinePaths = [...expected.keys()].filter(path => path.startsWith(machinePrefix));
if (machinePaths.some(path => path === `${machinePrefix}microquickjs-server.wasm` ||
    path.startsWith(`${machinePrefix}resources-server/`)) ||
    !machinePaths.some(path => path.startsWith(`${machinePrefix}resources-project-version/`))) {
  throw new Error("Only deferred project-version bytecode should be stored separately");
}
for (const path of machinePaths) {
  const name = path.slice(machinePrefix.length);
  if (publicManifestText.includes(name) || publicManifestText.includes(path)) {
    throw new Error(`Private machine entered the public manifest: ${name}`);
  }
}
const browserControllerPath = join(root, "site", prefix, "-", "resources-site", "controller.js");
const browserMachinePath = join(root, "site", prefix, "-", "resources-site", "machine.js");
if (!expected.has(`site/${prefix}/-/resources-site/controller.js`) ||
    !expected.has(`site/${prefix}/-/resources-site/machine.js`)) {
  throw new Error("Browser controller/machine split is missing");
}
if (!readFileSync(browserControllerPath, "utf8").includes('from "./machine.js"')) {
  throw new Error("Browser controller does not import its prebuilt machine");
}

const edge = readFileSync(join(root, deployment.edgeEntry), "utf8");
if (!edge.includes(`resources-co-${deployment.revision}`)) {
  throw new Error("Edge entry does not contain its revisioned Storage prefix");
}
if (!edge.includes("H4sI") || !edge.includes("DecompressionStream") ||
    !edge.includes("compileStreaming")) {
  throw new Error("Edge entry does not embed and stream the compressed server machine");
}
if ([...expected.keys()].some(path => path.startsWith("edge/backend/"))) {
  throw new Error("Bunny deployment contains obsolete multi-file backend artifacts");
}
console.log(`Verified ${actual.length} Resources Bunny files for ${deployment.revision}.`);

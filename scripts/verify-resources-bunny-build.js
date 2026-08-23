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
const machineNames = ["resources-server-microquickjs.wasm",
  "resources-project-version-microquickjs.wasm"];
const publicManifest = JSON.parse(readFileSync(join(root, "site", prefix, "manifest.json"), "utf8"));
const publicManifestText = JSON.stringify(publicManifest);
for (const name of machineNames) {
  const path = `site/${prefix}/machines/${name}`;
  if (!expected.has(path)) throw new Error(`Private machine is missing: ${name}`);
  if (publicManifestText.includes(name)) {
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
if (!edge.includes("resources-server-microquickjs.wasm")) {
  throw new Error("Edge entry does not load the server MicroQuickJS machine");
}
const backendController = readFileSync(join(root, "edge/backend/controller.ts"), "utf8");
const backendControllerJavaScript = readFileSync(join(root, "edge/backend/controller.js"), "utf8");
const backendMachine = readFileSync(join(root, "edge/backend/machine.js"), "utf8");
if (!backendController.includes('from "./machine.js"')) {
  throw new Error("Backend controller does not import its prebuilt machine");
}
if (backendControllerJavaScript !== backendController) {
  throw new Error("Backend controller TypeScript and JavaScript artifacts differ");
}
if (!backendMachine.includes(`resources-co-${deployment.revision}`) ||
    backendMachine.includes("__MACCHIATO_GIT_REVISION__")) {
  throw new Error("Prebuilt backend machine does not contain its deployment revision");
}
console.log(`Verified ${actual.length} Resources Bunny files for ${deployment.revision}.`);

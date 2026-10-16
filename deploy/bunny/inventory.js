// The deployment inventory is shared by the build, which writes it, and the
// key-bearing deploy client, which refuses to upload anything it does not
// match. It deliberately uses only Deno and Web APIs so the client can be
// compiled into a single binary.

export const FORMAT = "resources-bunny-deployment-v3";
export const EDGE_ENTRY = "edge/script.ts";
const INVENTORY = "deployment.json";
const REVISION = /^[0-9a-f]{7}$/;

export function storagePrefix(revision) {
  return `resources-co-${revision}`;
}

export async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function listFiles(root, directory = "") {
  const files = [];
  const entries = [];
  for await (const entry of Deno.readDir(`${root}/${directory}`)) entries.push(entry);
  entries.sort((left, right) => left.name < right.name ? -1 : 1);
  for (const entry of entries) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory) files.push(...await listFiles(root, path));
    else if (entry.isFile && path !== INVENTORY) files.push(path);
    else if (!entry.isFile) throw new Error(`Unexpected non-file in release: ${path}`);
  }
  return files;
}

export async function writeInventory(root, revision) {
  if (!REVISION.test(revision)) throw new Error(`Invalid revision: ${revision}`);
  const files = [];
  for (const path of await listFiles(root)) {
    const bytes = await Deno.readFile(`${root}/${path}`);
    files.push({ path, bytes: bytes.length, sha256: await sha256(bytes) });
  }
  const deployment = { format: FORMAT, revision, edgeEntry: EDGE_ENTRY, files };
  await Deno.writeTextFile(`${root}/${INVENTORY}`, `${JSON.stringify(deployment, null, 2)}\n`);
  return deployment;
}

// Returns the parsed inventory only when every file on disk is listed and
// every listed file has the recorded size and digest.
export async function verifyInventory(root) {
  const deployment = JSON.parse(await Deno.readTextFile(`${root}/${INVENTORY}`));
  if (deployment.format !== FORMAT || !REVISION.test(deployment.revision) ||
      deployment.edgeEntry !== EDGE_ENTRY || !Array.isArray(deployment.files)) {
    throw new Error("Release inventory is invalid");
  }
  const actual = await listFiles(root);
  const expected = new Map(deployment.files.map((file) => [file.path, file]));
  if (expected.size !== deployment.files.length || actual.length !== expected.size) {
    throw new Error("Release file inventory does not match");
  }
  const prefix = `site/${storagePrefix(deployment.revision)}/`;
  for (const path of actual) {
    const record = expected.get(path);
    if (!record) throw new Error(`Unlisted release file: ${path}`);
    if (path !== EDGE_ENTRY && !path.startsWith(prefix)) {
      throw new Error(`Release file outside its revisioned prefix: ${path}`);
    }
    const bytes = await Deno.readFile(`${root}/${path}`);
    if (record.bytes !== bytes.length || record.sha256 !== await sha256(bytes)) {
      throw new Error(`Release digest mismatch: ${path}`);
    }
  }
  return deployment;
}

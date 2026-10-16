// Deploys one verified Resources.co release to Bunny. This is the only program
// that receives BUNNY_API_KEY. It is compiled into the deployment image, which
// also contains the release, so nothing is built here.
//
//   BUNNY_API_KEY          account API key (secret)
//   BUNNY_STORAGE_ZONE_ID  Storage zone that holds revisioned site objects
//   BUNNY_EDGE_SCRIPT_ID   Edge Script that serves them
//
// Usage: bunny-deploy [--dry-run] [release-directory]

import { EDGE_ENTRY, storagePrefix, verifyInventory } from "./inventory.js";

const API = "https://api.bunny.net";
const UPLOAD_CONCURRENCY = 8;

function numericId(name, value) {
  if (!/^[1-9][0-9]*$/.test(value ?? "")) throw new Error(`${name} must be a numeric Bunny ID`);
  return value;
}

function bunnyClient(apiKey, fetchImpl) {
  return async function bunny(method, path, body) {
    const response = await fetchImpl(`${API}${path}`, {
      method,
      redirect: "error",
      headers: { AccessKey: apiKey, accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Bunny API ${method} ${path} failed: ${response.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };
}

// The Storage zone password is read from the account API rather than passed as
// a second secret. It stays in memory for the duration of the upload.
async function storageZone(bunny, id) {
  const zone = await bunny("GET", `/storagezone/${id}`);
  if (!zone?.Name || !zone?.Password || !zone?.StorageHostname) {
    throw new Error(`Storage zone ${id} response lacks a name, hostname, or password`);
  }
  return { origin: `https://${zone.StorageHostname}/${zone.Name}`, password: zone.Password };
}

// A script variable naming a different zone means this release would upload
// to one place and be served from another.
function checkScriptStorage(script, zone) {
  const configured = script?.EdgeScriptVariables?.find((variable) =>
    variable.Name === "BUNNY_STORAGE_ORIGIN" || variable.Name === "BUNNY_ORIGIN");
  const value = String(configured?.DefaultValue ?? "").replace(/\/+$/, "");
  if (value && value !== zone.origin) {
    throw new Error(`Edge Script ${configured.Name} is ${value}, but the Storage zone is ${zone.origin}`);
  }
}

async function upload(root, zone, file, fetchImpl) {
  const key = file.path.slice("site/".length).split("/").map(encodeURIComponent).join("/");
  const response = await fetchImpl(`${zone.origin}/${key}`, {
    method: "PUT",
    redirect: "error",
    headers: { AccessKey: zone.password, "content-type": "application/octet-stream",
      Checksum: file.sha256.toUpperCase() },
    body: await Deno.readFile(`${root}/${file.path}`),
  });
  await response.body?.cancel();
  if (!response.ok) throw new Error(`Storage upload failed for ${key}: ${response.status}`);
}

async function uploadAll(root, zone, files, fetchImpl, log) {
  const queue = [...files];
  let done = 0;
  await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      await upload(root, zone, file, fetchImpl);
      if (++done % 50 === 0) log(`  ${done}/${files.length}`);
    }
  }));
}

export async function deploy({ root, env = {}, dryRun = false, fetchImpl = fetch, log = console.log }) {
  const deployment = await verifyInventory(root);
  const manifestPath = `site/${storagePrefix(deployment.revision)}/manifest.json`;
  const objects = deployment.files.filter((file) => file.path.startsWith("site/") && file.path !== manifestPath);
  const manifest = deployment.files.find((file) => file.path === manifestPath);
  if (!manifest) throw new Error(`Release lacks ${manifestPath}`);
  log(`Verified release ${deployment.revision}: ${objects.length + 1} Storage objects and ${EDGE_ENTRY}.`);
  if (dryRun) return deployment;

  if (!env.BUNNY_API_KEY) throw new Error("BUNNY_API_KEY is required");
  const zoneId = numericId("BUNNY_STORAGE_ZONE_ID", env.BUNNY_STORAGE_ZONE_ID);
  const scriptId = numericId("BUNNY_EDGE_SCRIPT_ID", env.BUNNY_EDGE_SCRIPT_ID);
  const bunny = bunnyClient(env.BUNNY_API_KEY, fetchImpl);

  const [zone, script] = await Promise.all([
    storageZone(bunny, zoneId),
    bunny("GET", `/compute/script/${scriptId}`),
  ]);
  checkScriptStorage(script, zone);
  log(`Uploading to ${zone.origin}/${storagePrefix(deployment.revision)}/ for Edge Script ${script.Name}.`);

  // The manifest is publication authority, so it goes up only after every
  // object it names; the script switches revision only after both.
  await uploadAll(root, zone, objects, fetchImpl, log);
  await upload(root, zone, manifest, fetchImpl);
  const code = await Deno.readTextFile(`${root}/${EDGE_ENTRY}`);
  await bunny("POST", `/compute/script/${scriptId}/code`, { Code: code });
  await bunny("POST", `/compute/script/${scriptId}/publish`, { Note: `resources.co ${deployment.revision}` });
  log(`Published ${deployment.revision} to Edge Script ${script.Name}.`);
  return deployment;
}

if (import.meta.main) {
  const args = Deno.args;
  try {
    await deploy({
      root: args.find((arg) => !arg.startsWith("--")) ?? "/release",
      dryRun: args.includes("--dry-run"),
      env: Object.fromEntries(["BUNNY_API_KEY", "BUNNY_STORAGE_ZONE_ID", "BUNNY_EDGE_SCRIPT_ID"]
        .map((name) => [name, Deno.env.get(name)])),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}

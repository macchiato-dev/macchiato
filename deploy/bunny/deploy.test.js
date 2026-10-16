// deno test --allow-read --allow-write deploy/bunny/deploy.test.js
import { deploy } from "./deploy.js";
import { writeInventory } from "./inventory.js";

const scratch = new URL("../../dist/test/", import.meta.url).pathname;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rejects(promise, pattern) {
  try {
    await promise;
  } catch (error) {
    assert(pattern.test(error.message), `Unexpected error: ${error.message}`);
    return;
  }
  throw new Error(`Expected rejection matching ${pattern}`);
}

async function fakeRelease() {
  await Deno.mkdir(scratch, { recursive: true });
  const root = await Deno.makeTempDir({ dir: scratch, prefix: "bunny-release-" });
  const site = `${root}/site/resources-co-abc1234`;
  await Deno.mkdir(`${site}/machines`, { recursive: true });
  await Deno.mkdir(`${root}/edge`);
  await Deno.writeTextFile(`${site}/manifest.json`, "{}");
  await Deno.writeTextFile(`${site}/index.html`, "<p>home</p>");
  await Deno.writeTextFile(`${site}/machines/backend.bin`, "machine");
  await Deno.writeTextFile(`${root}/edge/script.ts`, "export {};");
  await writeInventory(root, "abc1234");
  return root;
}

function fakeBunny({ storageOrigin = "https://ny.storage.bunnycdn.com/zone" } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ method: init.method, url: String(url), headers: init.headers,
      body: typeof init.body === "string" ? JSON.parse(init.body) : null });
    if (url === "https://api.bunny.net/storagezone/11") {
      return Response.json({ Name: "zone", Password: "upload-password", StorageHostname: "ny.storage.bunnycdn.com" });
    }
    if (url === "https://api.bunny.net/compute/script/22" && init.method === "GET") {
      return Response.json({ Name: "resources", EdgeScriptVariables: [{ Name: "BUNNY_STORAGE_ORIGIN", DefaultValue: storageOrigin }] });
    }
    return new Response(null, { status: init.method === "PUT" ? 201 : 204 });
  };
  return { calls, fetchImpl };
}

const env = { BUNNY_API_KEY: "api-key", BUNNY_STORAGE_ZONE_ID: "11", BUNNY_EDGE_SCRIPT_ID: "22" };
const log = () => {};

Deno.test("uploads objects, then the manifest, then publishes the script", async () => {
  const root = await fakeRelease();
  try {
    const { calls, fetchImpl } = fakeBunny();
    await deploy({ root, env, fetchImpl, log });
    const puts = calls.filter((call) => call.method === "PUT");
    assert(puts.length === 3, "Every Storage object is uploaded once");
    assert(puts.at(-1).url === "https://ny.storage.bunnycdn.com/zone/resources-co-abc1234/manifest.json",
      "The manifest is uploaded last");
    assert(puts.every((call) => call.headers.AccessKey === "upload-password" && /^[0-9A-F]{64}$/.test(call.headers.Checksum)),
      "Uploads use the zone password and an uppercase SHA-256 checksum");
    const [code, publish] = calls.slice(-2);
    assert(code.url.endsWith("/compute/script/22/code") && code.body.Code === "export {};", "Code is set");
    assert(publish.url.endsWith("/compute/script/22/publish") && publish.body.Note.includes("abc1234"), "Release is published");
    assert(calls.filter((call) => call.url.startsWith("https://api.bunny.net")).every((call) => call.headers.AccessKey === "api-key"),
      "Account API calls use the API key");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("refuses a tampered or unlisted release before any request", async () => {
  const root = await fakeRelease();
  try {
    const { calls, fetchImpl } = fakeBunny();
    await Deno.writeTextFile(`${root}/site/resources-co-abc1234/index.html`, "<p>changed</p>");
    await rejects(deploy({ root, env, fetchImpl, log }), /digest mismatch/);
    await writeInventory(root, "abc1234");
    await Deno.writeTextFile(`${root}/site/resources-co-abc1234/extra.html`, "");
    await rejects(deploy({ root, env, fetchImpl, log }), /inventory does not match/);
    assert(calls.length === 0, "No request is made");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("refuses a script that serves a different Storage zone", async () => {
  const root = await fakeRelease();
  try {
    const { calls, fetchImpl } = fakeBunny({ storageOrigin: "https://storage.bunnycdn.com/other" });
    await rejects(deploy({ root, env, fetchImpl, log }), /Storage zone is/);
    assert(!calls.some((call) => call.method !== "GET"), "Nothing is uploaded or published");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("dry run needs no key or network", async () => {
  const root = await fakeRelease();
  try {
    const { calls, fetchImpl } = fakeBunny();
    const deployment = await deploy({ root, dryRun: true, fetchImpl, log });
    assert(deployment.revision === "abc1234" && calls.length === 0, "Dry run only verifies");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

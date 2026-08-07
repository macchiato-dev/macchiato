import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("publishes distinct host, modern guest, and MicroQuickJS guest artifacts", async () => {
  const [host, modernGuest, microGuest] = await Promise.all([
    readFile(new URL("../lib/host.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/guest-runtime.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/guest-runtime-microquickjs.js", import.meta.url), "utf8"),
  ]);

  assert.match(host, /DomUseHostCapability/);
  assert.match(host, /StyleUse/);
  assert.match(modernGuest, /__macchiatoBoot/);
  assert.match(microGuest, /function SmallMap/);
  assert.doesNotMatch(microGuest, /\b(?:const|let|class)\s/);
  assert.notEqual(modernGuest, microGuest);
});

import assert from "node:assert/strict";
import test from "node:test";
import { resourcesEdgePreviewHandler } from "../../../examples/resources-site/preview-handler.js";

test("local edge adapter serves the Bunny profile from memory", async () => {
  const home = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/"));
  const text = await home.text();
  assert.equal(home.status, 200);
  assert.match(text, /Resources\.co/);
  assert.match(text, /--accent: #30d5c8/);
  assert.match(text, /Edge safe/);
  assert.match(home.headers.get("content-security-policy"), /script-src 'none'/);
  assert.doesNotMatch(text, /type="module"|type="importmap"/);

  const project = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/macchiato/app"));
  assert.equal(project.status, 200);
  assert.match(await project.text(), /<h1>App<\/h1>/);
  assert.equal((await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/private.txt"))).status, 404);
  const login = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/login"));
  assert.equal(login.status, 200);
  const loginHtml = await login.text();
  assert.match(loginHtml, /Continue with GitHub/);
  assert.match(loginHtml, /Continue with GitLab/);
});

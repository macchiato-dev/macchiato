import assert from "node:assert/strict";
import test from "node:test";
import { createResourcesDocumentPlanner } from "../resources-document-plan.js";

function planner() {
  const lookups = [];
  return {
    lookups,
    plan: createResourcesDocumentPlanner({
      accounts: {}, organizations: {},
      content: {
        async getProject(namespace, name) { lookups.push(["project", namespace, name]); return null; },
        async getNamespace(name) { lookups.push(["namespace", name]); return null; },
      },
    }),
  };
}

test("non-name paths proceed to static lookup without calling namespace validation", async () => {
  const { lookups, plan } = planner();
  for (const pathname of ["/favicon.ico", "/private.txt", "/bad_name", "/-name",
    "/name-", "/bad--name", "/bad%20name", "/%ZZ", "/owner/file.js",
    "/bad_name/project", "/owner/bad--name/embed", `/${"a".repeat(64)}`,
    `/owner/${"b".repeat(64)}`, "/owner/%E0%A4%A"]) {
    const result = await plan({ pathname, staticShellExists: false });
    assert.equal(result.kind, "static", pathname);
    assert.equal(result.shellPath, pathname);
    assert.equal(result.requestedProject, null);
  }
  assert.deepEqual(lookups, []);
});

test("dynamic names retain case-insensitive lookup and embedded project routes", async () => {
  const { lookups, plan } = planner();
  await plan({ pathname: "/Owner", staticShellExists: false });
  await plan({ pathname: "/Owner/my-project", staticShellExists: false });
  const embedded = await plan({ pathname: "/Owner/my-project/embed", staticShellExists: false });
  assert.deepEqual(embedded.requestedProject, { namespace: "Owner", slug: "my-project", embed: true });
  await plan({ pathname: "/%6fwner/project-2", staticShellExists: false });
  await plan({ pathname: "/about", staticShellExists: true });
  assert.deepEqual(lookups, [
    ["namespace", "Owner"], ["project", "Owner", "my-project"],
    ["project", "Owner", "my-project"], ["project", "owner", "project-2"],
  ]);
});

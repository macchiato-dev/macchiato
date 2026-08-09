import assert from "node:assert/strict";
import test from "node:test";
import { composeResourcesAuthDomSchema, renderResourcesAuthBlock, RESOURCES_AUTH, resourcesAuthRoute } from "../../../packages/website/components/auth.js";
import { resourcesDomSchema } from "../../../packages/website/seed.js";

test("Resources auth declaration supports simulated and document-runtime provider adapters", () => {
  assert.equal(RESOURCES_AUTH.mode, "simulated-provider-adapter");
  assert.deepEqual(RESOURCES_AUTH.providers.map(({ key }) => key), ["github", "gitlab", "google", "apple"]);
  assert.equal(resourcesAuthRoute("login").title, "Log in - Resources.co");
  assert.equal(resourcesAuthRoute("signup").blocks[0].mode, "signup");
  assert.match(renderResourcesAuthBlock("signup"), /Create your account/);
  assert.match(renderResourcesAuthBlock("login"), /provider authorization is simulated/);
  const edgeHtml = renderResourcesAuthBlock("login", { documentRuntime: true });
  assert.match(edgeHtml, /href="\/auth\/github\/start"/);
  assert.match(edgeHtml, /href="\/auth\/gitlab\/start"/);
  assert.match(edgeHtml, /auth-provider__mark--github"><svg/);
  assert.match(edgeHtml, /auth-provider__mark--gitlab"><svg/);
  assert.equal(resourcesDomSchema().nodes.path.attrs.includes("fill"), true);
  assert.doesNotMatch(edgeHtml, /Continue with Google|Continue with Apple|Soon/);
  assert.match(
    renderResourcesAuthBlock("login", { documentRuntime: true, showUnavailableProviders: true }),
    /auth-provider--disabled[\s\S]*Continue with Google[\s\S]*Soon/,
  );
});

test("Resources auth declaration composes its auth card into dom-use", () => {
  const base = { definitions: { "content-root": { children: [{ oneOf: ["$content-block"] }] } } };
  const schema = composeResourcesAuthDomSchema(base);
  assert.equal(schema.definitions["auth-card"].element, "section.box.block.auth-card");
  assert.equal(schema.definitions["content-root"].children[0].oneOf.includes("$auth-card"), true);
  assert.equal(resourcesDomSchema().definitions["auth-card"].children.includes("button"), false);
});

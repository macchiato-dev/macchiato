import assert from "node:assert/strict";
import test from "node:test";
import { composeResourcesAuthDomSchema, renderResourcesAuthBlock, RESOURCES_AUTH, resourcesAuthRoute } from "../../../examples/resources-site/components/auth.js";
import { resourcesDomSchema } from "../../../examples/resources-site/seed.js";

test("Resources auth declaration separates simulated providers from future server adapters", () => {
  assert.equal(RESOURCES_AUTH.mode, "simulated-provider-adapter");
  assert.deepEqual(RESOURCES_AUTH.providers.map(({ key }) => key), ["github", "gitlab", "google", "apple"]);
  assert.equal(resourcesAuthRoute("login").title, "Log in - Resources.co");
  assert.equal(resourcesAuthRoute("signup").blocks[0].mode, "signup");
  assert.match(renderResourcesAuthBlock("signup"), /Create your account/);
  assert.match(renderResourcesAuthBlock("login"), /no account is created/);
});

test("Resources auth declaration composes its auth card into dom-use", () => {
  const base = { definitions: { "content-root": { children: [{ oneOf: ["$content-block"] }] } } };
  const schema = composeResourcesAuthDomSchema(base);
  assert.equal(schema.definitions["auth-card"].element, "section.box.block.auth-card");
  assert.equal(schema.definitions["content-root"].children[0].oneOf.includes("$auth-card"), true);
  assert.equal(resourcesDomSchema().definitions["auth-card"].children.includes("button"), false);
});

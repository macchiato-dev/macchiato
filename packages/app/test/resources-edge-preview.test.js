import assert from "node:assert/strict";
import test from "node:test";
import { resourcesEdgePreviewHandler } from "../../../examples/resources-site/preview-handler.js";

test("local edge adapter serves the Bunny profile from memory", async () => {
  const app = { environment: {} };
  const home = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/"), app);
  const text = await home.text();
  assert.equal(home.status, 200);
  assert.match(text, /Resources\.co/);
  assert.match(text, /--accent: #30d5c8/);
  assert.match(text, /Log in/);
  assert.match(text, /Sign up/);
  assert.doesNotMatch(text, /Edge safe/);
  assert.match(home.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(text, /type="module".*command-palette-use\/client\.js/);

  const project = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/macchiato/app"), app);
  assert.equal(project.status, 200);
  assert.match(await project.text(), /<h1>App<\/h1>/);
  assert.equal((await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/private.txt"))).status, 404);
  const login = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/login"), app);
  assert.equal(login.status, 200);
  const loginHtml = await login.text();
  assert.match(loginHtml, /<main class="layout document-runtime auth-layout"/);
  assert.match(loginHtml, /class="box block auth-card"/);
  assert.match(loginHtml, /Log in to Resources\.co/);
  assert.match(loginHtml, /Continue with GitHub/);
  assert.match(loginHtml, /Continue with GitLab/);
  assert.doesNotMatch(loginHtml, /Continue with Google|Continue with Apple|Soon/);
  assert.match(loginHtml, /secured by OAuth/);
  assert.match(loginHtml, /href="\/signup"/);
  assert.match(loginHtml, /class="box footer"/);
});

test("local edge adapter consumes its declarative app-scoped OAuth environment", async () => {
  const response = await resourcesEdgePreviewHandler(
    new Request("http://resources-edge.localhost:3030/auth/gitlab/start"),
    {
      environment: {
        PUBLIC_ORIGIN: "http://resources-edge.localhost:3030",
        GITLAB_CLIENT_ID: "configured-gitlab-id",
        GITLAB_CLIENT_SECRET: "configured-gitlab-secret",
        SESSION_SIGNING_KEY: "configured-local-session-signing-key",
      },
    },
  );
  const location = new URL(response.headers.get("location"));
  assert.equal(location.origin, "https://gitlab.com");
  assert.equal(location.searchParams.get("client_id"), "configured-gitlab-id");
  assert.equal(location.searchParams.get("redirect_uri"), "http://resources-edge.localhost:3030/auth/gitlab/callback");
});

test("edge signup switch hides registration and explains the closed state", async () => {
  const app = { environment: { SIGNUPS_ENABLED: "false" } };
  const home = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/"), app);
  const homeHtml = await home.text();
  assert.doesNotMatch(homeHtml, /href="\/signup"/);
  assert.match(homeHtml, /class="box home-social"/);
  const about = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/about"), app);
  assert.doesNotMatch(await about.text(), /class="box home-social"/);
  const login = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/login"), app);
  assert.doesNotMatch(await login.text(), /New to Resources\.co|href="\/signup"/);
  const signup = await resourcesEdgePreviewHandler(new Request("http://resources-edge.localhost/signup"), app);
  const signupHtml = await signup.text();
  assert.match(signupHtml, /Sign up is not currently enabled/);
  assert.match(signupHtml, /https:\/\/x\.com\/ResourcesCo/);
  assert.match(signupHtml, /https:\/\/www\.linkedin\.com\/company\/resources-co\//);
  assert.doesNotMatch(signupHtml, /Continue with GitHub|Continue with GitLab/);
});

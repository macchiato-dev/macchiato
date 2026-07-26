import assert from "node:assert/strict";
import test from "node:test";
import { createAuthConfig, finishGithubAuth, readSession, startGithubAuth } from "../../../examples/resources-site/auth/github.js";
import { createGitlabAuthConfig, finishGitlabAuth, startGitlabAuth } from "../../../examples/resources-site/auth/gitlab.js";

const config = createAuthConfig({
  PUBLIC_ORIGIN: "https://resources.example",
  GITHUB_CLIENT_ID: "client-id",
  GITHUB_CLIENT_SECRET: "client-secret",
  SESSION_SIGNING_KEY: "test-signing-key-that-is-not-used-in-production",
});
const gitlabConfig = createGitlabAuthConfig({
  GITLAB_CLIENT_ID: "gitlab-client-id",
  GITLAB_CLIENT_SECRET: "gitlab-client-secret",
}, config);

function cookiePair(setCookie, name) {
  const match = setCookie.match(new RegExp(`${name}=([^;,]+)`));
  assert.ok(match, `missing ${name}`);
  return `${name}=${match[1]}`;
}

test("GitHub auth uses signed state, PKCE, and a secure flow cookie", async () => {
  const response = await startGithubAuth(config, () => 1_000);
  const target = new URL(response.headers.get("location"));
  assert.equal(target.origin, "https://github.com");
  assert.equal(target.searchParams.get("client_id"), "client-id");
  assert.equal(target.searchParams.get("code_challenge_method"), "S256");
  assert.ok(target.searchParams.get("code_challenge"));
  assert.match(response.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);
});

test("local callback mode is explicit and limited to loopback-style hosts", async () => {
  const values = {
    PUBLIC_ORIGIN: "http://resources-edge.localhost:3030",
    GITHUB_CLIENT_ID: "local-client",
    GITHUB_CLIENT_SECRET: "local-secret",
    SESSION_SIGNING_KEY: "local-session-key-with-at-least-32-characters",
  };
  assert.throws(() => createAuthConfig(values), /HTTPS origin/);
  assert.throws(() => createAuthConfig({
    ...values,
    PUBLIC_ORIGIN: "http://example.test",
    AUTH_ALLOW_INSECURE_LOCALHOST: "true",
  }), /HTTPS origin/);

  const local = createAuthConfig({ ...values, AUTH_ALLOW_INSECURE_LOCALHOST: "true" });
  const response = await startGithubAuth(local, () => 1_000);
  assert.equal(new URL(response.headers.get("location")).searchParams.get("redirect_uri"), "http://resources-edge.localhost:3030/auth/github/callback");
  assert.doesNotMatch(response.headers.get("set-cookie"), /; Secure/);
  assert.match(response.headers.get("set-cookie"), /^resources_oauth=/);
  assert.doesNotMatch(response.headers.get("set-cookie"), /^__Host-/);
});

test("GitHub callback validates state and creates a signed identity session", async () => {
  const start = await startGithubAuth(config, () => 1_000);
  const authorize = new URL(start.headers.get("location"));
  const flowCookie = cookiePair(start.headers.get("set-cookie"), "__Host-resources_oauth");
  const requests = [];
  const fetchImpl = async (input, init) => {
    requests.push({ input: String(input), init });
    if (String(input).includes("access_token")) return Response.json({ access_token: "temporary-token" });
    return Response.json({ id: 42, login: "macchiato-dev", name: "Macchiato Dev" });
  };
  const callback = new Request(`https://resources.example/auth/github/callback?code=code&state=${authorize.searchParams.get("state")}`, {
    headers: { cookie: flowCookie },
  });
  const response = await finishGithubAuth(callback, config, { fetchImpl, now: () => 2_000 });

  assert.equal(response.status, 302);
  assert.equal(requests.length, 2);
  assert.ok(JSON.parse(requests[0].init.body).code_verifier);
  assert.equal(requests[1].init.headers.authorization, "Bearer temporary-token");
  const sessionCookie = cookiePair(response.headers.get("set-cookie"), "__Host-resources_session");
  const session = await readSession(new Request("https://resources.example/", { headers: { cookie: sessionCookie } }), config, () => 3_000);
  assert.deepEqual({ sub: session.sub, login: session.login, name: session.name }, {
    sub: "github:42",
    login: "macchiato-dev",
    name: "Macchiato Dev",
  });
});

test("GitHub callback rejects a mismatched state before making subrequests", async () => {
  const start = await startGithubAuth(config, () => 1_000);
  let called = false;
  const response = await finishGithubAuth(new Request("https://resources.example/auth/github/callback?code=x&state=wrong", {
    headers: { cookie: cookiePair(start.headers.get("set-cookie"), "__Host-resources_oauth") },
  }), config, { fetchImpl: async () => { called = true; }, now: () => 2_000 });
  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("GitLab auth uses read-only identity scope, PKCE, and the shared session format", async () => {
  const start = await startGitlabAuth(gitlabConfig, () => 1_000);
  const authorize = new URL(start.headers.get("location"));
  assert.equal(authorize.origin, "https://gitlab.com");
  assert.equal(authorize.searchParams.get("scope"), "read_user");
  assert.equal(authorize.searchParams.get("gl_auth_type"), "login");
  assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");

  const callback = new Request(`https://resources.example/auth/gitlab/callback?code=code&state=${authorize.searchParams.get("state")}`, {
    headers: { cookie: cookiePair(start.headers.get("set-cookie"), "__Host-resources_gitlab_oauth") },
  });
  const requests = [];
  const response = await finishGitlabAuth(callback, gitlabConfig, {
    now: () => 2_000,
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return String(input).endsWith("/oauth/token")
        ? Response.json({ access_token: "gitlab-temporary-token" })
        : Response.json({ id: 84, username: "latte-dev", name: "Latte Dev" });
    },
  });
  assert.equal(response.status, 302);
  assert.equal(requests[1].input, "https://gitlab.com/api/v4/user");
  const sessionCookie = cookiePair(response.headers.get("set-cookie"), "__Host-resources_session");
  const session = await readSession(new Request("https://resources.example/", { headers: { cookie: sessionCookie } }), config, () => 3_000);
  assert.equal(session.sub, "gitlab:84");
  assert.equal(session.login, "latte-dev");
});

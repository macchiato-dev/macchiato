import { cookie, parseCookies, pkceChallenge, randomToken, seal, unseal } from "./session.js";

const STATE_COOKIE = "__Host-resources_gitlab_oauth";
const SESSION_COOKIE = "__Host-resources_session";
const LOCAL_STATE_COOKIE = "resources_gitlab_oauth";
const LOCAL_SESSION_COOKIE = "resources_session";

function cookieNames(config) {
  return config.secureCookies
    ? { state: STATE_COOKIE, session: SESSION_COOKIE }
    : { state: LOCAL_STATE_COOKIE, session: LOCAL_SESSION_COOKIE };
}

function required(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

export function createGitlabAuthConfig(env = {}, sessionConfig) {
  if (!sessionConfig?.publicOrigin || !sessionConfig?.sessionSecret) throw new Error("GitLab auth requires shared session configuration");
  return Object.freeze({
    publicOrigin: sessionConfig.publicOrigin,
    sessionSecret: sessionConfig.sessionSecret,
    sessionSeconds: sessionConfig.sessionSeconds,
    secureCookies: sessionConfig.secureCookies,
    clientId: required(env.GITLAB_CLIENT_ID, "GITLAB_CLIENT_ID"),
    clientSecret: required(env.GITLAB_CLIENT_SECRET, "GITLAB_CLIENT_SECRET"),
  });
}

function redirect(location, setCookie) {
  return new Response(null, {
    status: 302,
    headers: { location, "cache-control": "no-store", ...(setCookie ? { "set-cookie": setCookie } : {}) },
  });
}

export async function startGitlabAuth(config, now = Date.now) {
  const state = randomToken();
  const verifier = randomToken();
  const flow = await seal({ state, verifier, exp: now() + 10 * 60_000 }, config.sessionSecret);
  const target = new URL("https://gitlab.com/oauth/authorize");
  target.searchParams.set("client_id", config.clientId);
  target.searchParams.set("redirect_uri", `${config.publicOrigin}/auth/gitlab/callback`);
  target.searchParams.set("response_type", "code");
  target.searchParams.set("state", state);
  target.searchParams.set("scope", "read_user");
  target.searchParams.set("gl_auth_type", "login");
  target.searchParams.set("code_challenge", await pkceChallenge(verifier));
  target.searchParams.set("code_challenge_method", "S256");
  return redirect(target.href, cookie(cookieNames(config).state, flow, { maxAge: 600, secure: config.secureCookies }));
}

export async function finishGitlabAuth(request, config, { fetchImpl = fetch, now = Date.now, accountStore = null } = {}) {
  const url = new URL(request.url);
  const names = cookieNames(config);
  const flow = await unseal(parseCookies(request.headers.get("cookie"))[names.state], config.sessionSecret);
  if (!flow || flow.exp < now() || url.searchParams.get("state") !== flow.state || !url.searchParams.get("code")) {
    return new Response("Invalid or expired authorization state", { status: 400, headers: { "cache-control": "no-store" } });
  }
  const tokenResponse = await fetchImpl("https://gitlab.com/oauth/token", {
    method: "POST",
    redirect: "manual",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: url.searchParams.get("code"),
      grant_type: "authorization_code",
      redirect_uri: `${config.publicOrigin}/auth/gitlab/callback`,
      code_verifier: flow.verifier,
    }),
  });
  if (!tokenResponse.ok) return new Response("Authorization exchange failed", { status: 502 });
  const token = await tokenResponse.json();
  if (!token.access_token) return new Response("Authorization was not granted", { status: 401 });
  const userResponse = await fetchImpl("https://gitlab.com/api/v4/user", {
    redirect: "manual",
    headers: { accept: "application/json", authorization: `Bearer ${token.access_token}` },
  });
  if (!userResponse.ok) return new Response("Identity lookup failed", { status: 502 });
  const user = await userResponse.json();
  if (!Number.isSafeInteger(user.id) || typeof user.username !== "string") return new Response("Invalid identity response", { status: 502 });
  const identity = {
    provider: "gitlab",
    providerUserId: user.id,
    login: user.username.slice(0, 80),
    name: String(user.name || user.username).slice(0, 120),
  };
  const account = accountStore ? await accountStore.upsertIdentity(identity) : { id: `gitlab:${user.id}`, ...identity };
  const issuedAt = now();
  const session = await seal({
    v: 1,
    sub: account.id,
    login: account.login,
    name: account.name,
    iat: issuedAt,
    exp: issuedAt + config.sessionSeconds * 1000,
  }, config.sessionSecret);
  const headers = new Headers({ location: config.publicOrigin, "cache-control": "no-store" });
  headers.append("set-cookie", cookie(names.session, session, { maxAge: config.sessionSeconds, secure: config.secureCookies }));
  headers.append("set-cookie", cookie(names.state, "", { maxAge: 0, secure: config.secureCookies }));
  return new Response(null, { status: 302, headers });
}

import { cookie, parseCookies, pkceChallenge, randomToken, seal, unseal } from "./session.js";

const STATE_COOKIE = "__Host-resources_oauth";
const SESSION_COOKIE = "__Host-resources_session";

function required(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

export function createAuthConfig(env = {}) {
  const origin = new URL(required(env.PUBLIC_ORIGIN, "PUBLIC_ORIGIN"));
  const localHost = origin.hostname === "localhost" || origin.hostname === "127.0.0.1" || origin.hostname === "::1" || origin.hostname.endsWith(".localhost");
  const allowLocalHttp = env.AUTH_ALLOW_INSECURE_LOCALHOST === "true" && localHost;
  if ((origin.protocol !== "https:" && !(origin.protocol === "http:" && allowLocalHttp)) || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("PUBLIC_ORIGIN must be an HTTPS origin or explicitly allowed local HTTP origin");
  }
  const sessionSecret = required(env.SESSION_SIGNING_KEY, "SESSION_SIGNING_KEY");
  if (sessionSecret.length < 32) throw new Error("SESSION_SIGNING_KEY must contain at least 32 characters");
  return Object.freeze({
    publicOrigin: origin.origin,
    clientId: required(env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID"),
    clientSecret: required(env.GITHUB_CLIENT_SECRET, "GITHUB_CLIENT_SECRET"),
    sessionSecret,
    secureCookies: !allowLocalHttp,
    sessionSeconds: 60 * 60 * 24 * 14,
  });
}

function redirect(location, setCookie) {
  const headers = new Headers({ location, "cache-control": "no-store" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(null, { status: 302, headers });
}

export async function startGithubAuth(config, now = Date.now) {
  const state = randomToken();
  const verifier = randomToken();
  const flow = await seal({ state, verifier, exp: now() + 10 * 60_000 }, config.sessionSecret);
  const target = new URL("https://github.com/login/oauth/authorize");
  target.searchParams.set("client_id", config.clientId);
  target.searchParams.set("redirect_uri", `${config.publicOrigin}/auth/github/callback`);
  target.searchParams.set("state", state);
  target.searchParams.set("code_challenge", await pkceChallenge(verifier));
  target.searchParams.set("code_challenge_method", "S256");
  target.searchParams.set("scope", "read:user");
  return redirect(target.href, cookie(STATE_COOKIE, flow, { maxAge: 600, secure: config.secureCookies }));
}

export async function finishGithubAuth(request, config, { fetchImpl = fetch, now = Date.now, accountStore = null } = {}) {
  const url = new URL(request.url);
  const flow = await unseal(parseCookies(request.headers.get("cookie"))[STATE_COOKIE], config.sessionSecret);
  if (!flow || flow.exp < now() || url.searchParams.get("state") !== flow.state || !url.searchParams.get("code")) {
    return new Response("Invalid or expired authorization state", { status: 400, headers: { "cache-control": "no-store" } });
  }
  const tokenResponse = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    redirect: "manual",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: url.searchParams.get("code"),
      redirect_uri: `${config.publicOrigin}/auth/github/callback`,
      code_verifier: flow.verifier,
    }),
  });
  if (!tokenResponse.ok) return new Response("Authorization exchange failed", { status: 502 });
  const token = await tokenResponse.json();
  if (!token.access_token) return new Response("Authorization was not granted", { status: 401 });
  const userResponse = await fetchImpl("https://api.github.com/user", {
    redirect: "manual",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token.access_token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "resources.co",
    },
  });
  if (!userResponse.ok) return new Response("Identity lookup failed", { status: 502 });
  const user = await userResponse.json();
  if (!Number.isSafeInteger(user.id) || typeof user.login !== "string") return new Response("Invalid identity response", { status: 502 });
  const identity = {
    provider: "github",
    providerUserId: user.id,
    login: user.login.slice(0, 80),
    name: String(user.name || user.login).slice(0, 120),
  };
  const account = accountStore ? await accountStore.upsertIdentity(identity) : { id: `github:${user.id}`, ...identity };
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
  headers.append("set-cookie", cookie(SESSION_COOKIE, session, { maxAge: config.sessionSeconds, secure: config.secureCookies }));
  headers.append("set-cookie", cookie(STATE_COOKIE, "", { maxAge: 0, secure: config.secureCookies }));
  return new Response(null, { status: 302, headers });
}

export async function readSession(request, config, now = Date.now) {
  const value = await unseal(parseCookies(request.headers.get("cookie"))[SESSION_COOKIE], config.sessionSecret);
  return value?.v === 1 && value.exp >= now() ? value : null;
}

export function signOut(config) {
  return redirect(config.publicOrigin, cookie(SESSION_COOKIE, "", { maxAge: 0, secure: config.secureCookies }));
}

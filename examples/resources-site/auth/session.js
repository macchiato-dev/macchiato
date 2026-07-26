const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index++) different |= left[index] ^ right[index];
  return different === 0;
}

async function signingKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function signature(secret, value) {
  return new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(value)));
}

export async function seal(value, secret) {
  const payload = base64url(encoder.encode(JSON.stringify(value)));
  return `${payload}.${base64url(await signature(secret, payload))}`;
}

export async function unseal(token, secret) {
  const [payload, encodedSignature, extra] = String(token || "").split(".");
  if (!payload || !encodedSignature || extra) return null;
  try {
    const expected = await signature(secret, payload);
    if (!timingSafeEqual(expected, decodeBase64url(encodedSignature))) return null;
    return JSON.parse(decoder.decode(decodeBase64url(payload)));
  } catch {
    return null;
  }
}

export function parseCookies(header) {
  const cookies = {};
  for (const pair of String(header || "").split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    cookies[pair.slice(0, separator).trim()] = pair.slice(separator + 1).trim();
  }
  return cookies;
}

export function cookie(name, value, { maxAge, path = "/", sameSite = "Lax" } = {}) {
  const parts = [`${name}=${value}`, `Path=${path}`, "HttpOnly", "Secure", `SameSite=${sameSite}`];
  if (maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join("; ");
}

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64url(value);
}

export async function pkceChallenge(verifier) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))));
}

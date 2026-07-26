import { AccountConflictError } from "../models/accounts.js";

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function accountErrorResponse(error, publicOrigin) {
  if (!(error instanceof AccountConflictError)) throw error;
  const message = error.code === "email_taken"
    ? "An account already exists for this email address. Sign in with your existing method first, then connect this sign-in method from Settings."
    : `That provider identity is already linked to another account. Log in to that account before changing its connections.`;
  const login = new URL("/login", publicOrigin).href;
  const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Account already exists · Resources.co</title>
    <style>body{margin:0;background:#f5f1e8;color:#17251d;font:16px/1.5 system-ui,sans-serif}.card{box-sizing:border-box;max-width:34rem;margin:12vh auto;padding:2rem;border:1px solid #b9c2b8;border-radius:1rem;background:#fff}h1{font-size:1.6rem}.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}a{display:inline-block;padding:.7rem 1rem;border-radius:.55rem;color:#145c36;font-weight:700}.primary{background:#145c36;color:#fff;text-decoration:none}</style>
    <main class="card"><h1>Continue with your existing account</h1><p>${escapeHtml(message)}</p><div class="actions"><a class="primary" href="${escapeHtml(login)}">Return to sign in</a></div></main></html>`;
  return new Response(body, {
    status: 409,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

// Local resources-edge adapter. The browser never receives the worker key.
import { readFile } from "node:fs/promises";
import { readSession } from "../auth/github.js";

export async function compileRustProject(request, authConfig) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response("Same-origin request required", { status: 403, headers });
  }
  if (!await readSession(request, authConfig)) {
    return new Response("Sign in to compile Rust", { status: 401, headers });
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request.body || []) {
      size += chunk.length;
      if (size > 6 * 1024 * 1024) {
        return new Response("Project is too large", { status: 413, headers });
      }
      chunks.push(chunk);
    }
    const key = (await readFile(new URL(
      "../../../../macchiato-work/rust-compiler/api-key", import.meta.url), "utf8")).trim();
    const response = await fetch("http://127.0.0.1:8791/compile", {
      method: "POST", headers: {
        Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      }, body: new Blob(chunks), signal: AbortSignal.timeout(35_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { ...headers, "Content-Type": response.headers.get("content-type") || "text/plain" },
    });
  } catch {
    return new Response("Rust compilation service is unavailable", { status: 503, headers });
  }
}

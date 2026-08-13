import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const host = readFileSync(new URL("../host.js", import.meta.url), "utf8");
const guest = readFileSync(new URL("../guest.js", import.meta.url), "utf8");

test("keeps the fixed limits visible in the standalone host", () => {
  assert.match(host, /rateLimit:\s*10_000/);
  assert.match(host, /imageLimit:\s*50 \* 1024 \* 1024/);
  assert.match(host, /maxElements:\s*320/);
  assert.match(host, /maxImageBytes:\s*8 \* 1024 \* 1024/);
  assert.match(host, /events:\s*Object\.freeze\(\["click"\]\)/);
});

test("uses only pinned jsDelivr QuickJS outside the package", () => {
  assert.match(
    host,
    /https:\/\/cdn\.jsdelivr\.net\/npm\/quickjs-emscripten@0\.32\.0\/\+esm/,
  );
  assert.doesNotMatch(host, /@macchiato-dev\//);
  assert.doesNotMatch(guest, /\bimport\s/);
});

test("keeps iframe composition outside the library", () => {
  assert.doesNotMatch(
    host,
    /createElement\(["']iframe["']\)|HTMLIFrameElement|sandbox=/,
  );
  assert.doesNotMatch(
    guest,
    /createElement\(["']iframe["']\)|\bwindow\s*\.\s*[A-Za-z_$]/,
  );
});

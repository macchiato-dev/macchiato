import assert from "node:assert/strict";
import test from "node:test";
import { defineCommandPalette, renderCommandPalette } from "../src/index.js";

test("command-palette-use renders only declared same-origin commands", () => {
  const model = defineCommandPalette({
    commands: [
      { id: "browse", label: "Browse resources", href: "/browse" },
      { id: "search", label: "Search elsewhere", href: "/browse", kind: "search" },
    ],
  });
  const html = renderCommandPalette(model);
  assert.match(html, /data-command-shortcut>Ctrl K/);
  assert.match(html, /data-command-label="browse resources"/);
  assert.match(html, /data-search-elsewhere/);
  assert.throws(() => defineCommandPalette({
    commands: [{ id: "escape", label: "Escape", href: "https://example.test" }],
  }), /Invalid command/);
});

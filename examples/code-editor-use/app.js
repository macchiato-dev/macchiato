import { defineDeclarativeApp } from "@macchiato-dev/declarative-app-server";

export const app = defineDeclarativeApp({
  id: "code-editor-use",
  layout: {
    eyebrow: "code-editor-use / browser-use",
    title: "Constrained CodeMirror 6",
    description: "CodeMirror runs inside QuickJS/WASM. A small browser bridge forwards events and applies its policy-checked DOM operations.",
    theme: {
      background: "#10131a",
      surface: "#151a23",
      text: "#e7ecf4",
      muted: "#aebbd0",
      accent: "#67e8d4",
      border: "#34445f",
      radius: "0.35rem",
      contentWidth: "58rem"
    }
  },
  content: {
    allowedBlocks: ["code-editor", "callout"],
    blocks: [
      { type: "code-editor", id: "editor", language: "javascript", label: "Code editor" },
      { type: "callout", text: "The browser applies an allowlisted DOM protocol; the editor and its state belong to the QuickJS guest." }
    ]
  }
});

export function renderCodeEditorBlock(block, _app, importMap) {
  return `<link rel="stylesheet" href="/style.css">
<script type="importmap">${importMap}</script>
<div class="editor-shell"><div id="${block.id}" aria-label="${block.label}"></div></div>
<div class="runtime"><span id="status" role="status">Starting QuickJS…</span><span id="shape"></span></div>
<script type="module" src="/client.js"></script>`;
}

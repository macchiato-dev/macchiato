import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { startMultiEditor } from "./multi-app.js";

startMultiEditor([
  ["typescript", "example.ts", () => javascript({ typescript: true })],
  ["html", "example.html", html],
  ["css", "example.css", css],
]);

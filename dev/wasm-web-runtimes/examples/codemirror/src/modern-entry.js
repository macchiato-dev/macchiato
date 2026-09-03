import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { start } from "./application.js";

start({
  typescript: () => javascript({ typescript: true }),
  html,
  css,
  json,
  markdown,
});

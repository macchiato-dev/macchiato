import { javascript } from "@codemirror/lang-javascript";
import { startMultiEditor } from "./multi-app.js";

const plainText = () => [];
startMultiEditor([
  ["typescript", "example.ts", () => javascript({ typescript: true })],
  ["html", "example.html", plainText],
  ["css", "example.css", plainText],
]);

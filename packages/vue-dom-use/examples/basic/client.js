import { mountVueDomEditor } from "/vue-dom-controller.js";

const error = document.querySelector("#error");
const inspection = document.querySelector("#inspection");
const guestSource = await fetch("/vue-dom-guest.js").then((response) => {
  if (!response.ok) throw new Error(`Guest bundle response: ${response.status}`);
  return response.text();
});
const editor = await mountVueDomEditor({
  root: document.querySelector("#editor"),
  guestSource,
  content: "# Vue across QuickJS\n\nEdit this text. Each input is stored as a revisioned transition in the guest reactive object.",
  onTransition() { inspection.textContent = JSON.stringify(editor.inspect(), null, 2); },
  onError(value) { error.textContent = value.message; },
});
inspection.textContent = JSON.stringify(editor.inspect(), null, 2);
editor.focus();

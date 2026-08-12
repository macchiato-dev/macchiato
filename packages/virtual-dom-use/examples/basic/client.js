import { mountVirtualDomEditor } from "/virtual-dom-controller.js";

const error = document.querySelector("#error");
const inspection = document.querySelector("#inspection");
const guestSource = await fetch("/virtual-dom-guest.js").then((response) => {
  if (!response.ok) throw new Error(`Guest bundle response: ${response.status}`);
  return response.text();
});
const editor = await mountVirtualDomEditor({
  root: document.querySelector("#editor"),
  guestSource,
  content: "# One virtual DOM, two runtimes\n\nEdit this text. Each input becomes one atomic batch applied by the same code in the QuickJS guest and browser host.",
  onTransition(result, action) {
    inspection.textContent = JSON.stringify({ action: action.type, ...result }, null, 2);
  },
  onError(value) { error.textContent = value.message; },
});
inspection.textContent = JSON.stringify(editor.inspect(), null, 2);
editor.focus();

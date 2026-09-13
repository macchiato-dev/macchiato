import { createProjectEditorMachine } from "./project-machines.js";

// Construct the bridge in this realm as well as granting this Document.
// Native observer records use their callback's realm, so merely passing an
// iframe Document to a parent-realm bridge mixes incompatible DOM identities.
let started = false;
window.__resourcesCreateEditor = options => {
  if (started) throw new Error("Editor frame already has an owner");
  started = true;
  // A structured clone shares compiled Wasm code while giving its wrapper the
  // receiving realm's identity. No second download or compilation is needed.
  const module = structuredClone(options.module);
  return createProjectEditorMachine({ ...options, module, root: document, limits: false });
};

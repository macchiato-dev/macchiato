import { requestFrontendService } from "./project-frontend-services.js";

// The site machine owns navigation to the workspace, but the workspace itself
// belongs to its editor child. The host controller resolves the capability to
// the server-rendered project root before constructing that child.
if (document.querySelector("[data-project-editor]")) {
  requestFrontendService("editor.mount").catch((error) => {
    document.querySelector("[data-project-editor]")?.setAttribute("data-editor-machine-state", "failed");
    globalThis.__wwcReportError(error?.stack || error?.message || String(error));
  });
}

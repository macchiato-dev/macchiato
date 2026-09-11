import { requestFrontendService } from "./project-frontend-services.js";
import { mountProjectPresentation } from "./project-presentation.js";
import { hasProjectRecovery } from "./project-session.js";

// The site machine owns navigation to the workspace, but the workspace itself
// belongs to its editor child. The host controller resolves the capability to
// the server-rendered project root before constructing that child.
if (document.querySelector("[data-project-editor]")) {
  const root = document.querySelector("[data-project-editor]");
  mountProjectPresentation(root);
  const navigation = typeof performance.getEntriesByType === "function"
    ? performance.getEntriesByType("navigation")[0] : null;
  const deferOutput = hasProjectRecovery({
    projectId: root.dataset.projectId, persistence: root.dataset.persistence,
    readOnly: root.dataset.readOnly === "true", navigationType: navigation?.type,
  }, sessionStorage);
  requestFrontendService("editor.mount", { deferOutput }).catch((error) => {
    document.querySelector("[data-project-editor]")?.setAttribute("data-editor-machine-state", "failed");
    globalThis.__wwcReportError(error?.stack || error?.message || String(error));
  });
}

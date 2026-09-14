import { hasSessionValue, navigationType, requestFrontendService, setProjectEditorTheme } from "./project-frontend-services.js";
import { mountProjectPresentation } from "./project-presentation.js";
import { hasProjectRecovery } from "./project-session.js";

// The site machine owns navigation to the workspace, but the workspace itself
// belongs to its editor child. The host controller resolves the capability to
// the server-rendered project root before constructing that child.
if (document.querySelector("[data-project-editor]")) {
  document.addEventListener("themechange", event => setProjectEditorTheme(event.detail.theme));
  const root = document.querySelector("[data-project-editor]");
  mountProjectPresentation(root);
  const deferOutput = hasProjectRecovery({
    projectId: root.dataset.projectId, persistence: root.dataset.persistence,
    readOnly: root.dataset.readOnly === "true", navigationType: navigationType(),
  }, { getItem: key => hasSessionValue(key) ? "" : null });
  async function openProject() {
    const url = root.querySelector("[data-project-snapshot-url]")?.dataset.projectSnapshotUrl;
    let workspace;
    if (url) {
      const response = await requestFrontendService("fetch", {
        url, method: "GET", headers: { Accept: "application/json" },
      });
      if (response.status !== 200) throw new Error(`Project workspace response: ${response.status}`);
      workspace = JSON.parse(response.body);
    }
    // Opening policy belongs to the guest, not the controller. Never revive
    // permissions from an older build after the current configuration changes.
    const saved = workspace?.savedOutput;
    const config = workspace?.snapshot?.config || {};
    const savedConfig = saved?.project?.config || {};
    const useSaved = !deferOutput && saved?.format === "resources-project-output-v1" &&
      JSON.stringify(savedConfig.containerOptions || {}) === JSON.stringify(config.containerOptions || {}) &&
      JSON.stringify(savedConfig.environment || {}) === JSON.stringify(config.environment || {});
    await requestFrontendService("editor.mount", {
      deferOutput, workspace, savedOutput: useSaved ? saved : null,
    });
  }
  openProject().catch((error) => {
    document.querySelector("[data-project-editor]")?.setAttribute("data-editor-machine-state", "failed");
    globalThis.__wwcReportError(error?.stack || error?.message || String(error));
  });
}

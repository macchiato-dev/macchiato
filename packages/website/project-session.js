export const DRAFT_KEY = "resources_project_draft_v5";

export function pendingProjectSnapshotKey(projectId) {
  return projectId ? `resources_project_pending_v1:${projectId}` : "";
}

// This only decides whether to wait for the editor's recovery logic. Do not
// parse/normalize a second copy of the snapshot in the outer page machine.
export function hasProjectRecovery({ projectId, persistence = "stored", readOnly,
  navigationType }, storage) {
  if (readOnly || persistence === "memory") return false;
  const key = persistence === "session"
    ? (["reload", "back_forward"].includes(navigationType) ? DRAFT_KEY : "")
    : pendingProjectSnapshotKey(projectId);
  try { return !!key && storage.getItem(key) !== null; }
  catch { return false; }
}

import {
  applyProjectPatch,
  diffProjectSnapshots,
  emptyProjectSnapshot,
  normalizeProjectSnapshot,
  planProjectVersionUpdate,
  projectPatchIsEmpty,
} from "./project-history.js";
import { CONTENT_QUERIES, ContentConflictError, ContentValidationError } from "./content.js";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TEMPLATES = new Set([
  "article", "slides", "hello", "clock", "mark", "chart", "ball", "stars",
  "blank", "html", "svg", "canvas",
]);

function text(value, field, { min = 0, max }) {
  const result = String(value || "").trim();
  if (result.length < min || result.length > max) {
    throw new ContentValidationError(field,
      `${field} must be between ${min} and ${max} characters`);
  }
  return result;
}

function slug(value) {
  const result = text(value, "slug", { min: 1, max: 63 }).toLowerCase();
  if (!SLUG.test(result)) {
    throw new ContentValidationError("slug",
      "name must use lowercase letters, numbers, and single hyphens");
  }
  return result;
}

function project(row) {
  return Object.freeze({
    id: String(row.id), ownerUserId: String(row.owner_user_id),
    namespaceKind: String(row.namespace_kind), namespace: String(row.namespace_slug),
    slug: String(row.slug), name: String(row.name),
    description: String(row.description), visibility: String(row.visibility),
    template: String(row.template), createdAt: Number(row.created_at),
  });
}

function parsedSnapshot(value) {
  return normalizeProjectSnapshot(JSON.parse(String(value)));
}

function snapshotJson(value) {
  return JSON.stringify(normalizeProjectSnapshot(value));
}

function validatedSnapshot(value) {
  try { return normalizeProjectSnapshot(value); }
  catch (error) { throw new ContentValidationError("snapshot", error.message); }
}

function parsedPatch(value) {
  const patch = JSON.parse(String(value));
  if (!patch || patch.version !== 1 || !Array.isArray(patch.files) ||
      !Array.isArray(patch.config)) throw new Error("Stored project patch is invalid");
  return patch;
}

function destructivePatch(patch) {
  return patch.files.some((operation) => operation.op === "delete") ||
    patch.config.length > 0;
}

function isUniqueError(error) {
  return /unique constraint/i.test(String(error?.message || error));
}

function limitError(error) {
  const message = String(error?.message || error);
  if (message.includes("resource_projects_global_limit")) {
    return new ContentValidationError("project_limit", "The site project limit has been reached");
  }
  if (message.includes("resource_projects_owner_limit")) {
    return new ContentValidationError("project_limit", "An account can have at most 20 projects");
  }
  return null;
}

// This capability is intentionally limited to operations which may carry a
// project-sized snapshot. Ordinary metadata and publication decisions belong
// to the application machine. The split can disappear once the controller can
// pass opaque large-value handles between the SQL and history machines.
export function createProjectSnapshotStore(client, {
  ready = async () => {},
  now = Date.now,
  randomId = () => crypto.randomUUID(),
  versionPlanner = planProjectVersionUpdate,
  snapshotDiffer = diffProjectSnapshots,
  snapshotValidator = async () => {},
} = {}) {
  if (!client?.execute || !client?.batch) {
    throw new Error("Project snapshot store requires a libSQL-compatible client");
  }

  async function getProjectWorkspace(namespace, projectSlug, userId) {
    await ready();
    const found = await client.execute({ sql: CONTENT_QUERIES.ownedWorkspace,
      args: [slug(namespace), slug(projectSlug), String(userId)] });
    const row = found.rows[0];
    if (!row) return null;
    return Object.freeze({ project: project(row), snapshot: parsedSnapshot(row.snapshot_json),
      publishedSnapshot: parsedSnapshot(row.published_snapshot_json),
      hasUnpublishedChanges: String(row.snapshot_json) !== String(row.published_snapshot_json),
      versionCount: Number(row.last_version_sequence), updatedAt: Number(row.updated_at) });
  }

  async function getPublicProjectWorkspace(namespace, projectSlug) {
    await ready();
    const found = await client.execute({ sql: CONTENT_QUERIES.publicWorkspace,
      args: [slug(namespace), slug(projectSlug)] });
    const row = found.rows[0];
    return row ? Object.freeze({ project: project(row), snapshot: parsedSnapshot(row.snapshot_json),
      versionCount: Number(row.last_version_sequence), updatedAt: Number(row.updated_at) }) : null;
  }

  async function getProjectVersion(projectId, sequence, userId) {
    await ready();
    const target = Number(sequence);
    if (!Number.isSafeInteger(target) || target < 1) {
      throw new ContentValidationError("version", "version is invalid");
    }
    const latest = await client.execute({ sql: CONTENT_QUERIES.latestVersion,
      args: [String(projectId), String(userId)] });
    if (latest.rows[0] && Number(latest.rows[0].last_version_sequence) === target) {
      return parsedSnapshot(latest.rows[0].checkpoint_snapshot_json);
    }
    const found = await client.execute({ sql: CONTENT_QUERIES.versionPatches,
      args: [String(projectId), String(userId), target] });
    if (!found.rows.length || Number(found.rows.at(-1).sequence) !== target) return null;
    let snapshot = emptyProjectSnapshot();
    for (const row of found.rows) snapshot = applyProjectPatch(snapshot, parsedPatch(row.patch_json));
    return snapshot;
  }

  async function createProject(userId, input) {
    await ready();
    const user = String(userId);
    const requestedNamespace = String(input.namespace || "user");
    let namespaceKind = "user", namespaceId = user;
    let namespaceSlug = text(input.userSlug, "userSlug", { min: 1, max: 63 });
    if (requestedNamespace !== "user") {
      const found = await client.execute({ sql: CONTENT_QUERIES.ownedOrganization,
        args: [requestedNamespace, user] });
      if (!found.rows[0]) {
        throw new ContentValidationError("namespace", "organization is not available");
      }
      namespaceKind = "organization";
      namespaceId = String(found.rows[0].id);
      namespaceSlug = String(found.rows[0].slug);
    }
    const template = String(input.template || "blank");
    if (!TEMPLATES.has(template)) {
      throw new ContentValidationError("template", "template is not available");
    }
    const visibility = String(input.visibility || "public");
    if (visibility !== "public" && visibility !== "private") {
      throw new ContentValidationError("visibility", "visibility is not available");
    }
    const value = {
      id: randomId(), owner_user_id: user, namespace_kind: namespaceKind,
      namespace_id: namespaceId, namespace_slug: namespaceSlug, slug: slug(input.slug),
      name: text(input.name, "name", { min: 1, max: 80 }),
      description: text(input.description, "description", { max: 500 }),
      visibility, template,
    };
    const timestamp = now();
    const snapshot = validatedSnapshot(input.snapshot || { files: [], config: {} });
    const patch = diffProjectSnapshots(emptyProjectSnapshot(), snapshot);
    try {
      await client.batch([
        { sql: CONTENT_QUERIES.insertProject, args: [value.id, user, namespaceKind,
          namespaceId, namespaceSlug, value.slug, value.name, value.description,
          visibility, template, timestamp, timestamp] },
        { sql: CONTENT_QUERIES.insertState, args: [value.id, snapshotJson(snapshot),
          snapshotJson(snapshot), timestamp, timestamp] },
        { sql: CONTENT_QUERIES.insertVersion,
          args: [value.id, 1, "initial", JSON.stringify(patch), timestamp] },
        { sql: CONTENT_QUERIES.insertInitialLabel, args: [value.id, timestamp] },
        { sql: CONTENT_QUERIES.insertPublication,
          args: [value.id, snapshotJson(snapshot), timestamp] },
      ]);
    } catch (error) {
      const limited = limitError(error);
      if (limited) throw limited;
      if (isUniqueError(error)) throw new ContentConflictError("project");
      throw error;
    }
    return project({ ...value, created_at: timestamp });
  }

  async function saveProjectSnapshot(userId, projectId, snapshotValue,
    { reason = "periodic", checkpointIntervalMs = 300_000, destructive = false } = {}) {
    await ready();
    const found = await client.execute({ sql: CONTENT_QUERIES.projectState,
      args: [String(projectId), String(userId)] });
    const row = found.rows[0];
    if (!row) return null;
    const current = parsedSnapshot(row.snapshot_json);
    const checkpoint = parsedSnapshot(row.checkpoint_snapshot_json);
    const next = validatedSnapshot(snapshotValue);
    await snapshotValidator(next);
    const change = await snapshotDiffer(current, next);
    const pendingCheckpoint = await snapshotDiffer(checkpoint, current);
    const timestamp = now();
    const plan = await versionPlanner({ changeEmpty: projectPatchIsEmpty(change),
      pendingCheckpointEmpty: projectPatchIsEmpty(pendingCheckpoint),
      destructive: destructive || destructivePatch(change), reason,
      checkpointDue: timestamp - Number(row.last_version_at) >= checkpointIntervalMs,
      lastVersionSequence: Number(row.last_version_sequence) });
    if (plan.state === "unchanged") return Object.freeze({ changed: false,
      versionCount: Number(row.last_version_sequence), snapshot: current });
    if (plan.state === "checkpoint") {
      await client.batch([
        { sql: CONTENT_QUERIES.insertVersion, args: [String(projectId), plan.sequence,
          plan.checkpointVersionReason, JSON.stringify(pendingCheckpoint), timestamp] },
        { sql: CONTENT_QUERIES.checkpointState,
          args: [plan.sequence, timestamp, timestamp, String(projectId)] },
      ]);
      return Object.freeze({ changed: true, versionCount: plan.sequence, snapshot: current });
    }
    const queries = [];
    let versionSequence = Number(row.last_version_sequence);
    if (plan.checkpointVersionReason) queries.push({ sql: CONTENT_QUERIES.insertVersion,
      args: [String(projectId), ++versionSequence, plan.checkpointVersionReason,
        JSON.stringify(pendingCheckpoint), timestamp] });
    if (plan.nextVersionReason) {
      const patch = plan.nextVersionBase === "current" ? change :
        await snapshotDiffer(checkpoint, next);
      queries.push({ sql: CONTENT_QUERIES.insertVersion,
        args: [String(projectId), ++versionSequence, plan.nextVersionReason,
          JSON.stringify(patch), timestamp] });
    }
    if (versionSequence !== plan.sequence) throw new Error("Project version plan is inconsistent");
    const nextCheckpoint = plan.checkpointTarget === "next" ? next : checkpoint;
    queries.push({ sql: CONTENT_QUERIES.updateState, args: [snapshotJson(next),
      snapshotJson(nextCheckpoint), plan.sequence,
      plan.checkpointTarget === "unchanged" ? Number(row.last_version_at) : timestamp,
      timestamp, String(projectId)] }, { sql: CONTENT_QUERIES.touchProject,
      args: [timestamp, TEMPLATES.has(String(next.config?.template || "")) ?
        String(next.config.template) : "", TEMPLATES.has(String(next.config?.template || "")) ?
        String(next.config.template) : "", String(projectId)] });
    await client.batch(queries);
    return Object.freeze({ changed: true, versionCount: plan.sequence, snapshot: next });
  }

  async function restoreProjectVersion(userId, projectId, sequence) {
    const snapshot = await getProjectVersion(projectId, sequence, userId);
    return snapshot ? saveProjectSnapshot(userId, projectId, snapshot,
      { reason: "restore", destructive: true }) : null;
  }

  async function revertProjectToPublished(userId, projectId) {
    await ready();
    const found = await client.execute({ sql: CONTENT_QUERIES.publishedSnapshot,
      args: [String(projectId), String(userId)] });
    return found.rows[0] ? saveProjectSnapshot(userId, projectId,
      parsedSnapshot(found.rows[0].snapshot_json),
      { reason: "restore", destructive: true }) : null;
  }

  return Object.freeze({ createProject, getProjectWorkspace, getPublicProjectWorkspace,
    getProjectVersion, saveProjectSnapshot, restoreProjectVersion,
    revertProjectToPublished });
}

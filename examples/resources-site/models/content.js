import {
  applyProjectPatch,
  diffProjectSnapshots,
  emptyProjectSnapshot,
  normalizeProjectSnapshot,
  projectPatchIsEmpty,
} from "./project-history.js";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS resource_organizations (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,
  `CREATE INDEX IF NOT EXISTS resource_organizations_owner
    ON resource_organizations(owner_user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS resource_projects (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    namespace_kind TEXT NOT NULL CHECK (namespace_kind IN ('user', 'organization')),
    namespace_id TEXT NOT NULL,
    namespace_slug TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
    template TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (namespace_kind, namespace_id, slug)
  ) STRICT`,
  `CREATE INDEX IF NOT EXISTS resource_projects_owner
    ON resource_projects(owner_user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS resource_project_state (
    project_id TEXT PRIMARY KEY REFERENCES resource_projects(id) ON DELETE CASCADE,
    snapshot_json TEXT NOT NULL,
    checkpoint_snapshot_json TEXT NOT NULL,
    last_version_sequence INTEGER NOT NULL,
    last_version_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,
  `CREATE TABLE IF NOT EXISTS resource_project_versions (
    project_id TEXT NOT NULL REFERENCES resource_projects(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('initial', 'periodic', 'before_destructive', 'destructive', 'restore', 'manual')),
    patch_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, sequence)
  ) STRICT`,
  `CREATE INDEX IF NOT EXISTS resource_project_versions_created
    ON resource_project_versions(project_id, created_at DESC)`,
  `INSERT OR IGNORE INTO resource_project_state
      (project_id, snapshot_json, checkpoint_snapshot_json,
       last_version_sequence, last_version_at, updated_at)
    SELECT id, '{"files":[],"config":{}}', '{"files":[],"config":{}}', 1, created_at, updated_at
    FROM resource_projects`,
  `INSERT OR IGNORE INTO resource_project_versions
      (project_id, sequence, reason, patch_json, created_at)
    SELECT id, 1, 'initial', '{"version":1,"files":[],"config":[]}', created_at
    FROM resource_projects`,
];

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TEMPLATES = new Set(["blank", "html", "svg", "canvas"]);

export class ContentConflictError extends Error {
  constructor(kind) {
    super(`A ${kind} with that name already exists`);
    this.name = "ContentConflictError";
    this.code = `${kind}_taken`;
  }
}

export class ContentValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ContentValidationError";
    this.field = field;
  }
}

function text(value, field, { min = 0, max }) {
  const result = String(value || "").trim();
  if (result.length < min || result.length > max) {
    throw new ContentValidationError(field, `${field} must be between ${min} and ${max} characters`);
  }
  return result;
}

function slug(value) {
  const result = text(value, "slug", { min: 1, max: 63 }).toLowerCase();
  if (!SLUG.test(result)) {
    throw new ContentValidationError("slug", "slug must use lowercase letters, numbers, and single hyphens");
  }
  return result;
}

function isUniqueError(error) {
  return /unique constraint/i.test(String(error?.message || error));
}

function project(row) {
  return Object.freeze({
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    namespaceKind: String(row.namespace_kind),
    namespace: String(row.namespace_slug),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    visibility: String(row.visibility),
    template: String(row.template),
    createdAt: Number(row.created_at),
  });
}

function snapshotJson(value) {
  return JSON.stringify(normalizeProjectSnapshot(value));
}

function parsedSnapshot(value) {
  return normalizeProjectSnapshot(JSON.parse(String(value)));
}

function parsedPatch(value) {
  const patch = JSON.parse(String(value));
  if (!patch || patch.version !== 1 || !Array.isArray(patch.files) || !Array.isArray(patch.config)) throw new Error("Stored project patch is invalid");
  return patch;
}

function destructivePatch(patch) {
  return patch.files.some((operation) => operation.op === "delete") || patch.config.length > 0;
}

function organization(row) {
  return Object.freeze({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    createdAt: Number(row.created_at),
  });
}

export function createContentStore(client, {
  now = Date.now,
  randomId = () => crypto.randomUUID(),
} = {}) {
  if (!client?.execute || !client?.batch) throw new Error("Content store requires a libSQL-compatible client");
  let initialized;
  const initialize = () => (initialized ||= client.batch(SCHEMA.map((sql) => ({ sql, args: [] }))));

  return Object.freeze({
    async getProject(namespace, projectSlug, viewerUserId = null) {
      await initialize();
      const found = await client.execute({
        sql: `SELECT id, owner_user_id, namespace_kind, namespace_slug, slug, name,
                     description, visibility, template, created_at
              FROM resource_projects
              WHERE namespace_slug = ? COLLATE NOCASE AND slug = ? COLLATE NOCASE`,
        args: [slug(namespace), slug(projectSlug)],
      });
      const row = found.rows[0];
      if (!row || (row.visibility === "private" && String(row.owner_user_id) !== String(viewerUserId || ""))) return null;
      return project(row);
    },

    async getProjectWorkspace(namespace, projectSlug, userId) {
      await initialize();
      const found = await client.execute({
        sql: `SELECT p.id, p.owner_user_id, p.namespace_kind, p.namespace_slug, p.slug,
                     p.name, p.description, p.visibility, p.template, p.created_at,
                     s.snapshot_json, s.last_version_sequence, s.updated_at
              FROM resource_projects p
              JOIN resource_project_state s ON s.project_id = p.id
              WHERE p.namespace_slug = ? COLLATE NOCASE AND p.slug = ? COLLATE NOCASE
                AND p.owner_user_id = ?`,
        args: [slug(namespace), slug(projectSlug), String(userId)],
      });
      const row = found.rows[0];
      if (!row) return null;
      return Object.freeze({
        project: project(row),
        snapshot: parsedSnapshot(row.snapshot_json),
        versionCount: Number(row.last_version_sequence),
        updatedAt: Number(row.updated_at),
      });
    },

    async listProjectVersions(projectId, userId) {
      await initialize();
      const found = await client.execute({
        sql: `SELECT v.sequence, v.reason, v.created_at
              FROM resource_project_versions v
              JOIN resource_projects p ON p.id = v.project_id
              WHERE v.project_id = ? AND p.owner_user_id = ?
              ORDER BY v.sequence DESC`,
        args: [String(projectId), String(userId)],
      });
      return Object.freeze(found.rows.map((row) => Object.freeze({
        sequence: Number(row.sequence), reason: String(row.reason), createdAt: Number(row.created_at),
      })));
    },

    async getProjectVersion(projectId, sequence, userId) {
      await initialize();
      const target = Number(sequence);
      if (!Number.isSafeInteger(target) || target < 1) throw new ContentValidationError("version", "version is invalid");
      const found = await client.execute({
        sql: `SELECT v.sequence, v.patch_json
              FROM resource_project_versions v
              JOIN resource_projects p ON p.id = v.project_id
              WHERE v.project_id = ? AND p.owner_user_id = ? AND v.sequence <= ?
              ORDER BY v.sequence`,
        args: [String(projectId), String(userId), target],
      });
      if (!found.rows.length || Number(found.rows.at(-1).sequence) !== target) return null;
      let snapshot = emptyProjectSnapshot();
      for (const row of found.rows) snapshot = applyProjectPatch(snapshot, parsedPatch(row.patch_json));
      return snapshot;
    },

    async listForUser(userId) {
      await initialize();
      const [organizations, projects] = await Promise.all([
        client.execute({
          sql: `SELECT id, slug, name, description, created_at
                FROM resource_organizations WHERE owner_user_id = ?
                ORDER BY updated_at DESC, name COLLATE NOCASE`,
          args: [String(userId)],
        }),
        client.execute({
          sql: `SELECT id, owner_user_id, namespace_kind, namespace_slug, slug, name,
                       description, visibility, template, created_at
                FROM resource_projects WHERE owner_user_id = ?
                ORDER BY updated_at DESC, name COLLATE NOCASE`,
          args: [String(userId)],
        }),
      ]);
      return Object.freeze({
        organizations: Object.freeze(organizations.rows.map(organization)),
        projects: Object.freeze(projects.rows.map(project)),
      });
    },

    async createOrganization(userId, input) {
      await initialize();
      const value = {
        id: randomId(),
        slug: slug(input.slug),
        name: text(input.name, "name", { min: 1, max: 80 }),
        description: text(input.description, "description", { max: 500 }),
      };
      const timestamp = now();
      try {
        await client.execute({
          sql: `INSERT INTO resource_organizations
                  (id, owner_user_id, slug, name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [value.id, String(userId), value.slug, value.name, value.description, timestamp, timestamp],
        });
      } catch (error) {
        if (isUniqueError(error)) throw new ContentConflictError("organization");
        throw error;
      }
      return organization({ ...value, created_at: timestamp });
    },

    async createProject(userId, input) {
      await initialize();
      const user = String(userId);
      const namespace = String(input.namespace || "user");
      let namespaceKind = "user";
      let namespaceId = user;
      let namespaceSlug = text(input.userSlug, "userSlug", { min: 1, max: 63 });
      if (namespace !== "user") {
        const found = await client.execute({
          sql: `SELECT id, slug FROM resource_organizations
                WHERE id = ? AND owner_user_id = ?`,
          args: [namespace, user],
        });
        if (!found.rows[0]) throw new ContentValidationError("namespace", "organization is not available");
        namespaceKind = "organization";
        namespaceId = String(found.rows[0].id);
        namespaceSlug = String(found.rows[0].slug);
      }
      const template = String(input.template || "blank");
      if (!TEMPLATES.has(template)) throw new ContentValidationError("template", "template is not available");
      const visibility = String(input.visibility || "public");
      if (visibility !== "public" && visibility !== "private") {
        throw new ContentValidationError("visibility", "visibility is not available");
      }
      const value = {
        id: randomId(),
        owner_user_id: user,
        namespace_kind: namespaceKind,
        namespace_id: namespaceId,
        namespace_slug: namespaceSlug,
        slug: slug(input.slug),
        name: text(input.name, "name", { min: 1, max: 80 }),
        description: text(input.description, "description", { max: 500 }),
        visibility,
        template,
      };
      const timestamp = now();
      const initialSnapshot = normalizeProjectSnapshot(input.snapshot || { files: [], config: {} });
      const initialPatch = diffProjectSnapshots(emptyProjectSnapshot(), initialSnapshot);
      try {
        await client.batch([{
          sql: `INSERT INTO resource_projects
                  (id, owner_user_id, namespace_kind, namespace_id, namespace_slug,
                   slug, name, description, visibility, template, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            value.id, user, value.namespace_kind, value.namespace_id, value.namespace_slug,
            value.slug, value.name, value.description, value.visibility, value.template,
            timestamp, timestamp,
          ],
        }, {
          sql: `INSERT INTO resource_project_state
                  (project_id, snapshot_json, checkpoint_snapshot_json,
                   last_version_sequence, last_version_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?)`,
          args: [value.id, snapshotJson(initialSnapshot), snapshotJson(initialSnapshot), timestamp, timestamp],
        }, {
          sql: `INSERT INTO resource_project_versions
                  (project_id, sequence, reason, patch_json, created_at)
                VALUES (?, 1, 'initial', ?, ?)`,
          args: [value.id, JSON.stringify(initialPatch), timestamp],
        }]);
      } catch (error) {
        if (isUniqueError(error)) throw new ContentConflictError("project");
        throw error;
      }
      return project({ ...value, created_at: timestamp });
    },

    async saveProjectSnapshot(userId, projectId, snapshotValue, { reason = "periodic", checkpointIntervalMs = 300_000, destructive = false } = {}) {
      await initialize();
      const found = await client.execute({
        sql: `SELECT s.snapshot_json, s.checkpoint_snapshot_json, s.last_version_sequence,
                     s.last_version_at, s.updated_at
              FROM resource_project_state s
              JOIN resource_projects p ON p.id = s.project_id
              WHERE s.project_id = ? AND p.owner_user_id = ?`,
        args: [String(projectId), String(userId)],
      });
      const row = found.rows[0];
      if (!row) return null;
      const current = parsedSnapshot(row.snapshot_json);
      const checkpoint = parsedSnapshot(row.checkpoint_snapshot_json);
      const next = normalizeProjectSnapshot(snapshotValue);
      const change = diffProjectSnapshots(current, next);
      if (projectPatchIsEmpty(change)) return Object.freeze({ changed: false, versionCount: Number(row.last_version_sequence), snapshot: current });
      const timestamp = now();
      const isDestructive = destructive || destructivePatch(change) || reason === "restore";
      let sequence = Number(row.last_version_sequence);
      let versionSnapshot = checkpoint;
      const queries = [];
      if (isDestructive) {
        const pending = diffProjectSnapshots(versionSnapshot, current);
        if (!projectPatchIsEmpty(pending)) {
          sequence++;
          queries.push({
            sql: `INSERT INTO resource_project_versions (project_id, sequence, reason, patch_json, created_at)
                  VALUES (?, ?, 'before_destructive', ?, ?)`,
            args: [String(projectId), sequence, JSON.stringify(pending), timestamp],
          });
          versionSnapshot = current;
        }
        sequence++;
        queries.push({
          sql: `INSERT INTO resource_project_versions (project_id, sequence, reason, patch_json, created_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [String(projectId), sequence, reason === "restore" ? "restore" : "destructive", JSON.stringify(diffProjectSnapshots(versionSnapshot, next)), timestamp],
        });
        versionSnapshot = next;
      } else if (timestamp - Number(row.last_version_at) >= checkpointIntervalMs || reason === "manual") {
        sequence++;
        queries.push({
          sql: `INSERT INTO resource_project_versions (project_id, sequence, reason, patch_json, created_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [String(projectId), sequence, reason === "manual" ? "manual" : "periodic", JSON.stringify(diffProjectSnapshots(versionSnapshot, next)), timestamp],
        });
        versionSnapshot = next;
      }
      queries.push({
        sql: `UPDATE resource_project_state
              SET snapshot_json = ?, checkpoint_snapshot_json = ?, last_version_sequence = ?,
                  last_version_at = ?, updated_at = ?
              WHERE project_id = ?`,
        args: [snapshotJson(next), snapshotJson(versionSnapshot), sequence,
          versionSnapshot === checkpoint ? Number(row.last_version_at) : timestamp, timestamp, String(projectId)],
      }, {
        sql: `UPDATE resource_projects SET updated_at = ? WHERE id = ?`,
        args: [timestamp, String(projectId)],
      });
      await client.batch(queries);
      return Object.freeze({ changed: true, versionCount: sequence, snapshot: next });
    },

    async restoreProjectVersion(userId, projectId, sequence) {
      const snapshot = await this.getProjectVersion(projectId, sequence, userId);
      if (!snapshot) return null;
      return this.saveProjectSnapshot(userId, projectId, snapshot, { reason: "restore", destructive: true });
    },
  });
}

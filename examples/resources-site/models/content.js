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
          sql: `SELECT id, namespace_kind, namespace_slug, slug, name,
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
      try {
        await client.execute({
          sql: `INSERT INTO resource_projects
                  (id, owner_user_id, namespace_kind, namespace_id, namespace_slug,
                   slug, name, description, visibility, template, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            value.id, user, value.namespace_kind, value.namespace_id, value.namespace_slug,
            value.slug, value.name, value.description, value.visibility, value.template,
            timestamp, timestamp,
          ],
        });
      } catch (error) {
        if (isUniqueError(error)) throw new ContentConflictError("project");
        throw error;
      }
      return project({ ...value, created_at: timestamp });
    },
  });
}

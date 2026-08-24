(() => {
  // packages/hub/src/names.js
  var NAMESPACE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var RESERVED_NAMESPACE_NAMES = Object.freeze(/* @__PURE__ */ new Set([
    "admin",
    "administrator",
    "api",
    "auth",
    "blog",
    "docs",
    "help",
    "login",
    "logout",
    "organizations",
    "projects",
    "root",
    "security",
    "settings",
    "signup",
    "support",
    "system",
    "try",
    "www"
  ]));
  function namespaceName(value, { field = "name", minimum = 4 } = {}) {
    const result = String(value || "").trim().toLowerCase();
    if (result.length < minimum || result.length > 63) throw new Error(`${field} must be between ${minimum} and 63 characters`);
    if (!NAMESPACE_NAME.test(result)) throw new Error(`${field} must use lowercase letters, numbers, and single hyphens`);
    if (RESERVED_NAMESPACE_NAMES.has(result)) throw new Error(`That ${field} is reserved`);
    return result;
  }

  // packages/hub/src/accounts.js
  var ACCOUNT_SCHEMA = Object.freeze([
    `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,
    `CREATE TABLE IF NOT EXISTS user_identities (
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    provider_username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (provider, provider_user_id)
  ) STRICT`,
    `CREATE TABLE IF NOT EXISTS user_emails (
    normalized_email TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,
    `CREATE INDEX IF NOT EXISTS user_identities_user_id
    ON user_identities(user_id)`,
    `CREATE INDEX IF NOT EXISTS user_emails_user_id
    ON user_emails(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
    ON users(username COLLATE NOCASE)`
  ]);
  var ACCOUNT_QUERIES = Object.freeze({
    providersForUser: "SELECT provider FROM user_identities WHERE user_id = ? ORDER BY provider",
    accountById: "SELECT id, display_name, username FROM users WHERE id = ?",
    organizationSlugExists: "SELECT 1 FROM resource_organizations WHERE slug = ? COLLATE NOCASE LIMIT 1",
    updateUsername: "UPDATE users SET username = ?, updated_at = ? WHERE id = ?",
    updateUserProjectNamespace: `UPDATE resource_projects SET namespace_slug = ?, updated_at = ?
                WHERE namespace_kind = 'user' AND namespace_id = ?`,
    identityByProvider: `SELECT users.id, users.display_name, users.username
              FROM user_identities
              JOIN users ON users.id = user_identities.user_id
              WHERE provider = ? AND provider_user_id = ?`,
    updateDisplayName: `UPDATE users SET display_name = ?, updated_at = ?
                  WHERE id = ?`,
    updateProviderUsername: `UPDATE user_identities SET provider_username = ?, updated_at = ?
                  WHERE provider = ? AND provider_user_id = ?`,
    accountByEmail: `SELECT users.id, users.display_name, users.username
              FROM user_emails
              JOIN users ON users.id = user_emails.user_id
              WHERE normalized_email = ?`,
    insertUser: `INSERT INTO users (id, display_name, username, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
    insertEmail: `INSERT INTO user_emails
                  (normalized_email, email, user_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
    insertIdentity: `INSERT INTO user_identities
                (provider, provider_user_id, user_id, provider_username, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`
  });
  var AccountConflictError = class extends Error {
    constructor(code, providers = []) {
      super(code === "email_taken" ? "An account already uses this email address" : code === "username_taken" ? "That username is already in use" : "This provider identity is already linked to another account");
      this.name = "AccountConflictError";
      this.code = code;
      this.providers = Object.freeze([...providers]);
    }
  };
  var AccountSignupDisabledError = class extends Error {
    constructor() {
      super("Sign up is not currently enabled");
      this.name = "AccountSignupDisabledError";
      this.code = "signup_disabled";
    }
  };
  var AccountValidationError = class extends Error {
    constructor(field, message) {
      super(message);
      this.name = "AccountValidationError";
      this.field = field;
    }
  };
  function normalizeEmail(value) {
    const email = String(value || "").trim();
    const separator = email.lastIndexOf("@");
    if (separator < 1 || separator === email.length - 1 || email.length > 254) {
      throw new Error("A verified provider email address is required");
    }
    return { email, normalized: email.toLowerCase() };
  }
  function firstRow(result) {
    return result?.rows?.[0] || null;
  }
  function accountFromRow(row) {
    return row && Object.freeze({
      id: String(row.id),
      login: String(row.username),
      name: String(row.display_name)
    });
  }
  function createAccountStore(client, {
    now = Date.now,
    randomId = () => crypto.randomUUID(),
    allowedProviders = ["github", "gitlab"]
  } = {}) {
    if (!client?.execute || !client?.batch) throw new Error("Account store requires a libSQL-compatible client");
    const providers = new Set(allowedProviders);
    if (!providers.size || [...providers].some((provider) => !/^[a-z][a-z0-9-]{0,63}$/.test(provider))) {
      throw new Error("Account store providers must be lowercase identifiers");
    }
    let initialized2;
    function initialize2() {
      initialized2 ||= client.batch(ACCOUNT_SCHEMA.map((sql) => ({ sql, args: [] })));
      return initialized2;
    }
    async function providersForUser(userId) {
      const result = await client.execute({
        sql: ACCOUNT_QUERIES.providersForUser,
        args: [userId]
      });
      return result.rows.map((row) => String(row.provider));
    }
    async function getAccount(userId) {
      await initialize2();
      return accountFromRow(firstRow(await client.execute({
        sql: ACCOUNT_QUERIES.accountById,
        args: [String(userId)]
      })));
    }
    return Object.freeze({
      initialize: initialize2,
      getAccount,
      async updateUsername(userId, value) {
        await initialize2();
        let username;
        try {
          username = namespaceName(value, { field: "username" });
        } catch (error) {
          throw new AccountValidationError("username", error.message);
        }
        const timestamp = now();
        try {
          const occupied = await client.execute({
            sql: ACCOUNT_QUERIES.organizationSlugExists,
            args: [username]
          });
          if (occupied.rows[0]) throw new AccountConflictError("username_taken");
          const changed = await client.batch([{
            sql: ACCOUNT_QUERIES.updateUsername,
            args: [username, timestamp, String(userId)]
          }, {
            sql: ACCOUNT_QUERIES.updateUserProjectNamespace,
            args: [username, timestamp, String(userId)]
          }]);
          if (!changed[0]?.rowsAffected) return null;
        } catch (error) {
          if (/unique constraint/i.test(String(error?.message || error))) throw new AccountConflictError("username_taken");
          throw error;
        }
        return getAccount(userId);
      },
      async authenticateIdentity(identity, { linkToUserId = null, allowCreate = true } = {}) {
        await initialize2();
        if (!providers.has(identity.provider)) throw new Error("Unsupported identity provider");
        const providerUserId = String(identity.providerUserId);
        const { email, normalized } = normalizeEmail(identity.email);
        if (identity.emailVerified !== true) throw new Error("A verified provider email address is required");
        const timestamp = now();
        const identityResult = await client.execute({
          sql: ACCOUNT_QUERIES.identityByProvider,
          args: [identity.provider, providerUserId]
        });
        const existingIdentity = firstRow(identityResult);
        if (existingIdentity) {
          if (linkToUserId && String(existingIdentity.id) !== String(linkToUserId)) {
            throw new AccountConflictError("identity_taken", await providersForUser(existingIdentity.id));
          }
          await client.batch([
            {
              sql: ACCOUNT_QUERIES.updateDisplayName,
              args: [identity.name, timestamp, existingIdentity.id]
            },
            {
              sql: ACCOUNT_QUERIES.updateProviderUsername,
              args: [identity.login, timestamp, identity.provider, providerUserId]
            }
          ]);
          return accountFromRow({
            ...existingIdentity,
            display_name: identity.name,
            username: existingIdentity.username
          });
        }
        if (!linkToUserId && !allowCreate) throw new AccountSignupDisabledError();
        const emailResult = await client.execute({
          sql: ACCOUNT_QUERIES.accountByEmail,
          args: [normalized]
        });
        const emailOwner = firstRow(emailResult);
        if (!linkToUserId && emailOwner) {
          throw new AccountConflictError("email_taken", await providersForUser(emailOwner.id));
        }
        if (linkToUserId && emailOwner && String(emailOwner.id) !== String(linkToUserId)) {
          throw new AccountConflictError("email_taken", await providersForUser(emailOwner.id));
        }
        const userId = linkToUserId ? String(linkToUserId) : randomId();
        const statements = [];
        if (!linkToUserId) {
          statements.push({
            sql: ACCOUNT_QUERIES.insertUser,
            args: [userId, identity.name, identity.login, timestamp, timestamp]
          });
        }
        if (!emailOwner) {
          statements.push({
            sql: ACCOUNT_QUERIES.insertEmail,
            args: [normalized, email, userId, timestamp, timestamp]
          });
        }
        statements.push({
          sql: ACCOUNT_QUERIES.insertIdentity,
          args: [identity.provider, providerUserId, userId, identity.login, timestamp, timestamp]
        });
        await client.batch(statements);
        return Object.freeze({ id: userId, login: identity.login, name: identity.name });
      }
    });
  }

  // packages/hub/src/project-history.js
  var PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/?)(?!.*\\)[A-Za-z0-9._~/-]{1,240}$/;
  var MAX_FILES = 64;
  var MAX_FILE_BYTES = 70 * 1024 * 1024;
  var MAX_CONFIG_BYTES = 64e3;
  var MAX_SNAPSHOT_BYTES = 70 * 1024 * 1024;
  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }
  function jsonValue(value, label) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map((item) => jsonValue(item, label));
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, jsonValue(value[key], label)]));
    }
    throw new Error(`${label} must contain only JSON values`);
  }
  function same(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  function fileMap(snapshot) {
    return new Map(snapshot.files.map((file) => [file.path, file.content]));
  }
  function normalizeProjectSnapshot(value = {}) {
    const sourceFiles = Array.isArray(value.files) ? value.files : [];
    if (sourceFiles.length > MAX_FILES) throw new Error(`Project snapshot exceeds ${MAX_FILES} files`);
    const seen = /* @__PURE__ */ new Set();
    const files = sourceFiles.map((file) => {
      const path = String(file?.path || "");
      const content2 = String(file?.content ?? "");
      if (!PATH.test(path) || path.includes("//")) throw new Error(`Invalid project file path: ${path}`);
      if (seen.has(path)) throw new Error(`Duplicate project file path: ${path}`);
      if (new TextEncoder().encode(content2).byteLength > MAX_FILE_BYTES) throw new Error(`Project file exceeds the 50 MB portable-artifact budget: ${path}`);
      seen.add(path);
      return Object.freeze({ path, content: content2 });
    }).sort((left, right) => left.path.localeCompare(right.path));
    const config = jsonValue(value.config ?? {}, "Project configuration");
    if (!config || Array.isArray(config) || typeof config !== "object") throw new Error("Project configuration must be an object");
    if (new TextEncoder().encode(JSON.stringify(config)).byteLength > MAX_CONFIG_BYTES) throw new Error("Project configuration is too large");
    if (new TextEncoder().encode(JSON.stringify({ files, config })).byteLength > MAX_SNAPSHOT_BYTES) throw new Error("Project snapshot is too large");
    return Object.freeze({ files: Object.freeze(files), config: Object.freeze(config) });
  }
  function textSplice(before, after) {
    let start = 0;
    const common = Math.min(before.length, after.length);
    while (start < common && before.charCodeAt(start) === after.charCodeAt(start)) start++;
    let beforeEnd = before.length;
    let afterEnd = after.length;
    while (beforeEnd > start && afterEnd > start && before.charCodeAt(beforeEnd - 1) === after.charCodeAt(afterEnd - 1)) {
      beforeEnd--;
      afterEnd--;
    }
    return Object.freeze({ start, remove: before.slice(start, beforeEnd), insert: after.slice(start, afterEnd) });
  }
  function configDiff(before, after, path, operations) {
    if (same(before, after)) return;
    const beforeObject = before && typeof before === "object" && !Array.isArray(before);
    const afterObject = after && typeof after === "object" && !Array.isArray(after);
    if (!beforeObject || !afterObject) {
      operations.push(Object.freeze({ op: "set", path: Object.freeze(path), before, value: after }));
      return;
    }
    const keys = [.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      if (!own(after, key)) operations.push(Object.freeze({ op: "delete", path: Object.freeze([...path, key]), before: before[key] }));
      else if (!own(before, key)) operations.push(Object.freeze({ op: "set", path: Object.freeze([...path, key]), absent: true, value: after[key] }));
      else configDiff(before[key], after[key], [...path, key], operations);
    }
  }
  function diffProjectSnapshots(beforeValue, afterValue) {
    const before = normalizeProjectSnapshot(beforeValue);
    const after = normalizeProjectSnapshot(afterValue);
    const beforeFiles = fileMap(before);
    const afterFiles = fileMap(after);
    const files = [];
    for (const path of [.../* @__PURE__ */ new Set([...beforeFiles.keys(), ...afterFiles.keys()])].sort()) {
      if (!afterFiles.has(path)) files.push(Object.freeze({ op: "delete", path, before: beforeFiles.get(path) }));
      else if (!beforeFiles.has(path)) files.push(Object.freeze({ op: "add", path, content: afterFiles.get(path) }));
      else if (beforeFiles.get(path) !== afterFiles.get(path)) files.push(Object.freeze({ op: "splice", path, ...textSplice(beforeFiles.get(path), afterFiles.get(path)) }));
    }
    const config = [];
    configDiff(before.config, after.config, [], config);
    return Object.freeze({ version: 1, files: Object.freeze(files), config: Object.freeze(config) });
  }
  function configParent(root, path) {
    let current = root;
    for (const key of path.slice(0, -1)) {
      if (!current || typeof current !== "object" || Array.isArray(current) || !own(current, key)) throw new Error(`Configuration patch path does not exist: ${path.join(".")}`);
      current = current[key];
    }
    return { parent: current, key: path.at(-1) };
  }
  function applyProjectPatch(snapshotValue, patch) {
    if (!patch || patch.version !== 1 || !Array.isArray(patch.files) || !Array.isArray(patch.config)) throw new Error("Invalid project patch");
    const snapshot = normalizeProjectSnapshot(snapshotValue);
    const files = fileMap(snapshot);
    for (const operation of patch.files) {
      const path = String(operation.path || "");
      if (!PATH.test(path)) throw new Error(`Invalid project patch path: ${path}`);
      if (operation.op === "add") {
        if (files.has(path)) throw new Error(`Project patch expected missing file: ${path}`);
        files.set(path, String(operation.content ?? ""));
      } else if (operation.op === "delete") {
        if (!files.has(path) || files.get(path) !== operation.before) throw new Error(`Project patch delete mismatch: ${path}`);
        files.delete(path);
      } else if (operation.op === "splice") {
        const content2 = files.get(path);
        const start = Number(operation.start);
        if (typeof content2 !== "string" || !Number.isSafeInteger(start) || start < 0 || content2.slice(start, start + operation.remove.length) !== operation.remove) {
          throw new Error(`Project patch splice mismatch: ${path}`);
        }
        files.set(path, content2.slice(0, start) + operation.insert + content2.slice(start + operation.remove.length));
      } else throw new Error(`Unsupported project file operation: ${operation.op}`);
    }
    const config = structuredClone(snapshot.config);
    for (const operation of patch.config) {
      if (!Array.isArray(operation.path) || operation.path.length === 0 || operation.path.some((key2) => typeof key2 !== "string" || !key2)) throw new Error("Invalid configuration patch path");
      const { parent, key } = configParent(config, operation.path);
      if (!parent || typeof parent !== "object" || Array.isArray(parent)) throw new Error(`Invalid configuration patch parent: ${operation.path.join(".")}`);
      if (operation.op === "delete") {
        if (!own(parent, key) || !same(parent[key], operation.before)) throw new Error(`Configuration patch delete mismatch: ${operation.path.join(".")}`);
        delete parent[key];
      } else if (operation.op === "set") {
        if (operation.absent ? own(parent, key) : !own(parent, key) || !same(parent[key], operation.before)) throw new Error(`Configuration patch set mismatch: ${operation.path.join(".")}`);
        parent[key] = structuredClone(operation.value);
      } else throw new Error(`Unsupported configuration operation: ${operation.op}`);
    }
    return normalizeProjectSnapshot({ files: [...files].map(([path, content2]) => ({ path, content: content2 })), config });
  }
  function projectPatchIsEmpty(patch) {
    return patch?.version === 1 && patch.files?.length === 0 && patch.config?.length === 0;
  }
  function planProjectVersionUpdate({
    changeEmpty,
    pendingCheckpointEmpty,
    destructive,
    reason,
    checkpointDue,
    lastVersionSequence
  }) {
    if (typeof changeEmpty !== "boolean" || typeof pendingCheckpointEmpty !== "boolean" || typeof destructive !== "boolean" || typeof checkpointDue !== "boolean" || !Number.isSafeInteger(lastVersionSequence) || lastVersionSequence < 0 || !["periodic", "manual", "restore"].includes(reason)) {
      throw new Error("Project version planning input is invalid");
    }
    if (changeEmpty) {
      if (reason !== "manual" || pendingCheckpointEmpty) {
        return Object.freeze({
          state: "unchanged",
          sequence: lastVersionSequence,
          checkpointVersionReason: null,
          nextVersionReason: null,
          nextVersionBase: null,
          checkpointTarget: "unchanged"
        });
      }
      return Object.freeze({
        state: "checkpoint",
        sequence: lastVersionSequence + 1,
        checkpointVersionReason: "manual",
        nextVersionReason: null,
        nextVersionBase: null,
        checkpointTarget: "current"
      });
    }
    let sequence = lastVersionSequence;
    let checkpointVersionReason = null;
    let nextVersionReason = null;
    let nextVersionBase = null;
    let checkpointTarget = "unchanged";
    if (destructive || reason === "restore") {
      if (!pendingCheckpointEmpty) {
        checkpointVersionReason = "before_destructive";
        sequence++;
        nextVersionBase = "current";
      } else nextVersionBase = "checkpoint";
      nextVersionReason = reason === "restore" ? "restore" : "destructive";
      checkpointTarget = "next";
      sequence++;
    } else if (checkpointDue || reason === "manual") {
      nextVersionReason = reason === "manual" ? "manual" : "periodic";
      nextVersionBase = "checkpoint";
      checkpointTarget = "next";
      sequence++;
    }
    return Object.freeze({
      state: "update",
      sequence,
      checkpointVersionReason,
      nextVersionReason,
      nextVersionBase,
      checkpointTarget
    });
  }
  function emptyProjectSnapshot() {
    return normalizeProjectSnapshot({ files: [], config: {} });
  }

  // packages/hub/src/organizations.js
  var ORGANIZATION_SCHEMA = Object.freeze([
    `CREATE TABLE IF NOT EXISTS resource_organization_members (
    organization_id TEXT NOT NULL REFERENCES resource_organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (organization_id, user_id)
  ) STRICT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS resource_organization_single_admin
    ON resource_organization_members(organization_id) WHERE role = 'admin'`,
    `CREATE TABLE IF NOT EXISTS resource_organization_invitations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES resource_organizations(id) ON DELETE CASCADE,
    inviter_user_id TEXT NOT NULL REFERENCES users(id),
    invitee_user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS resource_organization_pending_invitation
    ON resource_organization_invitations(organization_id, invitee_user_id) WHERE status = 'pending'`,
    `CREATE UNIQUE INDEX IF NOT EXISTS resource_organization_pending_admin
    ON resource_organization_invitations(organization_id) WHERE status = 'pending' AND role = 'admin'`,
    `CREATE TABLE IF NOT EXISTS resource_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('organization_invitation')),
    invitation_id TEXT REFERENCES resource_organization_invitations(id) ON DELETE CASCADE,
    read_at INTEGER,
    created_at INTEGER NOT NULL
  ) STRICT`,
    `CREATE INDEX IF NOT EXISTS resource_notifications_user
    ON resource_notifications(user_id, created_at DESC)`
  ]);
  var ORGANIZATION_QUERIES = Object.freeze({
    managedOrganization: `SELECT o.id, o.slug, o.name, o.description, o.owner_user_id,
                   CASE WHEN o.owner_user_id = ? THEN 'owner' ELSE m.role END AS viewer_role
            FROM resource_organizations o
            LEFT JOIN resource_organization_members m
              ON m.organization_id = o.id AND m.user_id = ?
            WHERE o.slug = ? COLLATE NOCASE
              AND (o.owner_user_id = ? OR m.role = 'admin')`,
    members: `SELECT m.user_id, u.username, u.display_name, m.role, m.created_at
              FROM resource_organization_members m JOIN users u ON u.id = m.user_id
              WHERE m.organization_id = ? ORDER BY m.role, u.username COLLATE NOCASE`,
    userByUsername: "SELECT id, username FROM users WHERE username = ? COLLATE NOCASE",
    existingMember: "SELECT 1 FROM resource_organization_members WHERE organization_id = ? AND user_id = ?",
    existingAdmin: "SELECT 1 FROM resource_organization_members WHERE organization_id = ? AND role = 'admin' LIMIT 1",
    insertInvitation: `INSERT INTO resource_organization_invitations
                  (id, organization_id, inviter_user_id, invitee_user_id, role, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    insertNotification: `INSERT INTO resource_notifications (id, user_id, kind, invitation_id, read_at, created_at)
                VALUES (?, ?, 'organization_invitation', ?, NULL, ?)`,
    notifications: `SELECT n.id, n.kind, n.invitation_id, n.read_at, n.created_at,
                     i.organization_id, i.role, i.status,
                     o.slug AS organization_slug, o.name AS organization_name,
                     inviter.username AS inviter_username
              FROM resource_notifications n
              JOIN resource_organization_invitations i ON i.id = n.invitation_id
              JOIN resource_organizations o ON o.id = i.organization_id
              JOIN users inviter ON inviter.id = i.inviter_user_id
              WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 100`,
    markNotificationRead: "UPDATE resource_notifications SET read_at = ? WHERE id = ? AND user_id = ?",
    deletePendingInvitation: `DELETE FROM resource_organization_invitations
              WHERE status = 'pending' AND id = (
                SELECT invitation_id FROM resource_notifications WHERE id = ? AND user_id = ?
              )`,
    deleteNotification: "DELETE FROM resource_notifications WHERE id = ? AND user_id = ?",
    invitation: `SELECT n.id, i.id AS invitation_id, i.organization_id, i.role, i.status, o.slug
              FROM resource_notifications n
              JOIN resource_organization_invitations i ON i.id = n.invitation_id
              JOIN resource_organizations o ON o.id = i.organization_id
              WHERE n.id = ? AND n.user_id = ?`,
    insertMember: `INSERT INTO resource_organization_members (organization_id, user_id, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
    acceptInvitation: "UPDATE resource_organization_invitations SET status = 'accepted', updated_at = ? WHERE id = ? AND status = 'pending'",
    changeRole: `UPDATE resource_organization_members SET role = ?, updated_at = ?
                WHERE organization_id = ? AND user_id = ?`
  });
  var OrganizationAccessError = class extends Error {
    constructor(message = "Organization administration is not available") {
      super(message);
      this.name = "OrganizationAccessError";
    }
  };
  var OrganizationInputError = class extends Error {
    constructor(field, message) {
      super(message);
      this.name = "OrganizationInputError";
      this.field = field;
    }
  };
  function role(value) {
    const result = String(value || "member");
    if (result !== "member" && result !== "admin") throw new OrganizationInputError("role", "Role must be member or admin");
    return result;
  }
  function invitationConflict(error) {
    const value = String(error?.message || error);
    if (/resource_organization_single_admin|resource_organization_pending_admin|unique constraint/i.test(value)) {
      return new OrganizationInputError("role", "This organization already has or is inviting an admin");
    }
    return null;
  }
  function notification(row) {
    return Object.freeze({
      id: String(row.id),
      kind: String(row.kind),
      read: row.read_at != null,
      invitationId: String(row.invitation_id),
      organizationId: String(row.organization_id),
      organizationSlug: String(row.organization_slug),
      organizationName: String(row.organization_name),
      inviter: String(row.inviter_username),
      role: String(row.role),
      status: String(row.status),
      createdAt: Number(row.created_at)
    });
  }
  function createOrganizationStore(client, { now = Date.now, randomId = () => crypto.randomUUID() } = {}) {
    if (!client?.execute || !client?.batch) throw new Error("Organization store requires a libSQL-compatible client");
    let initialized2;
    const initialize2 = () => initialized2 ||= client.batch(ORGANIZATION_SCHEMA.map((sql) => ({ sql, args: [] })));
    async function managedOrganization(slugValue, userId) {
      const slug2 = namespaceName(slugValue, { field: "organization name" });
      const result = await client.execute({
        sql: ORGANIZATION_QUERIES.managedOrganization,
        args: [String(userId), String(userId), slug2, String(userId)]
      });
      return result.rows[0] || null;
    }
    return Object.freeze({
      initialize: initialize2,
      async getManagedOrganization(slugValue, userId) {
        await initialize2();
        const org = await managedOrganization(slugValue, userId);
        if (!org) return null;
        const members = await client.execute({
          sql: ORGANIZATION_QUERIES.members,
          args: [org.id]
        });
        return Object.freeze({
          id: String(org.id),
          slug: String(org.slug),
          name: String(org.name),
          description: String(org.description),
          ownerUserId: String(org.owner_user_id),
          viewerRole: String(org.viewer_role),
          members: Object.freeze(members.rows.map((row) => Object.freeze({
            userId: String(row.user_id),
            username: String(row.username),
            name: String(row.display_name),
            role: String(row.role),
            createdAt: Number(row.created_at)
          })))
        });
      },
      async invite(slugValue, actorUserId, { username, role: requestedRole }) {
        await initialize2();
        const org = await managedOrganization(slugValue, actorUserId);
        if (!org) throw new OrganizationAccessError();
        const targetName = namespaceName(username, { field: "username" });
        const target = (await client.execute({
          sql: ORGANIZATION_QUERIES.userByUsername,
          args: [targetName]
        })).rows[0];
        if (!target) throw new OrganizationInputError("username", "No existing user has that username");
        if (String(target.id) === String(org.owner_user_id)) throw new OrganizationInputError("username", "The organization owner is already part of the organization");
        const existing = await client.execute({
          sql: ORGANIZATION_QUERIES.existingMember,
          args: [org.id, target.id]
        });
        if (existing.rows[0]) throw new OrganizationInputError("username", "That user is already a member");
        const invitationRole = role(requestedRole);
        if (invitationRole === "admin") {
          const admin = await client.execute({
            sql: ORGANIZATION_QUERIES.existingAdmin,
            args: [org.id]
          });
          if (admin.rows[0]) throw new OrganizationInputError("role", "This organization already has or is inviting an admin");
        }
        const timestamp = now();
        const invitationId = randomId();
        const notificationId = randomId();
        try {
          await client.batch([{
            sql: ORGANIZATION_QUERIES.insertInvitation,
            args: [invitationId, org.id, String(actorUserId), target.id, invitationRole, timestamp, timestamp]
          }, {
            sql: ORGANIZATION_QUERIES.insertNotification,
            args: [notificationId, target.id, invitationId, timestamp]
          }]);
        } catch (error) {
          throw invitationConflict(error) || error;
        }
        return Object.freeze({ id: invitationId, notificationId, username: String(target.username) });
      },
      async listNotifications(userId) {
        await initialize2();
        const result = await client.execute({
          sql: ORGANIZATION_QUERIES.notifications,
          args: [String(userId)]
        });
        return Object.freeze(result.rows.map(notification));
      },
      async markNotificationRead(userId, notificationId) {
        await initialize2();
        const result = await client.execute({ sql: ORGANIZATION_QUERIES.markNotificationRead, args: [now(), String(notificationId), String(userId)] });
        return Boolean(result.rowsAffected);
      },
      async deleteNotification(userId, notificationId) {
        await initialize2();
        const results = await client.batch([{
          sql: ORGANIZATION_QUERIES.deletePendingInvitation,
          args: [String(notificationId), String(userId)]
        }, {
          sql: ORGANIZATION_QUERIES.deleteNotification,
          args: [String(notificationId), String(userId)]
        }]);
        return Boolean(results[0]?.rowsAffected || results[1]?.rowsAffected);
      },
      async acceptInvitation(userId, notificationId) {
        await initialize2();
        const found = await client.execute({
          sql: ORGANIZATION_QUERIES.invitation,
          args: [String(notificationId), String(userId)]
        });
        const invite = found.rows[0];
        if (!invite || invite.status !== "pending") return null;
        const timestamp = now();
        try {
          await client.batch([{
            sql: ORGANIZATION_QUERIES.insertMember,
            args: [invite.organization_id, String(userId), invite.role, timestamp, timestamp]
          }, {
            sql: ORGANIZATION_QUERIES.acceptInvitation,
            args: [timestamp, invite.invitation_id]
          }, {
            sql: ORGANIZATION_QUERIES.markNotificationRead,
            args: [timestamp, String(notificationId), String(userId)]
          }]);
        } catch (error) {
          throw invitationConflict(error) || error;
        }
        return String(invite.slug);
      },
      async changeRole(slugValue, actorUserId, memberUserId, requestedRole) {
        await initialize2();
        const org = await managedOrganization(slugValue, actorUserId);
        if (!org) throw new OrganizationAccessError();
        try {
          const result = await client.execute({
            sql: ORGANIZATION_QUERIES.changeRole,
            args: [role(requestedRole), now(), org.id, String(memberUserId)]
          });
          return Boolean(result.rowsAffected);
        } catch (error) {
          throw invitationConflict(error) || error;
        }
      }
    });
  }

  // packages/hub/src/content.js
  var CONTENT_SCHEMA = Object.freeze([
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
    `CREATE TRIGGER IF NOT EXISTS resource_projects_global_limit
    BEFORE INSERT ON resource_projects
    WHEN (SELECT COUNT(*) FROM resource_projects) >= 50000
    BEGIN SELECT RAISE(ABORT, 'resource_projects_global_limit'); END`,
    `CREATE TRIGGER IF NOT EXISTS resource_projects_owner_limit
    BEFORE INSERT ON resource_projects
    WHEN (SELECT COUNT(*) FROM resource_projects WHERE owner_user_id = NEW.owner_user_id) >= 20
    BEGIN SELECT RAISE(ABORT, 'resource_projects_owner_limit'); END`,
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
    `CREATE TABLE IF NOT EXISTS resource_project_version_labels (
    project_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    title TEXT NOT NULL,
    saved_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, sequence),
    FOREIGN KEY (project_id, sequence) REFERENCES resource_project_versions(project_id, sequence) ON DELETE CASCADE
  ) STRICT`,
    `CREATE TABLE IF NOT EXISTS resource_project_publications (
    project_id TEXT PRIMARY KEY REFERENCES resource_projects(id) ON DELETE CASCADE,
    snapshot_json TEXT NOT NULL,
    published_at INTEGER NOT NULL
  ) STRICT`,
    `CREATE TRIGGER IF NOT EXISTS resource_organizations_owner_limit
    BEFORE INSERT ON resource_organizations
    WHEN (SELECT COUNT(*) FROM resource_organizations WHERE owner_user_id = NEW.owner_user_id) >= 5
    BEGIN SELECT RAISE(ABORT, 'resource_organizations_owner_limit'); END`,
    `INSERT OR IGNORE INTO resource_project_state
      (project_id, snapshot_json, checkpoint_snapshot_json,
       last_version_sequence, last_version_at, updated_at)
    SELECT id, '{"files":[],"config":{}}', '{"files":[],"config":{}}', 1, created_at, updated_at
    FROM resource_projects`,
    `INSERT OR IGNORE INTO resource_project_versions
      (project_id, sequence, reason, patch_json, created_at)
    SELECT id, 1, 'initial', '{"version":1,"files":[],"config":[]}', created_at
    FROM resource_projects`,
    `INSERT OR IGNORE INTO resource_project_publications (project_id, snapshot_json, published_at)
    SELECT project_id, snapshot_json, updated_at FROM resource_project_state`,
    `INSERT OR IGNORE INTO resource_project_version_labels (project_id, sequence, title, saved_at)
    SELECT p.project_id, s.last_version_sequence, '', p.published_at
    FROM resource_project_publications p JOIN resource_project_state s ON s.project_id = p.project_id`
  ]);
  var CONTENT_QUERIES = Object.freeze({
    projectByNamespace: `SELECT id, owner_user_id, namespace_kind, namespace_slug, slug, name,
                     description, visibility, template, created_at
              FROM resource_projects
              WHERE namespace_slug = ? COLLATE NOCASE AND slug = ? COLLATE NOCASE`,
    ownedWorkspace: `SELECT p.id, p.owner_user_id, p.namespace_kind, p.namespace_slug, p.slug,
                     p.name, p.description, p.visibility, p.template, p.created_at,
                     s.snapshot_json, s.last_version_sequence, s.updated_at,
                     pub.snapshot_json AS published_snapshot_json
              FROM resource_projects p
              JOIN resource_project_state s ON s.project_id = p.id
              JOIN resource_project_publications pub ON pub.project_id = p.id
              WHERE p.namespace_slug = ? COLLATE NOCASE AND p.slug = ? COLLATE NOCASE
                AND p.owner_user_id = ?`,
    publicWorkspace: `SELECT p.id, p.owner_user_id, p.namespace_kind, p.namespace_slug, p.slug,
                     p.name, p.description, p.visibility, p.template, p.created_at,
                     pub.snapshot_json, s.last_version_sequence, s.updated_at
              FROM resource_projects p
              JOIN resource_project_state s ON s.project_id = p.id
              JOIN resource_project_publications pub ON pub.project_id = p.id
              WHERE p.namespace_slug = ? COLLATE NOCASE AND p.slug = ? COLLATE NOCASE
                AND p.visibility = 'public'`,
    publicProjects: `SELECT p.id, p.owner_user_id, p.namespace_kind, p.namespace_slug, p.slug,
                     p.name, p.description, p.visibility, p.template, p.created_at
              FROM resource_projects p
              JOIN resource_project_state s ON s.project_id = p.id
              WHERE p.visibility = 'public'
                AND (? IS NULL OR p.namespace_slug COLLATE NOCASE IN (SELECT value FROM json_each(?)))
              ORDER BY p.updated_at DESC, p.name COLLATE NOCASE
              LIMIT ?`,
    namespaceIdentity: `SELECT 'user' AS kind, username AS slug, display_name AS name
              FROM users WHERE username = ? COLLATE NOCASE
              UNION ALL
              SELECT 'organization' AS kind, slug, name
              FROM resource_organizations WHERE slug = ? COLLATE NOCASE
              LIMIT 1`,
    namespaceProjects: `SELECT id, owner_user_id, namespace_kind, namespace_slug, slug, name,
                     description, visibility, template, created_at
              FROM resource_projects
              WHERE namespace_slug = ? COLLATE NOCASE
                AND (visibility = 'public' OR owner_user_id = ?)
              ORDER BY updated_at DESC, name COLLATE NOCASE
              LIMIT 100`,
    versions: `SELECT v.sequence, v.reason, v.created_at, COALESCE(l.title, '') AS title,
                     l.saved_at,
                     CASE WHEN l.sequence = (SELECT x.sequence FROM resource_project_version_labels x
                       WHERE x.project_id = v.project_id ORDER BY x.saved_at DESC, x.sequence DESC LIMIT 1)
                       THEN 1 ELSE 0 END AS latest
              FROM resource_project_versions v
              LEFT JOIN resource_project_version_labels l ON l.project_id = v.project_id AND l.sequence = v.sequence
              JOIN resource_projects p ON p.id = v.project_id
              WHERE v.project_id = ? AND p.owner_user_id = ?
              ORDER BY v.sequence DESC`,
    latestVersion: `SELECT s.last_version_sequence, s.checkpoint_snapshot_json
              FROM resource_project_state s
              JOIN resource_projects p ON p.id = s.project_id
              WHERE s.project_id = ? AND p.owner_user_id = ?`,
    versionPatches: `SELECT v.sequence, v.patch_json
              FROM resource_project_versions v
              JOIN resource_projects p ON p.id = v.project_id
              WHERE v.project_id = ? AND p.owner_user_id = ? AND v.sequence <= ?
              ORDER BY v.sequence`,
    organizationsForUser: `SELECT id, slug, name, description, created_at
                FROM resource_organizations o
                WHERE o.owner_user_id = ? OR EXISTS (
                  SELECT 1 FROM resource_organization_members m
                  WHERE m.organization_id = o.id AND m.user_id = ?
                )
                ORDER BY updated_at DESC, name COLLATE NOCASE`,
    projectsForUser: `SELECT id, owner_user_id, namespace_kind, namespace_slug, slug, name,
                       description, visibility, template, created_at
                FROM resource_projects WHERE owner_user_id = ?
                ORDER BY updated_at DESC, name COLLATE NOCASE`,
    usernameExists: "SELECT 1 FROM users WHERE username = ? COLLATE NOCASE LIMIT 1",
    insertOrganization: `INSERT INTO resource_organizations
                  (id, owner_user_id, slug, name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ownedOrganization: `SELECT id, slug FROM resource_organizations
                WHERE id = ? AND owner_user_id = ?`,
    insertProject: `INSERT INTO resource_projects
                  (id, owner_user_id, namespace_kind, namespace_id, namespace_slug,
                   slug, name, description, visibility, template, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    insertState: `INSERT INTO resource_project_state
                  (project_id, snapshot_json, checkpoint_snapshot_json,
                   last_version_sequence, last_version_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?)`,
    insertVersion: `INSERT INTO resource_project_versions
                  (project_id, sequence, reason, patch_json, created_at)
                VALUES (?, ?, ?, ?, ?)`,
    insertInitialLabel: `INSERT INTO resource_project_version_labels (project_id, sequence, title, saved_at)
                VALUES (?, 1, '', ?)`,
    insertPublication: `INSERT INTO resource_project_publications (project_id, snapshot_json, published_at)
                VALUES (?, ?, ?)`,
    updateProject: `UPDATE resource_projects
                SET namespace_kind = ?, namespace_id = ?, namespace_slug = ?, slug = ?,
                    name = ?, description = ?, visibility = ?, template = ?, updated_at = ?
                WHERE id = ? AND owner_user_id = ?`,
    projectById: `SELECT id, owner_user_id, namespace_kind, namespace_slug, slug, name,
                     description, visibility, template, created_at
              FROM resource_projects WHERE id = ?`,
    projectState: `SELECT s.snapshot_json, s.checkpoint_snapshot_json, s.last_version_sequence,
                     s.last_version_at, s.updated_at
              FROM resource_project_state s
              JOIN resource_projects p ON p.id = s.project_id
              WHERE s.project_id = ? AND p.owner_user_id = ?`,
    checkpointState: `UPDATE resource_project_state
                SET checkpoint_snapshot_json = snapshot_json, last_version_sequence = ?, last_version_at = ?, updated_at = ?
                WHERE project_id = ?`,
    updateState: `UPDATE resource_project_state
              SET snapshot_json = ?, checkpoint_snapshot_json = ?, last_version_sequence = ?,
                  last_version_at = ?, updated_at = ?
              WHERE project_id = ?`,
    touchProject: `UPDATE resource_projects
              SET updated_at = ?, template = CASE WHEN ? = '' THEN template ELSE ? END
              WHERE id = ?`,
    publish: `UPDATE resource_project_publications
              SET snapshot_json = (SELECT s.snapshot_json FROM resource_project_state s
                                   JOIN resource_projects p ON p.id = s.project_id
                                   WHERE s.project_id = ? AND p.owner_user_id = ?),
                  published_at = ?
              WHERE project_id = ?
                AND EXISTS (SELECT 1 FROM resource_projects p WHERE p.id = ? AND p.owner_user_id = ?)`,
    labelVersion: `INSERT INTO resource_project_version_labels (project_id, sequence, title, saved_at)
              SELECT s.project_id, s.last_version_sequence, ?, ? FROM resource_project_state s
              JOIN resource_projects p ON p.id = s.project_id
              WHERE s.project_id = ? AND p.owner_user_id = ?
              ON CONFLICT(project_id, sequence) DO UPDATE SET title = excluded.title, saved_at = excluded.saved_at`,
    deleteProject: "DELETE FROM resource_projects WHERE id = ? AND owner_user_id = ?",
    publishedSnapshot: `SELECT pub.snapshot_json FROM resource_project_publications pub
              JOIN resource_projects p ON p.id = pub.project_id
              WHERE pub.project_id = ? AND p.owner_user_id = ?`
  });
  var SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  var TEMPLATES = /* @__PURE__ */ new Set(["article", "slides", "hello", "clock", "mark", "chart", "ball", "stars", "blank", "html", "svg", "canvas"]);
  var ContentConflictError = class extends Error {
    constructor(kind) {
      super(`A ${kind} with that name already exists`);
      this.name = "ContentConflictError";
      this.code = `${kind}_taken`;
    }
  };
  var ContentValidationError = class extends Error {
    constructor(field, message) {
      super(message);
      this.name = "ContentValidationError";
      this.field = field;
    }
  };
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
      throw new ContentValidationError("slug", "name must use lowercase letters, numbers, and single hyphens");
    }
    return result;
  }
  function isUniqueError(error) {
    return /unique constraint/i.test(String(error?.message || error));
  }
  function limitError(error) {
    const message = String(error?.message || error);
    if (message.includes("resource_projects_global_limit")) return new ContentValidationError("project_limit", "The site project limit has been reached");
    if (message.includes("resource_projects_owner_limit")) return new ContentValidationError("project_limit", "An account can have at most 20 projects");
    if (message.includes("resource_organizations_owner_limit")) return new ContentValidationError("organization_limit", "An account can have at most 5 organizations");
    return null;
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
      createdAt: Number(row.created_at)
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
  function validatedSnapshot(value) {
    try {
      return normalizeProjectSnapshot(value);
    } catch (error) {
      throw new ContentValidationError("snapshot", error.message);
    }
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
      createdAt: Number(row.created_at)
    });
  }
  function createContentStore(client, {
    now = Date.now,
    randomId = () => crypto.randomUUID(),
    versionPlanner = planProjectVersionUpdate,
    snapshotDiffer = diffProjectSnapshots,
    snapshotValidator = async () => {
    }
  } = {}) {
    if (!client?.execute || !client?.batch) throw new Error("Content store requires a libSQL-compatible client");
    if (typeof versionPlanner !== "function") throw new Error("Content store requires a version planner");
    if (typeof snapshotDiffer !== "function") throw new Error("Content store requires a snapshot differ");
    if (typeof snapshotValidator !== "function") throw new Error("Content store requires a snapshot validator");
    let initialized2;
    const initialize2 = () => initialized2 ||= client.batch([...CONTENT_SCHEMA, ...ORGANIZATION_SCHEMA].map((sql) => ({ sql, args: [] })));
    return Object.freeze({
      initialize: initialize2,
      async getProject(namespace, projectSlug, viewerUserId = null) {
        await initialize2();
        const found = await client.execute({
          sql: CONTENT_QUERIES.projectByNamespace,
          args: [slug(namespace), slug(projectSlug)]
        });
        const row = found.rows[0];
        if (!row || row.visibility === "private" && String(row.owner_user_id) !== String(viewerUserId || "")) return null;
        return project(row);
      },
      async getProjectWorkspace(namespace, projectSlug, userId) {
        await initialize2();
        const found = await client.execute({
          sql: CONTENT_QUERIES.ownedWorkspace,
          args: [slug(namespace), slug(projectSlug), String(userId)]
        });
        const row = found.rows[0];
        if (!row) return null;
        return Object.freeze({
          project: project(row),
          snapshot: parsedSnapshot(row.snapshot_json),
          publishedSnapshot: parsedSnapshot(row.published_snapshot_json),
          hasUnpublishedChanges: String(row.snapshot_json) !== String(row.published_snapshot_json),
          versionCount: Number(row.last_version_sequence),
          updatedAt: Number(row.updated_at)
        });
      },
      async getPublicProjectWorkspace(namespace, projectSlug) {
        await initialize2();
        const found = await client.execute({
          sql: CONTENT_QUERIES.publicWorkspace,
          args: [slug(namespace), slug(projectSlug)]
        });
        const row = found.rows[0];
        if (!row) return null;
        return Object.freeze({ project: project(row), snapshot: parsedSnapshot(row.snapshot_json), versionCount: Number(row.last_version_sequence), updatedAt: Number(row.updated_at) });
      },
      async listPublicProjects({ limit = 24, namespaces } = {}) {
        await initialize2();
        const bounded = Math.max(1, Math.min(100, Number(limit) || 24));
        let allowedNamespaces = null;
        if (namespaces !== void 0) {
          if (!Array.isArray(namespaces)) throw new ContentValidationError("namespaces", "namespaces must be a list");
          allowedNamespaces = [...new Set(namespaces.map(slug))];
          if (!allowedNamespaces.length) return Object.freeze([]);
        }
        const namespaceJson = allowedNamespaces ? JSON.stringify(allowedNamespaces) : null;
        const found = await client.execute({
          sql: CONTENT_QUERIES.publicProjects,
          args: [namespaceJson, namespaceJson, bounded]
        });
        return Object.freeze(found.rows.map(project));
      },
      async getNamespace(namespaceValue, viewerUserId = null) {
        await initialize2();
        const namespace = slug(namespaceValue);
        const identity = await client.execute({
          sql: CONTENT_QUERIES.namespaceIdentity,
          args: [namespace, namespace]
        });
        if (!identity.rows[0]) return null;
        const found = await client.execute({
          sql: CONTENT_QUERIES.namespaceProjects,
          args: [namespace, String(viewerUserId || "")]
        });
        return Object.freeze({
          kind: String(identity.rows[0].kind),
          namespace: String(identity.rows[0].slug),
          name: String(identity.rows[0].name),
          projects: Object.freeze(found.rows.map(project))
        });
      },
      async listProjectVersions(projectId, userId) {
        await initialize2();
        const found = await client.execute({
          sql: CONTENT_QUERIES.versions,
          args: [String(projectId), String(userId)]
        });
        return Object.freeze(found.rows.map((row) => Object.freeze({
          sequence: Number(row.sequence),
          reason: String(row.reason),
          createdAt: Number(row.created_at),
          title: String(row.title || ""),
          savedAt: row.saved_at == null ? null : Number(row.saved_at),
          latest: Boolean(row.latest)
        })));
      },
      async getProjectVersion(projectId, sequence, userId) {
        await initialize2();
        const target = Number(sequence);
        if (!Number.isSafeInteger(target) || target < 1) throw new ContentValidationError("version", "version is invalid");
        const latest = await client.execute({
          sql: CONTENT_QUERIES.latestVersion,
          args: [String(projectId), String(userId)]
        });
        if (latest.rows[0] && Number(latest.rows[0].last_version_sequence) === target) {
          return parsedSnapshot(latest.rows[0].checkpoint_snapshot_json);
        }
        const found = await client.execute({
          sql: CONTENT_QUERIES.versionPatches,
          args: [String(projectId), String(userId), target]
        });
        if (!found.rows.length || Number(found.rows.at(-1).sequence) !== target) return null;
        let snapshot = emptyProjectSnapshot();
        for (const row of found.rows) snapshot = applyProjectPatch(snapshot, parsedPatch(row.patch_json));
        return snapshot;
      },
      async listForUser(userId) {
        await initialize2();
        const [organizations2, projects] = await Promise.all([
          client.execute({
            sql: CONTENT_QUERIES.organizationsForUser,
            args: [String(userId), String(userId)]
          }),
          client.execute({
            sql: CONTENT_QUERIES.projectsForUser,
            args: [String(userId)]
          })
        ]);
        return Object.freeze({
          organizations: Object.freeze(organizations2.rows.map(organization)),
          projects: Object.freeze(projects.rows.map(project))
        });
      },
      async createOrganization(userId, input) {
        await initialize2();
        let organizationSlug;
        try {
          organizationSlug = namespaceName(input.slug, { field: "organization name" });
        } catch (error) {
          throw new ContentValidationError("organization_name", error.message);
        }
        const value = {
          id: randomId(),
          slug: organizationSlug,
          name: text(input.name, "name", { min: 4, max: 80 }),
          description: text(input.description, "description", { max: 500 })
        };
        const timestamp = now();
        try {
          const occupied = await client.execute({
            sql: CONTENT_QUERIES.usernameExists,
            args: [organizationSlug]
          });
          if (occupied.rows[0]) throw new ContentConflictError("organization");
          await client.execute({
            sql: CONTENT_QUERIES.insertOrganization,
            args: [value.id, String(userId), value.slug, value.name, value.description, timestamp, timestamp]
          });
        } catch (error) {
          const limited = limitError(error);
          if (limited) throw limited;
          if (isUniqueError(error)) throw new ContentConflictError("organization");
          throw error;
        }
        return organization({ ...value, created_at: timestamp });
      },
      async createProject(userId, input) {
        await initialize2();
        const user = String(userId);
        const namespace = String(input.namespace || "user");
        let namespaceKind = "user";
        let namespaceId = user;
        let namespaceSlug = text(input.userSlug, "userSlug", { min: 1, max: 63 });
        if (namespace !== "user") {
          const found = await client.execute({
            sql: CONTENT_QUERIES.ownedOrganization,
            args: [namespace, user]
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
          template
        };
        const timestamp = now();
        const initialSnapshot = validatedSnapshot(input.snapshot || { files: [], config: {} });
        const initialPatch = diffProjectSnapshots(emptyProjectSnapshot(), initialSnapshot);
        try {
          await client.batch([{
            sql: CONTENT_QUERIES.insertProject,
            args: [
              value.id,
              user,
              value.namespace_kind,
              value.namespace_id,
              value.namespace_slug,
              value.slug,
              value.name,
              value.description,
              value.visibility,
              value.template,
              timestamp,
              timestamp
            ]
          }, {
            sql: CONTENT_QUERIES.insertState,
            args: [value.id, snapshotJson(initialSnapshot), snapshotJson(initialSnapshot), timestamp, timestamp]
          }, {
            sql: CONTENT_QUERIES.insertVersion,
            args: [value.id, 1, "initial", JSON.stringify(initialPatch), timestamp]
          }, {
            sql: CONTENT_QUERIES.insertInitialLabel,
            args: [value.id, timestamp]
          }, {
            sql: CONTENT_QUERIES.insertPublication,
            args: [value.id, snapshotJson(initialSnapshot), timestamp]
          }]);
        } catch (error) {
          const limited = limitError(error);
          if (limited) throw limited;
          if (isUniqueError(error)) throw new ContentConflictError("project");
          throw error;
        }
        return project({ ...value, created_at: timestamp });
      },
      async updateProject(userId, projectId, input) {
        await initialize2();
        const user = String(userId);
        const namespace = String(input.namespace || "user");
        let namespaceKind = "user";
        let namespaceId = user;
        let namespaceSlug = text(input.userSlug, "userSlug", { min: 1, max: 63 });
        if (namespace !== "user") {
          const found2 = await client.execute({
            sql: CONTENT_QUERIES.ownedOrganization,
            args: [namespace, user]
          });
          if (!found2.rows[0]) throw new ContentValidationError("namespace", "organization is not available");
          namespaceKind = "organization";
          namespaceId = String(found2.rows[0].id);
          namespaceSlug = String(found2.rows[0].slug);
        }
        const template = String(input.template || "blank");
        if (!TEMPLATES.has(template)) throw new ContentValidationError("template", "template is not available");
        const visibility = String(input.visibility || "public");
        if (visibility !== "public" && visibility !== "private") throw new ContentValidationError("visibility", "visibility is not available");
        try {
          const result = await client.execute({
            sql: CONTENT_QUERIES.updateProject,
            args: [
              namespaceKind,
              namespaceId,
              namespaceSlug,
              slug(input.slug),
              text(input.name, "name", { min: 1, max: 80 }),
              text(input.description, "description", { max: 500 }),
              visibility,
              template,
              now(),
              String(projectId),
              user
            ]
          });
          if (!Number(result.rowsAffected)) return null;
        } catch (error) {
          if (isUniqueError(error)) throw new ContentConflictError("project");
          throw error;
        }
        const found = await client.execute({
          sql: CONTENT_QUERIES.projectById,
          args: [String(projectId)]
        });
        return found.rows[0] ? project(found.rows[0]) : null;
      },
      async saveProjectSnapshot(userId, projectId, snapshotValue, { reason = "periodic", checkpointIntervalMs = 3e5, destructive = false } = {}) {
        await initialize2();
        const found = await client.execute({
          sql: CONTENT_QUERIES.projectState,
          args: [String(projectId), String(userId)]
        });
        const row = found.rows[0];
        if (!row) return null;
        const current = parsedSnapshot(row.snapshot_json);
        const checkpoint = parsedSnapshot(row.checkpoint_snapshot_json);
        const next = validatedSnapshot(snapshotValue);
        await snapshotValidator(next);
        const change = await snapshotDiffer(current, next);
        const pendingCheckpoint = await snapshotDiffer(checkpoint, current);
        const timestamp = now();
        const plan = await versionPlanner({
          changeEmpty: projectPatchIsEmpty(change),
          pendingCheckpointEmpty: projectPatchIsEmpty(pendingCheckpoint),
          destructive: destructive || destructivePatch(change),
          reason,
          checkpointDue: timestamp - Number(row.last_version_at) >= checkpointIntervalMs,
          lastVersionSequence: Number(row.last_version_sequence)
        });
        if (plan.state === "unchanged") {
          return Object.freeze({
            changed: false,
            versionCount: Number(row.last_version_sequence),
            snapshot: current
          });
        }
        if (plan.state === "checkpoint") {
          await client.batch([{
            sql: CONTENT_QUERIES.insertVersion,
            args: [
              String(projectId),
              plan.sequence,
              plan.checkpointVersionReason,
              JSON.stringify(pendingCheckpoint),
              timestamp
            ]
          }, {
            sql: CONTENT_QUERIES.checkpointState,
            args: [plan.sequence, timestamp, timestamp, String(projectId)]
          }]);
          return Object.freeze({ changed: true, versionCount: plan.sequence, snapshot: current });
        }
        const queries = [];
        let versionSequence = Number(row.last_version_sequence);
        if (plan.checkpointVersionReason) {
          versionSequence++;
          queries.push({
            sql: CONTENT_QUERIES.insertVersion,
            args: [
              String(projectId),
              versionSequence,
              plan.checkpointVersionReason,
              JSON.stringify(pendingCheckpoint),
              timestamp
            ]
          });
        }
        if (plan.nextVersionReason) {
          versionSequence++;
          const nextPatch = plan.nextVersionBase === "current" ? change : await snapshotDiffer(checkpoint, next);
          queries.push({
            sql: CONTENT_QUERIES.insertVersion,
            args: [
              String(projectId),
              versionSequence,
              plan.nextVersionReason,
              JSON.stringify(nextPatch),
              timestamp
            ]
          });
        }
        if (versionSequence !== plan.sequence) throw new Error("Project version plan is inconsistent");
        const checkpointSnapshot = plan.checkpointTarget === "next" ? next : checkpoint;
        queries.push({
          sql: CONTENT_QUERIES.updateState,
          args: [
            snapshotJson(next),
            snapshotJson(checkpointSnapshot),
            plan.sequence,
            plan.checkpointTarget === "unchanged" ? Number(row.last_version_at) : timestamp,
            timestamp,
            String(projectId)
          ]
        }, {
          sql: CONTENT_QUERIES.touchProject,
          args: [
            timestamp,
            TEMPLATES.has(String(next.config?.template || "")) ? String(next.config.template) : "",
            TEMPLATES.has(String(next.config?.template || "")) ? String(next.config.template) : "",
            String(projectId)
          ]
        });
        await client.batch(queries);
        return Object.freeze({ changed: true, versionCount: plan.sequence, snapshot: next });
      },
      async restoreProjectVersion(userId, projectId, sequence) {
        const snapshot = await this.getProjectVersion(projectId, sequence, userId);
        if (!snapshot) return null;
        return this.saveProjectSnapshot(userId, projectId, snapshot, { reason: "restore", destructive: true });
      },
      async publishProject(userId, projectId, { title = "" } = {}) {
        await initialize2();
        const timestamp = now();
        const versionTitle = text(title, "version title", { max: 80 });
        const result = await client.batch([{
          sql: CONTENT_QUERIES.publish,
          args: [String(projectId), String(userId), timestamp, String(projectId), String(projectId), String(userId)]
        }, {
          sql: CONTENT_QUERIES.labelVersion,
          args: [versionTitle, timestamp, String(projectId), String(userId)]
        }]);
        return Number(result[0].rowsAffected) > 0;
      },
      async deleteProject(userId, projectId) {
        await initialize2();
        const result = await client.execute({
          sql: CONTENT_QUERIES.deleteProject,
          args: [String(projectId), String(userId)]
        });
        return Number(result.rowsAffected) > 0;
      },
      async revertProjectToPublished(userId, projectId) {
        await initialize2();
        const found = await client.execute({
          sql: CONTENT_QUERIES.publishedSnapshot,
          args: [String(projectId), String(userId)]
        });
        if (!found.rows[0]) return null;
        return this.saveProjectSnapshot(userId, projectId, parsedSnapshot(found.rows[0].snapshot_json), { reason: "restore", destructive: true });
      }
    });
  }

  // packages/hub/src/migrations.js
  var MIGRATION_LEDGER_SCHEMA = `CREATE TABLE IF NOT EXISTS resource_schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
) STRICT`;
  var HUB_MIGRATIONS = Object.freeze([
    Object.freeze({ version: 1, name: "accounts-and-content", statements: Object.freeze([...ACCOUNT_SCHEMA, ...CONTENT_SCHEMA]) }),
    Object.freeze({ version: 2, name: "organization-memberships-and-notifications", statements: ORGANIZATION_SCHEMA }),
    Object.freeze({ version: 3, name: "project-version-labels", statements: Object.freeze([
      CONTENT_SCHEMA.find((statement) => statement.includes("CREATE TABLE IF NOT EXISTS resource_project_version_labels")),
      CONTENT_SCHEMA.find((statement) => statement.includes("INSERT OR IGNORE INTO resource_project_version_labels"))
    ]) })
  ]);
  function createMigrationRunner(client, { migrations: migrations2 = HUB_MIGRATIONS, now = Date.now } = {}) {
    if (!client?.execute || !client?.batch) throw new Error("Migration runner requires a libSQL-compatible client");
    let readyPromise;
    async function status() {
      await client.execute({ sql: MIGRATION_LEDGER_SCHEMA, args: [] });
      const result = await client.execute({
        sql: "SELECT version, name, applied_at FROM resource_schema_migrations ORDER BY version",
        args: []
      });
      const applied = result.rows.map((row) => Object.freeze({
        version: Number(row.version),
        name: String(row.name)
      }));
      return Object.freeze({
        current: migrations2.every((migration) => applied.some((entry) => entry.version === migration.version && entry.name === migration.name)),
        latestVersion: migrations2.at(-1)?.version || 0,
        appliedVersions: Object.freeze(applied.map((entry) => entry.version))
      });
    }
    async function migrate() {
      const before = await status();
      if (before.current) return before;
      for (const migration of migrations2) {
        const found = await client.execute({
          sql: "SELECT name FROM resource_schema_migrations WHERE version = ?",
          args: [migration.version]
        });
        if (found.rows[0]) {
          if (String(found.rows[0].name) !== migration.name) throw new Error(`Migration ${migration.version} has an unexpected name`);
          continue;
        }
        await client.batch([
          ...migration.statements.map((sql) => ({ sql, args: [] })),
          { sql: "INSERT OR IGNORE INTO resource_schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", args: [migration.version, migration.name, now()] }
        ]);
      }
      const after = await status();
      if (!after.current) throw new Error("Database migration did not reach the current version");
      return after;
    }
    return Object.freeze({
      status,
      ready() {
        if (!readyPromise) readyPromise = migrate().catch((error) => {
          readyPromise = null;
          throw error;
        });
        return readyPromise;
      }
    });
  }

  // packages/website/resources-application-guest.js
  if (typeof globalThis.TextEncoder !== "function") {
    globalThis.TextEncoder = class TextEncoder {
      encode(value) {
        const text2 = String(value);
        const bytes = [];
        for (const character of text2) {
          const point = character.codePointAt(0);
          if (point < 128) bytes.push(point);
          else if (point < 2048) bytes.push(192 | point >> 6, 128 | point & 63);
          else if (point < 65536) bytes.push(
            224 | point >> 12,
            128 | point >> 6 & 63,
            128 | point & 63
          );
          else bytes.push(
            240 | point >> 18,
            128 | point >> 12 & 63,
            128 | point >> 6 & 63,
            128 | point & 63
          );
        }
        return Uint8Array.from(bytes);
      }
    };
  }
  function compatibleResult(result) {
    const [columns, values, rowsAffected] = result;
    return {
      columns,
      rows: values.map((row) => Object.fromEntries(
        columns.map((column, index) => [column, row[index]])
      )),
      rowsAffected,
      lastInsertRowid: null
    };
  }
  var database = Object.freeze({
    async execute(query) {
      return compatibleResult(await hostCall(
        "sql",
        "execute",
        [query.sql, query.args || []]
      ));
    },
    async batch(queries) {
      const affected = await hostCall(
        "sql",
        "batch",
        queries.map((query) => [query.sql, query.args || []])
      );
      return affected.map((rowsAffected) => ({
        columns: [],
        rows: [],
        rowsAffected,
        lastInsertRowid: null
      }));
    }
  });
  var operationNow = 0;
  var randomIds = [];
  function nextRandomId() {
    if (!randomIds.length) throw new Error("Application operation lacks a random identifier");
    return randomIds.shift();
  }
  var accounts = createAccountStore(database, {
    now: () => operationNow,
    randomId: nextRandomId
  });
  var content = createContentStore(database, {
    now: () => operationNow,
    randomId: nextRandomId
  });
  var organizations = createOrganizationStore(database, {
    now: () => operationNow,
    randomId: nextRandomId
  });
  var migrations = createMigrationRunner(database);
  var initialized;
  function errorValue(error) {
    return {
      name: String(error?.name || "Error"),
      message: String(error?.message || error),
      code: typeof error?.code === "string" ? error.code : "",
      field: typeof error?.field === "string" ? error.field : "",
      providers: Array.isArray(error?.providers) ? [...error.providers] : []
    };
  }
  async function storeCall(storeName, method, args) {
    const stores = { account: accounts, content, organization: organizations };
    const store = stores[storeName];
    if (!store || typeof store[method] !== "function" || !Array.isArray(args)) {
      return ["error", {
        name: "Error",
        message: "Store operation is not available",
        code: "",
        field: "",
        providers: []
      }];
    }
    try {
      await initialize();
      operationNow = await hostCall("clock", "now", []);
      randomIds = method === "authenticateIdentity" || storeName === "content" && method === "createProject" ? [await hostCall("random", "uuid", [])] : [];
      return ["ok", await store[method](...args)];
    } catch (error) {
      return ["error", errorValue(error)];
    } finally {
      randomIds = [];
    }
  }
  function initialize() {
    initialized ||= migrations.ready().then(() => Promise.all([
      accounts.initialize(),
      content.initialize(),
      organizations.initialize()
    ]));
    return initialized;
  }
  globalThis.serverHandle = async function serverHandle(input) {
    if (!Array.isArray(input)) {
      return ["error", "unknown application operation"];
    }
    if (input[0] === "initialize") {
      await initialize();
      return ["ok"];
    }
    if (input[0] === "store" && input.length === 4) {
      return storeCall(input[1], input[2], input[3]);
    }
    return ["error", "unknown application operation"];
  };
})();

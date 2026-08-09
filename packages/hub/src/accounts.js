import { namespaceName } from "./names.js";

export const ACCOUNT_SCHEMA = Object.freeze([
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
    ON users(username COLLATE NOCASE)`,
]);

export class AccountConflictError extends Error {
  constructor(code, providers = []) {
    super(code === "email_taken" ? "An account already uses this email address"
      : code === "username_taken" ? "That username is already in use"
      : "This provider identity is already linked to another account");
    this.name = "AccountConflictError";
    this.code = code;
    this.providers = Object.freeze([...providers]);
  }
}

export class AccountSignupDisabledError extends Error {
  constructor() {
    super("Sign up is not currently enabled");
    this.name = "AccountSignupDisabledError";
    this.code = "signup_disabled";
  }
}

export class AccountValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "AccountValidationError";
    this.field = field;
  }
}

function normalizeEmail(value) {
  const email = String(value || "").trim();
  const separator = email.lastIndexOf("@");
  if (separator < 1 || separator === email.length - 1 || email.length > 254) {
    throw new Error("A verified provider email address is required");
  }
  // Deliberately avoid provider-specific dot/plus rewriting.
  return { email, normalized: email.toLowerCase() };
}

function firstRow(result) {
  return result?.rows?.[0] || null;
}

function accountFromRow(row) {
  return row && Object.freeze({
    id: String(row.id),
    login: String(row.username),
    name: String(row.display_name),
  });
}

export function createAccountStore(client, {
  now = Date.now,
  randomId = () => crypto.randomUUID(),
  allowedProviders = ["github", "gitlab"],
} = {}) {
  if (!client?.execute || !client?.batch) throw new Error("Account store requires a libSQL-compatible client");
  const providers = new Set(allowedProviders);
  if (!providers.size || [...providers].some((provider) => !/^[a-z][a-z0-9-]{0,63}$/.test(provider))) {
    throw new Error("Account store providers must be lowercase identifiers");
  }
  let initialized;

  function initialize() {
    initialized ||= client.batch(ACCOUNT_SCHEMA.map((sql) => ({ sql, args: [] })));
    return initialized;
  }

  async function providersForUser(userId) {
    const result = await client.execute({
      sql: "SELECT provider FROM user_identities WHERE user_id = ? ORDER BY provider",
      args: [userId],
    });
    return result.rows.map((row) => String(row.provider));
  }

  async function getAccount(userId) {
    await initialize();
    return accountFromRow(firstRow(await client.execute({
      sql: "SELECT id, display_name, username FROM users WHERE id = ?",
      args: [String(userId)],
    })));
  }

  return Object.freeze({
    initialize,
    getAccount,
    async updateUsername(userId, value) {
      await initialize();
      let username;
      try {
        username = namespaceName(value, { field: "username" });
      } catch (error) {
        throw new AccountValidationError("username", error.message);
      }
      const timestamp = now();
      try {
        const occupied = await client.execute({
          sql: "SELECT 1 FROM resource_organizations WHERE slug = ? COLLATE NOCASE LIMIT 1",
          args: [username],
        });
        if (occupied.rows[0]) throw new AccountConflictError("username_taken");
        const changed = await client.batch([{
          sql: "UPDATE users SET username = ?, updated_at = ? WHERE id = ?",
          args: [username, timestamp, String(userId)],
        }, {
          sql: `UPDATE resource_projects SET namespace_slug = ?, updated_at = ?
                WHERE namespace_kind = 'user' AND namespace_id = ?`,
          args: [username, timestamp, String(userId)],
        }]);
        if (!changed[0]?.rowsAffected) return null;
      } catch (error) {
        if (/unique constraint/i.test(String(error?.message || error))) throw new AccountConflictError("username_taken");
        throw error;
      }
      return getAccount(userId);
    },
    async authenticateIdentity(identity, { linkToUserId = null, allowCreate = true } = {}) {
      await initialize();
      if (!providers.has(identity.provider)) throw new Error("Unsupported identity provider");
      const providerUserId = String(identity.providerUserId);
      const { email, normalized } = normalizeEmail(identity.email);
      if (identity.emailVerified !== true) throw new Error("A verified provider email address is required");
      const timestamp = now();

      const identityResult = await client.execute({
        sql: `SELECT users.id, users.display_name, users.username
              FROM user_identities
              JOIN users ON users.id = user_identities.user_id
              WHERE provider = ? AND provider_user_id = ?`,
        args: [identity.provider, providerUserId],
      });
      const existingIdentity = firstRow(identityResult);
      if (existingIdentity) {
        if (linkToUserId && String(existingIdentity.id) !== String(linkToUserId)) {
          throw new AccountConflictError("identity_taken", await providersForUser(existingIdentity.id));
        }
        await client.batch([
          {
            sql: `UPDATE users SET display_name = ?, updated_at = ?
                  WHERE id = ?`,
            args: [identity.name, timestamp, existingIdentity.id],
          },
          {
            sql: `UPDATE user_identities SET provider_username = ?, updated_at = ?
                  WHERE provider = ? AND provider_user_id = ?`,
            args: [identity.login, timestamp, identity.provider, providerUserId],
          },
        ]);
        return accountFromRow({
          ...existingIdentity,
          display_name: identity.name,
          username: existingIdentity.username,
        });
      }

      if (!linkToUserId && !allowCreate) throw new AccountSignupDisabledError();

      const emailResult = await client.execute({
        sql: `SELECT users.id, users.display_name, users.username
              FROM user_emails
              JOIN users ON users.id = user_emails.user_id
              WHERE normalized_email = ?`,
        args: [normalized],
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
          sql: `INSERT INTO users (id, display_name, username, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [userId, identity.name, identity.login, timestamp, timestamp],
        });
      }
      if (!emailOwner) {
        statements.push({
          sql: `INSERT INTO user_emails
                  (normalized_email, email, user_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [normalized, email, userId, timestamp, timestamp],
        });
      }
      statements.push({
        sql: `INSERT INTO user_identities
                (provider, provider_user_id, user_id, provider_username, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [identity.provider, providerUserId, userId, identity.login, timestamp, timestamp],
      });
      await client.batch(statements);
      return Object.freeze({ id: userId, login: identity.login, name: identity.name });
    },
  });
}

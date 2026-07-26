const SCHEMA = [
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
];

export function createAccountStore(client, { now = Date.now } = {}) {
  if (!client?.execute || !client?.batch) throw new Error("Account store requires a libSQL-compatible client");
  let initialized;

  function initialize() {
    initialized ||= client.batch(SCHEMA.map((sql) => ({ sql, args: [] })));
    return initialized;
  }

  return Object.freeze({
    async upsertIdentity(identity) {
      await initialize();
      if (!["github", "gitlab"].includes(identity.provider)) throw new Error("Unsupported identity provider");
      const providerUserId = String(identity.providerUserId);
      const userId = `${identity.provider}:${providerUserId}`;
      const timestamp = now();
      await client.batch([
        {
          sql: `INSERT INTO users (id, display_name, username, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  display_name = excluded.display_name,
                  username = excluded.username,
                  updated_at = excluded.updated_at`,
          args: [userId, identity.name, identity.login, timestamp, timestamp],
        },
        {
          sql: `INSERT INTO user_identities
                  (provider, provider_user_id, user_id, provider_username, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(provider, provider_user_id) DO UPDATE SET
                  provider_username = excluded.provider_username,
                  updated_at = excluded.updated_at`,
          args: [identity.provider, providerUserId, userId, identity.login, timestamp, timestamp],
        },
      ]);
      return Object.freeze({ id: userId, login: identity.login, name: identity.name });
    },
  });
}

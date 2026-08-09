function result(statement, args) {
  if (/^\s*(?:SELECT|WITH|PRAGMA)\b/i.test(statement.sourceSQL)) {
    return { rows: statement.all(...args) };
  }
  const change = statement.run(...args);
  return { rows: [], rowsAffected: Number(change.changes), lastInsertRowid: change.lastInsertRowid };
}

export function createNodeSqliteClient(db) {
  if (!db?.prepare || !db?.exec) throw new Error("Node SQLite adapter requires a DatabaseSync instance");
  return Object.freeze({
    async execute(query) {
      const statement = db.prepare(query.sql);
      return result(statement, query.args || []);
    },
    async batch(queries) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const results = queries.map((query) => result(db.prepare(query.sql), query.args || []));
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  });
}

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quote(name) {
  if (!identifier.test(name)) throw new Error(`Invalid SQLite identifier: ${name}`);
  return `"${name}"`;
}

export class SqliteUse {
  constructor(db, config) {
    this.db = db;
    this.table = quote(config.table);
    this.key = config.key || "id";
    this.columns = config.columns || [];
    this.writable = config.writable || this.columns;
    for (const name of [this.key, ...this.columns, ...this.writable]) quote(name);
  }

  list() {
    return this.db.prepare(`SELECT ${[this.key, ...this.columns].map(quote).join(", ")} FROM ${this.table} ORDER BY ${quote(this.key)}`).all();
  }

  create(value) {
    const fields = this.writable.filter((name) => value[name] !== undefined);
    if (!fields.length) throw new Error("No writable fields supplied");
    const result = this.db.prepare(`INSERT INTO ${this.table} (${fields.map(quote).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`).run(...fields.map((name) => value[name]));
    return this.get(Number(result.lastInsertRowid));
  }

  get(id) {
    return this.db.prepare(`SELECT ${[this.key, ...this.columns].map(quote).join(", ")} FROM ${this.table} WHERE ${quote(this.key)} = ?`).get(id);
  }

  update(id, value) {
    const fields = this.writable.filter((name) => value[name] !== undefined);
    if (!fields.length) throw new Error("No writable fields supplied");
    this.db.prepare(`UPDATE ${this.table} SET ${fields.map((name) => `${quote(name)} = ?`).join(", ")} WHERE ${quote(this.key)} = ?`).run(...fields.map((name) => value[name]), id);
    return this.get(id);
  }

  delete(id) {
    const item = this.get(id);
    this.db.prepare(`DELETE FROM ${this.table} WHERE ${quote(this.key)} = ?`).run(id);
    return item;
  }
}

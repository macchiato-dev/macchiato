# @macchiato-dev/sqlite-use

`sqlite-use` exposes a deliberately small, schema-configured CRUD capability
over a caller-owned SQLite connection. Configuration fixes the table, primary
key, readable columns, and writable columns before any values are accepted.
Identifiers are validated and quoted; record values are bound parameters.

```js
import { DatabaseSync } from "node:sqlite";
import { SqliteUse } from "@macchiato-dev/sqlite-use";

const db = new DatabaseSync(":memory:");
db.exec("create table notes (id integer primary key, title text, secret text)");

const notes = new SqliteUse(db, {
  table: "notes",
  key: "id",
  columns: ["title"],
  writable: ["title"],
});
```

Only `id` and `title` can be returned through this capability; `secret` is not
part of its readable projection. This package does not open databases, run
migrations, authorize users, or expose arbitrary SQL. Those remain application
or adapter responsibilities.

The database object only needs the synchronous `prepare().all/get/run`
interface used by `node:sqlite`, so compatible adapters can provide the same
surface.

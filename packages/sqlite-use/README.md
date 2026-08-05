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

The planned container model adds a scoped layer above this primitive. A user or
organization container supplies an authenticated actor, owning container ID,
membership/role, and row policy to a named database capability. Guest code must
not provide its own trusted tenant ID or authorization predicate. SQLite does
not need native row-level-security syntax for the contract: an adapter can bind
host-owned predicates into prepared operations and fail closed, while database
backends with native RLS can enforce the same matrix again. See
[`docs/project-activity-log.md`](../../docs/project-activity-log.md#user-and-organization-containers).

The database object only needs the synchronous `prepare().all/get/run`
interface used by `node:sqlite`, so compatible adapters can provide the same
surface.

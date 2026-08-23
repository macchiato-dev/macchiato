# @macchiato-dev/sql-use

`sql-use` gives a machine guest named database operations without giving it
SQL authority. Every statement, argument position, read/write classification,
row limit, and host-owned context value is fixed before the guest runs.

```js
const projects = new SqlUse({
  read: readOnlyClient,
  write: mutationClient,
  operations: {
    "project.list": {
      kind: "read",
      sql: "SELECT id, name FROM projects WHERE owner_id = ? LIMIT 21",
      parameters: [{ source: "context", name: "owner-id" }],
      maxRows: 20,
    },
  },
});
```

The guest can call `project.list`; it cannot change the table, projection,
predicate, or tenant ID. A controller supplies context after authentication.
Read and write clients are separate so Bunny Database's read-only token can be
used for queries without granting mutation authority.

`createSqlUseClient` is a transitional adapter for trusted existing models. It
maps their exact SQL strings to explicit operation names and rejects any
statement missing from the build-time policy. It is never exposed to guests.

This package is backend-neutral and consumes the libSQL-style
`execute({ sql, args })` shape. `sqlite-use` remains the smaller synchronous
CRUD primitive for caller-owned `node:sqlite` connections.

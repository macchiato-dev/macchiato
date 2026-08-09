# Bunny Database operations

Bunny Database is a remote libSQL/SQLite-compatible service currently in public
preview. Treat its durability machinery and an operator backup as different
things.

## Service durability

Bunny documents a primary/replica write path, WAL persistence to storage every
10 seconds or 4,096 frames, hourly full snapshots while online, and a full
snapshot when the database becomes idle. Recovery downloads the latest snapshot
and replays later WAL segments. These service-managed snapshots support Bunny's
recovery process; the current public documentation does not describe them as a
customer-selectable point-in-time backup or provide a documented restore API.

Source: [Durability and Consistency](https://docs.bunny.net/database/durability-and-consistency).

## Operator-controlled backup

Until Bunny documents a snapshot export/restore API, keep a separate logical
backup under operator control:

1. Use a full-access token dedicated to backup automation.
2. Record the current `resource_schema_migrations` rows first.
3. Export every application table in a stable primary-key order using the Bunny
   Database Shell or a libSQL client. Include schema SQL from `sqlite_schema`.
4. Write a manifest containing database identity, UTC time, migration version,
   table names, row counts, and SHA-256 digests.
5. Encrypt the export before placing it in separately credentialed object
   storage with retention/versioning.
6. Restore into a new staging database, run the normal migration command, and
   compare row counts and application invariants before calling it a backup.

The official shell accepts SQL files and supports JSON and CSV output. Avoid
putting tokens on the command line when the environment variables
`BUNNY_DATABASE_URL` and `BUNNY_DATABASE_AUTH_TOKEN` can be scoped to the
process. See [Bunny Database Shell](https://docs.bunny.net/database/connect/database-shell).

A collection of independent table exports is not automatically a transactionally
consistent snapshot while writes continue. For a strict backup, briefly quiesce
mutations or use a future documented snapshot/export facility. Do not claim
point-in-time recovery until a restore drill has demonstrated it.

## Migrations and rollback

The Edge bootstrap serves cacheable anonymous home content without database
authority. Database-backed routes load the deferred application bundle, which
checks `resource_schema_migrations`. A current database proceeds immediately;
an old database runs ordered SQL migrations behind one shared promise while
requests wait. Failures return `503` without caching and can retry.

Before deployment, run the same coordinator explicitly:

```sh
deno run --config packages/website/deno.json \
  --allow-env=BUNNY_DATABASE_URL,BUNNY_DATABASE_AUTH_TOKEN \
  --allow-net \
  packages/website/migrate-bunny-database.js
```

Back up and restore-test before destructive migrations. Prefer additive schema
changes, dual-read/dual-write transitions where necessary, and a new deployment
that can operate against both adjacent schema versions during rollout.

# @macchiato-dev/app

Cross-runtime HTTP server. Serves a page per subdomain with SQLite-backed site routing.

No default data directory is provided. You must specify one explicitly.

## Quick start (Deno)

Create the data directory first:

```bash
mkdir -p ~/macchiato-dev-data
```

Then run the server:

```bash
deno run --allow-net=:8765 --allow-read=$HOME/macchiato-dev-data,../../examples/todo --allow-write=$HOME/macchiato-dev-data src/index.js --data-dir $HOME/macchiato-dev-data
```

Then open `http://example.localhost:8765`.

### Bind to all interfaces (containers)

```bash
mkdir -p ~/macchiato-dev-data
deno run --allow-net=[::]:8765 --allow-read=$HOME/macchiato-dev-data,../../examples/todo --allow-write=$HOME/macchiato-dev-data src/index.js -b 0.0.0.0 --data-dir $HOME/macchiato-dev-data
```

## Manage sites (Deno REPL)

```bash
deno repl --allow-read=$HOME/macchiato-dev-data --allow-write=$HOME/macchiato-dev-data
```

```javascript
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("/root/macchiato-dev-data/macchiato.sqlite3");
const stmt = db.prepare("INSERT INTO sites VALUES (?, ?)");
stmt.run("todo", "../../examples/todo");
db.close();
```

## Test database

Use a `testdata/` directory for ephemeral test databases. It is gitignored by convention:

```bash
mkdir -p testdata
deno run --allow-net=:8765 --allow-read=testdata,../../examples/todo --allow-write=testdata src/index.js --data-dir testdata
```

Or point directly to a specific SQLite file:

```bash
deno run --allow-net=:8765 --allow-read=$HOME/macchiato-dev-data/test.sqlite3,../../examples/todo --allow-write=$HOME/macchiato-dev-data/test.sqlite3 src/index.js --db $HOME/macchiato-dev-data/test.sqlite3
```

## Node.js

```bash
node src/index.js --data-dir ~/macchiato-dev-data
```

## Bun

```bash
bun run src/index.js --data-dir ~/macchiato-dev-data
```

## Options

| Flag | Description |
|------|-------------|
| `--data-dir` | Base directory for the SQLite database (required unless `--db` is used) |
| `--db` | Exact SQLite database path (required unless `--data-dir` is used) |
| `-b`, `--host` | Bind address (default: `127.0.0.1`) |
| `-p`, `--port` | Port (default: `8765`) |

## Site routing

Subdomains are first looked up in `site_pages`. These rows store HTML, CSS,
DOM schema JSON or schema names, CSS schema JSON or schema names, and a sandbox
flag in SQLite. If no `site_pages` row matches, the server falls back to the
older `sites` directory table.

```sql
CREATE TABLE schemas (
  name TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

CREATE TABLE site_pages (
  subdomain TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL,
  css TEXT NOT NULL DEFAULT '',
  dom_schema_json TEXT NOT NULL,
  css_schema_json TEXT NOT NULL,
  sandboxed INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sites (subdomain TEXT PRIMARY KEY, directory TEXT NOT NULL);
INSERT INTO sites VALUES ('todo', './examples/todo');

CREATE TABLE font_assets (
  name TEXT NOT NULL,
  asset_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content BLOB NOT NULL,
  provider TEXT NOT NULL DEFAULT 'self',
  source_url TEXT NOT NULL DEFAULT '',
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name, asset_path)
);
```

Font assets are served from SQLite under `/-/fonts/<name>/<asset-path>`.
Populate the cache explicitly:

```bash
node ../macchiato/src/macchiato.js --data-dir ~/macchiato-dev-data \
  font add resourcesco-space-grotesk space-grotesk-latin.woff2 \
  ../../examples/resources-website/assets/fonts/space-grotesk-latin.woff2 \
  --provider self \
  --source-url https://github.com/floriankarsten/space-grotesk
```

Provider-backed fetching and non-SQLite storage are intentionally separate
future policy decisions. The first implementation caches and serves known local
font bytes from SQLite so pages do not unintentionally contact a font provider.

Unmatched subdomains fall back to `<h1>subdomain</h1>`.

The database uses SQLite in WAL mode. The `-wal` and `-shm` files live next to the database file and are managed automatically.

## Prior art

Prometheus uses `--storage.tsdb.path` to explicitly specify where its time-series database lives. Bitcoin Core uses `-datadir`. Following the same pattern, this server requires `--data-dir` or `--db` so the operator always knows where data is stored.

## Publishing

```bash
npm publish --access public
```

After publishing, use via `npx`:

```bash
npx @macchiato-dev/app --data-dir ~/macchiato-dev-data
```

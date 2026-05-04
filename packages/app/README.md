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
deno run --allow-net=:8765 --allow-read=$HOME/macchiato-dev-data,../../experiments/todo --allow-write=$HOME/macchiato-dev-data src/index.js --data-dir $HOME/macchiato-dev-data
```

Then open `http://example.localhost:8765`.

### Bind to all interfaces (containers)

```bash
mkdir -p ~/macchiato-dev-data
deno run --allow-net=[::]:8765 --allow-read=$HOME/macchiato-dev-data,../../experiments/todo --allow-write=$HOME/macchiato-dev-data src/index.js -b 0.0.0.0 --data-dir $HOME/macchiato-dev-data
```

## Manage sites (Deno REPL)

```bash
deno repl --allow-read=$HOME/macchiato-dev-data --allow-write=$HOME/macchiato-dev-data
```

```javascript
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("/root/macchiato-dev-data/macchiato.sqlite3");
const stmt = db.prepare("INSERT INTO sites VALUES (?, ?)");
stmt.run("todo", "../../experiments/todo");
db.close();
```

## Test database

Use a `testdata/` directory for ephemeral test databases. It is gitignored by convention:

```bash
mkdir -p testdata
deno run --allow-net=:8765 --allow-read=testdata,../../experiments/todo --allow-write=testdata src/index.js --data-dir testdata
```

Or point directly to a specific SQLite file:

```bash
deno run --allow-net=:8765 --allow-read=$HOME/macchiato-dev-data/test.sqlite3,../../experiments/todo --allow-write=$HOME/macchiato-dev-data/test.sqlite3 src/index.js --db $HOME/macchiato-dev-data/test.sqlite3
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

Subdomains are looked up in the `sites` table. If a row matches, `index.html` is served from the mapped directory.

```sql
CREATE TABLE sites (subdomain TEXT PRIMARY KEY, directory TEXT NOT NULL);
INSERT INTO sites VALUES ('todo', './experiments/todo');
```

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

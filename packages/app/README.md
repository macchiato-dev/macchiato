# @macchiato-dev/app

Cross-runtime HTTP server. Serves a page per subdomain with SQLite-backed site routing.

## Quick start (Deno)

```bash
deno run --allow-net=:8765 --allow-read=data,../../experiments/todo --allow-write=data src/index.js
```

Then open `http://example.localhost:8765`.

### Minimal permissions

The `data/` directory holds the SQLite database and its WAL files:

```bash
deno run --allow-net=:8765 --allow-read=data,../../experiments/todo --allow-write=data src/index.js
```

To bind to all interfaces (containers):

```bash
deno run --allow-net=[::]:8765 --allow-read=data,../../experiments/todo --allow-write=data src/index.js -b 0.0.0.0
```

## Manage sites (Deno REPL)

```bash
cd packages/app
deno repl --allow-read=data --allow-write=data
```

```javascript
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/macchiato.sqlite3");
const stmt = db.prepare("INSERT INTO sites VALUES (?, ?)");
stmt.run("todo", "../../experiments/todo");
db.close();
```

## Test database

Use a separate database for testing:

```bash
deno run --allow-net=:8765 --allow-read=data,../../experiments/todo --allow-write=data src/index.js --db data/test.sqlite3
```

## Node.js

```bash
node src/index.js
```

## Bun

```bash
bun run src/index.js
```

## Options

| Flag | Description |
|------|-------------|
| `-b`, `--host` | Bind address (default: `127.0.0.1`) |
| `-p`, `--port` | Port (default: `8765`) |
| `-d`, `--db` | SQLite database path (default: `data/macchiato.sqlite3`) |

## Site routing

Subdomains are looked up in the `sites` table. If a row matches, `index.html` is served from the mapped directory.

```sql
CREATE TABLE sites (subdomain TEXT PRIMARY KEY, directory TEXT NOT NULL);
INSERT INTO sites VALUES ('todo', './experiments/todo');
```

Unmatched subdomains fall back to `<h1>subdomain</h1>`.

The database uses SQLite in WAL mode. The `-wal` and `-shm` files live in the same directory and are managed automatically.

## Publishing

```bash
npm publish --access public
```

After publishing, use via `npx`:

```bash
npx @macchiato-dev/app -b 0.0.0.0
```

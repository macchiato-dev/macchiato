# macchiato

A self-hosted app platform.

## Dependency Policy

Packages in this monorepo specify **exact versions** for all dependencies.
Nested dependencies may technically be pulled in by npm during installation,
but the project does not serve files from nested `node_modules` packages.
Each package is responsible for its own runtime surface and should not
expose its transitive dependency tree over the network.

This policy is pragmatic, not dogmatic — exceptions may exist where
strict exact-version pinning would create unnecessary friction.

## Running with Deno

`deno install` grants permissions — it cannot preset environment variables.
Use CLI flags or the SQLite database for runtime configuration.

### Install the server directly (tightest permissions)

Best for running just the HTTP server without the interactive shell:

```bash
deno install \
  --allow-net=[::]:3030 \
  --allow-read=$HOME/.macchiato/default \
  --allow-write=$HOME/.macchiato/default \
  --allow-env=HOME,USERPROFILE \
  ./packages/app/src/index.js
```

Then run it on port 3030:

```bash
macchiato-app --port 3030
```

### Install the full CLI (includes interactive shell)

The `macchiato` CLI can start and stop the server from an interactive shell.
In Deno this requires `--allow-run` to spawn the server process:

```bash
deno install \
  --allow-net=[::]:3030 \
  --allow-read=$HOME/.macchiato/default \
  --allow-write=$HOME/.macchiato/default \
  --allow-env=HOME,USERPROFILE \
  --allow-run=deno \
  ./packages/macchiato/src/macchiato.js
```

Then:

```bash
macchiato                          # enter interactive shell
macchiato> server start --port 3030
macchiato> site add todo ../../experiments/todo
```

## dom-use end-to-end demo

The `experiments/dom-use-demo` app exercises the schema-bound guest DOM in a
browser. It is served like any other Macchiato app: add a row to the SQLite
site table, start the app server, and open the subdomain.

```bash
node packages/macchiato/src/macchiato.js site add dom-use-demo /root/macchiato/experiments/dom-use-demo
node packages/app/src/index.js
```

Then open:

```text
http://dom-use-demo.localhost:8765
```

The demo imports the workspace `@macchiato-dev/dom-use` package through the
app server, builds a guest tree, renders it into the real DOM, serializes the
guest tree, and shows blocked element, attribute, and style operations.

### Permission notes

| Flag | What it allows |
|------|---------------|
| `--allow-net=[::]:3030` | Bind the server to port 3030 on all interfaces (IPv6 dual-stack) |
| `--allow-read=$HOME/.macchiato/default` | Read the SQLite database |
| `--allow-write=$HOME/.macchiato/default` | Write the SQLite database (WAL creates `-wal` and `-shm` siblings) |
| `--allow-env=HOME,USERPROFILE` | Resolve the `~/.macchiato/default` data directory |
| `--allow-run=deno` | *(CLI only)* Spawn the server as a subprocess |

If you only need localhost (not `0.0.0.0`), replace `[::]:3030` with `127.0.0.1:3030`.

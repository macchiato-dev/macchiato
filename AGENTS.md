# AGENTS.md

## Runtime

Use a current Node.js release when working on this repository. The project uses
`node:sqlite`; older Node 22 builds may print an experimental warning for that
module. Newer Node releases mark `node:sqlite` as a release-candidate API and
avoid that warning.

Check the local runtime with:

```bash
node -v
npm -v
node -p "process.versions.sqlite"
```

## Development History

Commit at useful, coherent checkpoints often enough that meaningful
work-in-progress remains visible. There is no need to commit every tiny edit.
Experimental commits are welcome: it is fine to backtrack when an approach does
not work, and seeing that evolution is useful when reviewing the project.
If substantial work has accumulated without a checkpoint, commit a coherent
portion with `WIP` in the message even when it is not fully verified. Follow it
with a correcting or completing commit after testing rather than hiding the
intermediate state in a long-running worktree.

## Running the Server

For local development, pick a port that is free on your machine. The examples
below use `8765`, which is the app package default and is usually available for
local self-hosting.

```bash
cd /path/to/macchiato
node packages/app/src/index.js --host 127.0.0.1 --port 8765
```

A fresh database initializes only the `core` app-directory preset. For the full
repository demo set, use `--app-plugin development`. See
`docs/declarative-apps.md` for persistent installation and subdomain mapping.

If running inside a container or VM and exposing the port to the host, bind to
all interfaces inside the container:

```bash
node packages/app/src/index.js --host 0.0.0.0 --port 8765
```

Useful local URLs after installing the relevant apps:

```text
http://macchiato.localhost:8765
http://dom-use.localhost:8765
http://dom-use-todos.localhost:8765
http://todo.localhost:8765
```

## Site Configuration

List configured SQLite-backed sites with:

```bash
node packages/macchiato/src/macchiato.js site list
```

Use `--data-dir <dir>` before the command when you want an explicit SQLite
directory, for example:

```bash
node packages/macchiato/src/macchiato.js --data-dir ./macchiato-dev-data site list
node packages/app/src/index.js --data-dir ./macchiato-dev-data --host 127.0.0.1 --port 8765
```

Add a site with:

```bash
node packages/macchiato/src/macchiato.js schema add \
  @macchiato-dev/dom-use@0.0.1/article.json \
  examples/dom-use-demo/dom.schema.json

node packages/macchiato/src/macchiato.js schema add \
  @macchiato-dev/style-use@0.0.1/basic.json \
  examples/dom-use-demo/css.schema.json

node packages/macchiato/src/macchiato.js site add-page \
  dom-use \
  examples/dom-use-demo/page.html \
  examples/dom-use-demo/style.css \
  @macchiato-dev/dom-use@0.0.1/article.json \
  @macchiato-dev/style-use@0.0.1/basic.json \
  --title "Neighborhood Library"
```

The app server routes by subdomain, so a `dom-use` row is served at
`http://dom-use.localhost:<port>`.

## Copying Container Files to the macOS Clipboard

The repository normally runs in the `macchiato-vibe` Podman container inside
Lima, while `pbcopy` belongs to the macOS host. To copy a generated or source
file out of the container, stream it through `podman exec` and pipe it to the
host clipboard. In an environment that uses `!` for host shell commands, copy
the Bunny nested-worker probe with:

```bash
!lima podman exec macchiato-vibe cat /root/macchiato/examples/bunny-edge-worker-probe/worker-probe.js | pbcopy
```

Use the same form for other files, changing only the absolute container path.
Do not run `pbcopy` inside the container.

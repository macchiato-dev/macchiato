# macchiato

A self-hosted app platform.

## Components

Macchiato is split into small packages with explicit boundaries. The runtime
server composes them, but the policy and validation pieces are reusable on
their own.

| Component | Description |
|-----------|-------------|
| [`@macchiato-dev/app`](packages/app/) | Cross-runtime HTTP server. Routes only declaratively registered apps by subdomain and serves their handlers or SQLite-backed content. |
| [`@macchiato-dev/macchiato`](packages/macchiato/) | CLI and interactive shell for managing the local Macchiato database: sites, schemas, routes, fonts, and server lifecycle helpers. |
| [`@macchiato-dev/app-db-sqlite`](packages/app-db-sqlite/) | SQLite storage layer for app configuration. Owns schema creation, migrations, query helpers, and prepared-statement-backed access for the app database without becoming a full ORM. |
| [`@macchiato-dev/site`](packages/site/) | SSR site framework for full HTML documents, route rows, transition policy, trusted pre-sanitized page swaps, and fallback navigation. |
| [`@macchiato-dev/dom-use`](packages/dom-use/) | Top-level schema-bound DOM capability. Guest code creates and mutates DOM through this package, which enforces allowed nodes, attributes, parent/child relationships, URL rules, content limits, and DOM gas budgets. |
| [`@macchiato-dev/html-use`](packages/html-use/) | Lower-level HTML parser, serializer, and sanitizer used by `dom-use`. It receives the caller's element factory and schema instead of importing `dom-use` directly. |
| [`@macchiato-dev/style-use`](packages/style-use/) | CSS policy engine for inline styles and stylesheets. Schemas declare allowed properties, value patterns, selectors, at-rules, URL loading, imports, and stylesheet limits. |
| [`@macchiato-dev/theme-use`](packages/theme-use/) | Validates named, allowlisted CSS custom-property themes and renders customizable theme declarations without permitting active CSS values. |
| [`@macchiato-dev/menu-use`](packages/menu-use/) | Defines one immutable primary-navigation model and renders matching desktop, mobile, and document-runtime menus. |
| [`@macchiato-dev/user-menu-use`](packages/user-menu-use/) | Compiles declarative user-menu definitions into markup, colocated `dom-use` schema capability, and an exclusive open/close state machine suitable for a sandbox. |
| [`@macchiato-dev/font-use`](packages/font-use/) | Font asset cache helpers. Validates font names and paths, stores known font bytes in SQLite, emits stable `/-/fonts/...` URLs, and builds `@font-face` declarations. |
| [`@macchiato-dev/quickjs-emscripten-sandbox`](packages/quickjs-emscripten-sandbox/) | QuickJS-backed JavaScript sandbox. Runs guest JavaScript with explicit host capabilities and provides browser assets used by the DOM sandbox examples. |
| [`@macchiato-dev/dashboard`](packages/dashboard/) | Small management UI for local site mappings. It is a development convenience, not the core storage or policy layer. |

The core capability stack is:

```text
dom-use
  |-- html-use
  `-- style-use
```

`dom-use` is what guest contexts interact with. `html-use` and `style-use` are
implementation capabilities that can also be used directly where lower-level
HTML or CSS validation is needed.

## Examples

App installation, dependency mapping, and the minimal default are described in
[Declarative apps](docs/declarative-apps.md).

| Example | Description |
|---------|-------------|
| `examples/dom-use-demo` | SQLite-backed page example. Imports an HTML fragment, stylesheet, DOM schema, and CSS schema into the app database and serves the result at `dom-use.localhost`. |
| `examples/dom-use-todos` | QuickJS-backed todo app. Passes `examples/todo/index.html` into the guest runtime and applies `dom-use` validation to every guest DOM operation. |
| `examples/resources-site` | SQLite-backed and static-exported Resources.co example site, including route rows, local fonts, and a Bunny edge-script export path. |
| `examples/resources-website` | Multi-page Resources.co website example used for schema-bound page, style, navigation, prefetch, and transition work. |
| `examples/todo` | Standalone prototype of a guest-side DOM simulation with host-side rendering. |
| `examples/todo-matrix` | QuickJS/schema-constrained todo matrix app with local storage and grid interaction. |

## Dependency Policy

Packages in this monorepo specify **exact versions** for all dependencies.
Nested dependencies may technically be pulled in by npm during installation,
but the project does not serve files from nested `node_modules` packages.
Each package is responsible for its own runtime surface and should not
expose its transitive dependency tree over the network.

This policy is pragmatic, not dogmatic — exceptions may exist where
strict exact-version pinning would create unnecessary friction.

The proposed npm release groups, dependency order, and release gates are in
[docs/npm-publishing.md](docs/npm-publishing.md). Public publishing is blocked
until the repository has an explicit license.

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
macchiato> site add todo ../../examples/todo
```

## dom-use SQLite page example

The `examples/dom-use-demo` example is configured as a SQLite-backed page. Its
HTML fragment, CSS, DOM schema, CSS schema, and sandbox flag are stored in the
database. The browser receives only the rendered HTML and CSS.

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

node packages/app/src/index.js --app-plugin dom-use-todos
```

Then open:

```text
http://dom-use.localhost:8765
```

## dom-use QuickJS todo example

The `examples/dom-use-todos` example passes `examples/todo/index.html`
unchanged into QuickJS. A guest-side parser and DOM wrapper run the inline
module there while host-owned `dom-use` validates each DOM operation.

```bash
node packages/app/src/index.js
```

Then open:

```text
http://dom-use-todos.localhost:8765
```

To use a specific SQLite directory instead of the default
`~/.macchiato/default`, pass the same data directory to both commands:

```bash
node packages/macchiato/src/macchiato.js --data-dir ./macchiato-dev-data site list
node packages/app/src/index.js --data-dir ./macchiato-dev-data
```

### Permission notes

| Flag | What it allows |
|------|---------------|
| `--allow-net=[::]:3030` | Bind the server to port 3030 on all interfaces (IPv6 dual-stack) |
| `--allow-read=$HOME/.macchiato/default` | Read the SQLite database |
| `--allow-write=$HOME/.macchiato/default` | Write the SQLite database (WAL creates `-wal` and `-shm` siblings) |
| `--allow-env=HOME,USERPROFILE` | Resolve the `~/.macchiato/default` data directory |
| `--allow-run=deno` | *(CLI only)* Spawn the server as a subprocess |

If you only need localhost (not `0.0.0.0`), replace `[::]:3030` with `127.0.0.1:3030`.

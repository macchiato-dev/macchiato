# Declarative apps

## Storage-neutral standalone apps

`@macchiato-dev/declarative-app-server` runs a validated app declaration
without the registry, SQLite, or the full server. A declaration combines the
standard layout with a content area whose block types are explicitly allowed.
Applications import block implementations; they do not proxy whole apps from
subdomains.

The lower-level `standard-web-app` format is for existing app-shaped HTML, CSS,
and JavaScript. Its configuration points at those files plus HTML/CSS schemas
and a trusted runtime bootstrap. The loader removes authored script tags,
validates HTML and each stylesheet independently, preserves external stylesheet
URLs, and exposes JavaScript only as ordered guest source for the QuickJS
bootstrap. `macchiato-detect-app` reports whether this configuration is present
and complete so other programs—and eventually a skill—can use one stable
detection contract.

`packages/code-editor-use/examples/basic` is an independent nested npm project demonstrating
both modes. `npm start` uses its minimal server and `PORT` (or a system-selected
free port). `app install code-editor-use` records an optional main-server
subdomain mapping. In that second mode SQLite is only the operator's catalog;
the same declaration, layout, code-editor block, and handler remain imported
modules. Its README has the complete commands.

`app_configs` is the only app routing registry. Files, route rows, imported
handlers, and plugin code are inert until an app declaration maps them to a
subdomain.

## Local Hub authoring

Hub is the first-party management and discovery application for the broader
platform. It is expected to run normally on localhost, not only as a hosted
service. A local installation can provide project creation, editing, preview,
container selection, app configuration, and publication from a normal hostname
such as `hub.localhost:<port>`. The resulting apps remain ordinary declarative
apps; authoring through Hub does not create a second routing or execution
system.

Running apps does not require running a complete platform installation. The app
host can serve one tool or a small collection with only the capabilities those
apps declare. Hub is a useful optional app for managing that host even when
accounts, organizations, public discovery, publishing, and hosted services are
absent. Those broader services can be added incrementally rather than becoming
prerequisites for local app execution.

Assigning localhost subdomains is part of that workflow. A project can declare
its preferred app name, Hub can validate conflicts and install or update its
declaration, and the app server can expose it at
`<name>.localhost:<port>`. Explicit plugin mappings remain available for CLI,
automation, imports, and deployments where the public hostname differs from the
local one. Aliases are declarations too: an old site row or directory alone must
never make a hostname executable.

Hub may become the primary app discovery and authoring interface. In that
direction, `apps.localhost` can become a small bootstrap, registry, or
compatibility view and may be largely replaced in everyday use by Hub. The
underlying app catalog and APIs stay independent of either UI, so headless
operation, CLI management, and alternative management applications continue to
work. A fresh install may still use the small directory to reach or install Hub
without requiring Hub to be part of the immutable core preset.

Declarative configuration can also select capability providers. For example, a
Storage-shaped guest capability may use native browser `localStorage` during
static or local-first operation, or an explicitly configured authenticated
server provider when an installation supplies persistence. Guest code need not
change, but provider, scope, quotas, conflict behavior, offline behavior, and
privacy semantics must remain visible in the declaration.

On a new database the server installs the `core` preset once. It currently
contains only the app directory:

```bash
node packages/app/src/index.js --data-dir ./data
```

Use `--no-app-init` for a genuinely empty new registry. Initialization does not
replace an existing registry.

Plugins are installers

An app plugin supplies a declaration, an optional data setup function, and
optional app dependencies. It is not another routing mechanism. Install one
persistently with the CLI:

```bash
node packages/macchiato/src/macchiato.js --data-dir ./data app install resources-co
node packages/macchiato/src/macchiato.js --data-dir ./data app install development
```

Or install/update plugins while starting a development server:

```bash
node packages/app/src/index.js --data-dir ./data --app-plugin development
```

`development` is the full repository demo set; `core` is the one-app default.
Run `macchiato app plugins` to list individual plugin IDs.

### Shared browser assets

The `/-/` namespace is absent by default. An app that imports Macchiato's
shared browser modules or cached fonts must declare:

```json
{
  "options": {
    "sharedAssets": true
  }
}
```

The server only checks its shared-asset routes for declarations carrying that
property. Other apps handle `/-/` like any ordinary application path, normally
returning their implicit missing-path response. A self-contained static app
should leave the property out.

### Load an example into Macchiato

Repository examples are ordinary declarative apps with a small installer entry.
For example, persist the Code Editor Use example in the default local catalog:

```bash
node packages/macchiato/src/macchiato.js app install code-editor-use
node packages/app/src/index.js --host 127.0.0.1 --port 8765
```

It is then listed at `http://apps.localhost:8765` and runs at
`http://code-editor-use.localhost:8765`. The declaration is stored in
`~/.macchiato/default/macchiato.sqlite3`; source code and assets remain in the
project rather than being copied into the database. Use `--data-dir` on both
commands to keep a different catalog.

For a disposable run, install the plugin at server startup:

```bash
node packages/app/src/index.js --host 127.0.0.1 --port 8765 \
  --app-plugin code-editor-use
```

Application authors do not need to copy or depend on this exact example. They
can import `@macchiato-dev/declarative-app-server` and whichever `*-use`
packages their app needs, keep normal HTML, CSS, and guest JavaScript files,
and provide their own `macchiato.app.json`, schemas, trusted bootstrap, and
handler. `packages/code-editor-use/examples/basic` is a complete reference for
that composition and can also be run independently with `npm start`.

Dependencies and subdomains

Each app defaults to the subdomain in its declaration, normally its plugin ID.
Override mappings at installation:

```bash
node packages/macchiato/src/macchiato.js --data-dir ./data \
  app install resources-edge \
  --map resources-edge=preview \
  --map resources-co=source
```

Installing `resources-edge` also installs its `resources-co` app dependency.
The edge declaration records `{ "resources-co": "source" }` in
`options.dependencies`, making the service relationship inspectable without
coupling it to DNS. Use app dependencies only for separately addressable
services; ordinary package imports do not need subdomains.

The equivalent startup flags are repeatable `--app-plugin` and
`--app-map id=subdomain`.

App-scoped environment

Declarative apps may publish an `options.environment` contract. Each entry
declares an uppercase environment name and whether it is secret. Operators can
configure only declared names:

```bash
node packages/macchiato/src/macchiato.js --data-dir ./data \
  app env set resources-edge PUBLIC_ORIGIN http://resources-edge.localhost:3030

node packages/macchiato/src/macchiato.js --data-dir ./data \
  app env set resources-edge GITLAB_CLIENT_ID your-client-id

node packages/macchiato/src/macchiato.js --data-dir ./data \
  app env set resources-edge GITLAB_CLIENT_SECRET
```

Use `app env list <subdomain>` to inspect configured names and `app env unset
<subdomain> <NAME>` to remove one. Listings and the apps directory never expose
values. A name marked `secret` opens a no-echo terminal prompt, keeping it out
of process arguments and ordinary shell history. For automation, pass the value
through standard input with `--stdin`. For example, with
[`pass`](https://www.passwordstore.org/), pipe the first line of a password-store
entry directly into Macchiato:

```bash
pass show services/resources-edge/gitlab-client-secret | sed -n '1p' | \
  node packages/macchiato/src/macchiato.js --data-dir ./data \
  app env set resources-edge GITLAB_CLIENT_SECRET --stdin
```

The same primitive works with other secret-manager CLIs. An optional
1Password CLI equivalent is:

```bash
op read 'op://Private/Resources Edge GitLab/client secret' | \
  node packages/macchiato/src/macchiato.js --data-dir ./data \
  app env set resources-edge GITLAB_CLIENT_SECRET --stdin
```

Macchiato receives the secret only on stdin; neither form puts its value in
process arguments or app configuration.

Values are scoped to the installed subdomain, survive plugin updates, and are
passed only to that app handler as its `environment` object. They are stored in
the local Macchiato SQLite database, not in `app_configs`, exported artifacts,
or source files. Treat the data directory as secret-bearing operator state and
do not commit or copy it casually. Hosted adapters such as Bunny should map the
same declared names to their native environment-secret facility rather than
uploading this local table.

CLI interfaces

A declarative app may expose named commands as well as an HTTP interface. The
persisted `options.commands` object contains only inspectable names and short
descriptions; executable functions remain in the installed plugin registry.
Commands therefore use the same explicit installation boundary as web routes,
without turning stored configuration into executable code.

List or run commands by installed subdomain:

```bash
node packages/macchiato/src/macchiato.js app run app
node packages/macchiato/src/macchiato.js app run app export ./dist/app-static
```

The runner receives trailing arguments plus app-scoped environment and
declaration context. A web app can add a CLI interface without creating
another kind of app or routing path. A historical code-tour configuration can use
the same model to select an immutable source revision and bind its notes
capability directly to an archived file; it must not replace active notes.

Operator-created sites

`site add`, `site add-page`, `site add-file`, and `site add-route` write both
the content record and its app declaration. `site remove` removes both. This
preserves the single-registry rule for directory and SQLite-backed sites.

A directory app can receive a narrowly scoped writable file grant. The grant
names each direct-child file exactly and gives it an independent byte ceiling:

```bash
node packages/macchiato/src/macchiato.js site add dom-use-tour /root/dom-use-tour \
  --writable-file notes.md --max-bytes 65536 \
  --writable-directory archives --max-bytes 1048576
```

The app reads and replaces that file through
`/-/writable-files/<encoded-name>`. Only `GET`, `HEAD`, and `PUT` are exposed;
undeclared names do not reach the file handler, parent traversal is invalid,
and the server checks both declared and actual request sizes. This primitive is
for small operator-approved state such as annotations—not general directory
write access or uploads.

A writable-directory grant is deliberately different. The app can list and
read direct-child files, and can create each filename exactly once through
`/-/writable-directories/<directory>/<filename>`. It cannot overwrite or delete
a file. The byte ceiling applies to the sum of all regular files in the granted
directory; nested paths, symlinks, and non-regular entries are rejected. This
supports immutable checkpoints without granting general filesystem mutation.

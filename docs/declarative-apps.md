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

Operator-created sites

`site add`, `site add-page`, `site add-file`, and `site add-route` write both
the content record and its app declaration. `site remove` removes both. This
preserves the single-registry rule for directory and SQLite-backed sites.

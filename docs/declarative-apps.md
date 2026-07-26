# Declarative apps

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

Operator-created sites

`site add`, `site add-page`, `site add-file`, and `site add-route` write both
the content record and its app declaration. `site remove` removes both. This
preserves the single-registry rule for directory and SQLite-backed sites.

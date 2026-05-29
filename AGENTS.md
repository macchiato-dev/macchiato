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

## Running the Server

For local development, pick a port that is free on your machine. The examples
below use `8765`, which is the app package default and is usually available for
local self-hosting.

```bash
cd /path/to/macchiato
node packages/app/src/index.js --host 127.0.0.1 --port 8765
```

If running inside a container or VM and exposing the port to the host, bind to
all interfaces inside the container:

```bash
node packages/app/src/index.js --host 0.0.0.0 --port 8765
```

Useful local URLs:

```text
http://macchiato.localhost:8765
http://dom-use-demo.localhost:8765
http://todo.localhost:8765
```

## Site Configuration

List configured SQLite-backed sites with:

```bash
node packages/macchiato/src/macchiato.js site list
```

Add a site with:

```bash
node packages/macchiato/src/macchiato.js site add-page \
  dom-use \
  examples/dom-use-demo/page.html \
  examples/dom-use-demo/style.css \
  examples/dom-use-demo/dom.schema.json \
  examples/dom-use-demo/css.schema.json \
  --title "Neighborhood Library"
```

The app server routes by subdomain, so a `dom-use` row is served at
`http://dom-use.localhost:<port>`.

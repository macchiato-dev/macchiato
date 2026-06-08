# Resources.co Site

SQLite-backed and static-exported Resources.co example site.

## Static Export

Generate a file-only website:

```sh
node examples/resources-site/export-static.js
```

The ignored local export is written to `examples/resources-site/exported/` by
default. It contains pretty-path `index.html` files plus the local Space Grotesk
font assets:

- `/index.html`
- `/resources/containers/index.html`
- `/-/fonts/resourcesco-space-grotesk/*.woff2`

Serve it with any static file server from that directory.

## Bunny Standalone Edge Script

`bunny-server.js` is a Bunny standalone edge script that maps friendly paths to
exported files in a Bunny Storage bucket subdirectory. It uses
`@bunny.net/edgescript-sdk` and reads configuration through `process.env`.

Bunny Storage bucket files in a subdirectory:

```sh
BUNNY_ORIGIN="https://example.b-cdn.net" \
BUNNY_BUCKET_PREFIX="resources-co" \
STORAGE_API_KEY="..." \
deno run --allow-net --allow-env examples/resources-site/bunny-server.js
```

`BUNNY_ORIGIN` and `STORAGE_API_KEY` are required. `BUNNY_BUCKET_PREFIX` is the
subdirectory in the bucket that contains the exported files.

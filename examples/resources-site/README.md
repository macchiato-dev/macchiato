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

## Bunny Bucket Server

`bunny-server.ts` is a small Deno server that maps friendly paths to exported
files. It can serve local files, or fetch the same files from a Bunny bucket or
pull-zone path.

Local files:

```sh
deno run --allow-net --allow-read --allow-env examples/resources-site/bunny-server.ts
```

Bunny-backed files in a bucket or pull-zone subdirectory:

```sh
BUNNY_ORIGIN="https://example.b-cdn.net" \
BUNNY_BUCKET_PREFIX="resources-co" \
deno run --allow-net --allow-env examples/resources-site/bunny-server.ts
```

For Bunny Storage API origins that require a key, set `BUNNY_ACCESS_KEY`. For a
public pull zone, leave it unset.

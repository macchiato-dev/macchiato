# Resources.co site

Resources.co has two explicitly separate runtime profiles built from the same
route and view models.

| Profile | Runtime | Validation and navigation |
| --- | --- | --- |
| Local Macchiato | Node + SQLite | Rich browser transitions sanitized by `dom-use`; optional browser QuickJS for the userbar state machine |
| Bunny edge | Bunny V8 isolate + Storage | Strict build-time `style-use` and `dom-use`; no executable page JavaScript; full-document navigation |

The Bunny profile does not nest QuickJS inside Bunny's V8 isolate. Security
comes from a small edge program, an allowlisted immutable export, strict `use-*`
validation before publication, and the Bunny isolate's own limits.

## Build the edge artifacts

```sh
node examples/resources-site/export-static.js \
  --out examples/resources-site/exported
```

The export contains friendly-path HTML, local fonts, and `manifest.json`. The
manifest records:

- every public object allowed through the edge;
- the `document-navigation-v1` security profile;
- the `dom-use`, `style-use`, and `html-use` validators used;
- byte length and SHA-256 evidence for every artifact.

The HTML contains no module scripts, import map, QuickJS, or dynamic page-swap
code. A strict CSP at the edge uses `script-src 'none'`.

## Check locally

```sh
node --test \
  packages/app/test/resources-edge.test.js \
  packages/app/test/resources-site-export.test.js

deno check \
  --config examples/resources-site/deno.json \
  examples/resources-site/bunny-server.js
```

To inspect the generated documents without emulating Bunny Storage:

```sh
cd examples/resources-site/exported
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080`. Directory `index.html` resolution exercises
the same friendly file layout, though the local file server does not reproduce
the edge security headers.

## Bunny deployment

1. Upload the *contents* of `examples/resources-site/exported` beneath the
   configured `BUNNY_BUCKET_PREFIX` in a private Bunny Storage zone.
2. Create a Bunny standalone Edge Script connected to this repository. Use
   `examples/resources-site/bunny-server.js` as the entrypoint and
   `examples/resources-site/deno.json` as its Deno configuration.
3. Configure:

   - `BUNNY_STORAGE_ORIGIN`: HTTPS Storage API origin, including the zone path
     if required by the selected endpoint.
   - `BUNNY_BUCKET_PREFIX`: export subdirectory, default `resources-co`.
   - `MANIFEST_TTL_MS`: optional manifest cache time, clamped to 1–300 seconds.
   - `STORAGE_API_KEY`: an environment **secret**, not a normal variable.

4. Preview `/`, `/about`, a project route, a font URL, an unknown route, and a
   non-GET request before publishing.

`BUNNY_ORIGIN` remains accepted as a compatibility alias, but new deployments
should use the less ambiguous `BUNNY_STORAGE_ORIGIN` name.

The SDK is pinned through `deno.json` and `deno.lock`; the edge script does not
import executable code from a third-party CDN such as esm.sh.

## Audit boundaries

The entrypoint only wires environment configuration into the handler. Review
the dependency-free models in [`edge/models.js`](edge/models.js) for paths,
origins, manifest evidence, storage requests, content types, caching, CSP, and
security headers. Review [`edge/app.js`](edge/app.js) for the manifest cache and
request orchestration.

The edge never derives public access solely from a URL. It first converts the
path into one canonical object key, then requires that key to exist in the
validated export manifest. It refuses encoded separators, traversal, malformed
escapes, storage redirects, direct manifest access, unknown files, and methods
other than GET/HEAD. The Storage key is sent only to the validated HTTPS origin
using `redirect: "manual"`.

See [`edge/README.md`](edge/README.md) for the threat model and remaining work.

# Private Deno module origin

`examples/deno-module-origin` is a small Bunny Edge Script that exposes a
private, read-only JavaScript/TypeScript prefix from Bunny Storage. It accepts
GET and HEAD for `.js`, `.mjs`, and `.ts`, rejects redirects and unsafe paths,
and forwards the private Storage key only to the configured HTTPS Storage
origin.

Build the script:

```sh
./scripts/build-deno-module-origin-bunny.sh
```

Paste `dist/deno-module-origin-bunny/deno-module-origin-bunny.js` into a
separate Edge Script. Configure these secrets/variables there:

- `MODULE_IMPORT_TOKEN`: a long random bearer token; secret.
- `STORAGE_API_KEY`: the Bunny Storage read key; secret.
- `BUNNY_STORAGE_ORIGIN`: the credential-free HTTPS Storage API origin,
  including its zone path when required.
- `MODULE_BUCKET_PREFIX`: the private directory containing modules. Prefer an
  immutable revisioned prefix such as `modules-e599fb4`.

Deno already has a standard way to authenticate HTTPS imports. Put the token in
the importing process, not in source code:

```sh
export DENO_AUTH_TOKENS="$(pass show resources/preprod/module-import-token)@modules-preprod.resources.co"
deno cache --allow-import=modules-preprod.resources.co \
  https://modules-preprod.resources.co/example/mod.ts
unset DENO_AUTH_TOKENS
```

`DENO_AUTH_TOKENS=token@host` sends `Authorization: Bearer token`; a
`username:password@host` entry would send Basic authentication. This endpoint
uses Bearer. Bunny does not need a Deno-specific password feature: the Edge
Script checks the standard header and keeps the backing Storage private.

For a Bunny application script, authenticate only while resolving/bundling its
remote dependencies. Upload the resulting self-contained bundle. Do not inject
the module token into that bundle or the browser-facing application source. Pin
import URLs to immutable revision directories so rebuilding the same deployment
cannot silently change its dependency graph.

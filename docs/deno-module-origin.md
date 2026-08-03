# Revisioned Deno module origin

`examples/deno-module-origin` is intentionally a small Bunny Edge Script. It
serves authenticated, read-only JavaScript and TypeScript files directly from
private Bunny Storage. It does not resolve packages, interpret import maps, or
rewrite source code.

Every public filename must end in a hyphen followed by the conventional
seven-character lowercase Git revision:

```text
resources-edge-7c3b59e.js
packages/dom-use-7c3b59e.js
packages/style-use-7c3b59e.js
```

Imports hardcode the module origin, carry the same suffix explicitly, and use a
fixed key placeholder:

```js
import { DomUse } from "https://modules.resources.co/__MACCHIATO_MODULE_IMPORT_KEY__/packages/dom-use-7c3b59e.js";
import { StyleUse } from "https://modules.resources.co/__MACCHIATO_MODULE_IMPORT_KEY__/packages/style-use-7c3b59e.js";
```

This is deliberately less magical than an import map. A deployment can be
audited from its entry source, old files are immutable rollback targets, and the
serving function only validates the URL capability, maps the requested path
straight to the same private Storage key, and substitutes its stable import key
for `__MACCHIATO_MODULE_IMPORT_KEY__` in the response. This propagates the
capability to every static transitive import without an import map.

Build the serving function:

```sh
./scripts/build-deno-module-origin-bunny.sh
```

Paste `dist/deno-module-origin-bunny/deno-module-origin-bunny.js` into its own
Bunny Edge Script and configure:

- `MODULE_IMPORT_TOKEN`: a long random bearer token; secret.
- `STORAGE_API_KEY`: the Bunny Storage read key; secret.
- `BUNNY_STORAGE_ORIGIN`: the credential-free HTTPS Storage API origin,
  including its zone path when required.

There is no module-prefix environment variable. A request for
`/packages/dom-use-7c3b59e.js` reads exactly that key below the configured
Storage origin. Unknown extensions, unsuffixed files, unsafe paths, redirects,
and unauthenticated requests fail closed.

The initially pasted Bunny script includes the capability once:

```js
import "https://modules.resources.co/THE_PRIVATE_IMPORT_KEY/resources-edge-7c3b59e.js";
```

Successful module responses use `public, max-age=31536000, immutable`. The
revision suffix makes that safe, while the one-year lifetime keeps compilation
and Deno imports off the Edge Script after the first cache fill.

`MODULE_IMPORT_TOKEN` is an intentionally stable, read-only URL capability for
published modules. It can be visible in Bunny's stored script, compiled module
URLs, CDN access logs, and developer tooling. Never reuse the Bunny Storage key
or any credential with write access. Rotate this key only when revoking readers
is worth invalidating all existing import URLs.

## Server module boundaries

The Resources Bunny entry is only wiring. Its runtime implementation is split
across `edge/`, `auth/`, and `models/`. Substantive server modules stay below
1,000 lines and represent a cohesive policy, protocol, or model. Tiny entry
points are acceptable; otherwise prefer adding behavior to the owning module
over creating fragments with only a handful of lines.

Build-time route generation and generated browser/QuickJS artifacts are not part
of the server runtime module graph. Their generated size is checked and reviewed
separately from the hand-authored server-module limit.

# Resources.co site

Resources.co has two explicitly separate runtime profiles built from the same
route, theme, and view models. The deployment boundary is an adapter, not a
fork of the application.

| Profile | Runtime | Validation and navigation |
| --- | --- | --- |
| Local Macchiato | Node + SQLite | Rich browser transitions sanitized by `dom-use`; optional browser QuickJS for the userbar state machine |
| Bunny edge | Bunny V8 isolate + Storage | Strict build-time `style-use` and `dom-use`; no executable page JavaScript; full-document navigation |

The generic `@macchiato-dev/theme-use` module owns safe CSS-token definition,
merging, and rendering. [`theme.js`](theme.js) is the Resources.co-specific
model: it names the palette tokens and supplies the brand defaults. A caller
can provide a partial dark/light palette to `createResourcesArtifactSet()` or
`exportResourcesSite()`; undeclared tokens and active CSS values are rejected.

The pieces compose in one direction:

```text
route/view models + theme + runtime profile
                    |
                    v
             immutable artifacts
                    |
          +---------+----------+
          |                    |
  in-memory adapter       Bunny Storage
          |                    |
          +---- edge handler --+
```

[`runtime.js`](runtime.js) declares behavior differences. The `local` profile
keeps the existing SQLite-backed site and its optional browser QuickJS WASM
userbar. The `edge` profile emits inert documents. [`artifacts.js`](artifacts.js)
is the portable build boundary. Storage is supplied as `fetch`, so the same
dependency-free handler can use [`adapters/memory-storage.js`](adapters/memory-storage.js)
locally or the platform `fetch` against private Bunny Storage in production.

## Presentation parity and intentional differences

Both profiles now use the Resources.co teal/blue theme by default, render the
same brand, content, project metadata, navigation, footer, fonts, responsive
breakpoints, and friendly URLs. The edge header includes a static `Edge safe`
status and account identity in the same grid position as the local userbar, so
removing the JavaScript runtime does not leave a visual hole.

The remaining differences describe runtime capability rather than separate
designs:

| Local `resources-co` | Edge `resources-edge` |
| --- | --- |
| QuickJS-backed account popovers | Server-rendered GitHub session status |
| Client theme toggle | Default theme rendered at build time |
| Responsive JavaScript hamburger | Always-available document links on narrow screens |
| Prefetch and sanitized DOM swaps | Ordinary full-document navigation |

The orange/purple palette originally used by the edge preview was useful as a
contrast test, but made adapter differences look like a separate product. It is
retained as the exported `RESOURCES_EXPERIMENTAL_THEME` direction in
[`theme.js`](theme.js), not as the preview default. To explore it explicitly:

```js
import { createResourcesArtifactSet } from "./artifacts.js";
import { RESOURCES_EXPERIMENTAL_THEME } from "./theme.js";

const artifacts = createResourcesArtifactSet({
  theme: RESOURCES_EXPERIMENTAL_THEME,
});
```

This keeps palette experiments declarative and validated by `theme-use`; a
storage or execution adapter never silently changes the brand.

## Menu module boundaries

Navigation and account UI are no longer authored inside the route builder:

- `@macchiato-dev/menu-use` validates an immutable list of paths, keys, and
  labels, then renders both the desktop nav and interactive mobile shell.
  [`components/menu.js`](components/menu.js) supplies the Resources.co menu and
  theme-toggle markup. Local and edge documents therefore get their links and
  active-page state from the same model.
- `@macchiato-dev/user-menu-use` compiles one declarative component definition:
  it renders exclusive popovers, composes the component's declared `dom-use`
  capability into its host schema, and generates a runtime-neutral state
  machine. It does not require a browser module. The local profile evaluates
  the generated state machine in QuickJS; it is not trusted with DOM access.
  The host applies returned snapshots to `data-open` and ARIA state.
- [`components/user-menu.js`](components/user-menu.js) owns the Resources.co
  identity, icons, menu actions, DOM definitions, schema placement, and static
  edge status in the same declaration. There is no parallel user-menu section
  in `dom.schema.json` to drift from the actual component. The edge profile
  shares the identity model but deliberately renders no inert popover buttons.

The generic modules do not know about Resources.co routes, colors, people, or
icons. The Resources component modules do not decide whether storage is SQLite,
memory, or Bunny. The route builder composes those independently testable
pieces.

### Hover intent

The desktop user menu uses a dynamic safe triangle rather than a wide CSS hover
bridge. When the pointer leaves an open trigger, the host computes a temporary
triangle from that exit point to the top corners of its panel. Diagonal movement
toward the panel keeps the current menu open even if the path crosses `+`.
Horizontal movement toward `+` immediately exits the triangle and switches
menus. A clicked menu remains pinned until another click or dismissal.

This follows the intent-sensitive behavior documented by
[Floating UI `safePolygon`](https://floating-ui.com/docs/usehover#safepolygon)
and the directional approach demonstrated by
[jQuery-menu-aim](https://github.com/kamens/jQuery-menu-aim). Resources.co keeps
the geometry dependency-free and does not block pointer events behind the
polygon. Buffer, intent requirement, and timeout are declarative fields beside
the menu's DOM capability in `components/user-menu.js`.

## Authentication slice

The latest design reference is
[`resourcesco-standalone-20260722.html`](../../resourcesco-standalone-20260722.html).
It includes logged-in and logged-out layouts, Log in and Sign up routes, four
OAuth provider buttons, and Sign out. Its provider exchange is explicitly
simulated: a timeout changes DOM state without a server callback, session,
cookie, or identity record.

[`components/auth.js`](components/auth.js) ports that slice as a declarative
model with two separable concerns:

- presentation and state: provider list, login/signup route models, auth card,
  guest actions, and a persisted local preview state;
- adapter mode: currently `simulated-provider-adapter`, named explicitly so it
  cannot be mistaken for server authentication.

The local profile supports the complete preview loop: Sign out, Log in, choose
a provider, Sign out again, Sign up, and choose a provider. Playwright covers
that sequence and checks header visibility, routes, and stored state. The auth
card's `dom-use` definition is composed from the auth module just like the user
menu capability.

The Bunny/document profile serves `/login` and `/signup` from the same exported
Resources layout as every other page; there is no edge-only auth template. The
auth component composes its card into the `dom-use` schema, so provider links,
nested marks, legal links, and the card structure are validated during export.
Its CSS passes through the site's `style-use` capability before an artifact can
be published. GitHub and GitLab render as real OAuth links; Google and Apple are
visibly unavailable until adapters exist.

Both implemented providers validate signed state and PKCE, exchange the code
only at the edge, fetch the provider identity, discard the provider token, and
issue a signed `Secure`, `HttpOnly`, `SameSite=Lax` session cookie. HTML remains
free of executable page scripts: the edge replaces one bounded account-status
island with escaped guest or session markup and marks personalized documents
`private, no-store`.

The session identity is upserted into strict `users` and `user_identities`
tables through the web libSQL client before the session is issued. Bunny
Database supplies the production transport and automatically injects
`BUNNY_DATABASE_URL` and `BUNNY_DATABASE_AUTH_TOKEN` when connected to the
script. Its credentials never enter the session or browser. Provider identities
remain separate rows so account-linking policy can be added without changing
OAuth callbacks.

The July 22 reference also expands the application beyond authentication. The
next implementation slices, in dependency order, are:

1. signed-in workspace/home versus the signed-out marketing home;
2. Explore, Blog, and organization routes from shared declarative models;
3. the New project workflow backed by a real model and storage adapter;
4. Terms and Privacy document routes;
5. organization and project models on Bunny Database, followed by explicit
   cross-provider account linking.

The standalone file remains a design/prototype reference, not executable input
to the server or a trusted bundle.

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

Run the normal Macchiato server:

```sh
node packages/app/src/index.js --host 127.0.0.1 --port 8765
```

Then compare:

- `http://resources-co.localhost:8765` — rich local/SQLite profile, including
  browser WASM where configured;
- `http://resources-edge.localhost:8765` — edge profile, served by the actual
  edge handler through an in-memory Storage adapter, without Bunny or page JS;
- `http://apps.localhost:8765/config/resources-edge` — the declarative adapter
  and source-module configuration exposed by the app directory.

### Real local OAuth callbacks

The preview uses placeholder provider credentials by default, so provider
authorization cannot complete until the installed `resources-edge` declaration
has app-scoped values. Configure a GitLab development application without
putting its secret in shell arguments:

```sh
node packages/macchiato/src/macchiato.js app env set \
  resources-edge PUBLIC_ORIGIN http://resources-edge.localhost:3030

node packages/macchiato/src/macchiato.js app env set \
  resources-edge GITLAB_CLIENT_ID your-client-id

node packages/macchiato/src/macchiato.js app env set \
  resources-edge GITLAB_CLIENT_SECRET

node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | \
  node packages/macchiato/src/macchiato.js \
  app env set resources-edge SESSION_SIGNING_KEY --stdin
```

For a repeatable setup backed by
[Password Store](https://www.passwordstore.org/), pipe the first line of a
`pass` entry instead of using the interactive prompt:

```sh
pass show services/resources-edge/gitlab-client-secret | sed -n '1p' | \
  node packages/macchiato/src/macchiato.js app env set \
  resources-edge GITLAB_CLIENT_SECRET --stdin
```

App-environment changes are read on the next request; a server restart is not
required. Register this GitLab development callback:

```text
http://resources-edge.localhost:3030/auth/gitlab/callback
```

The corresponding GitHub callback is
`http://resources-edge.localhost:3030/auth/github/callback`. The CLI uses the
default data directory unless `--data-dir` or `--db` is supplied; use the same
option for configuration and the server.

Insecure HTTP is accepted only when the origin is loopback or ends in
`.localhost`; production and staging still require HTTPS. Local cookies omit
`Secure` so browsers can return them over HTTP, but retain `HttpOnly` and
`SameSite=Lax`. Use separate development registrations and secrets: a GitHub
OAuth App supports only one callback URL, while a GitHub App can support
multiple callbacks. Separate registrations also prevent a local compromise
from granting staging credentials.

The separate preview subdomain keeps both architectures inspectable. Switching
to Bunny changes the storage adapter and entrypoint configuration, not the
models, generated artifacts, public paths, or edge request policy.

```sh
node --test \
  packages/app/test/resources-edge.test.js \
  packages/app/test/resources-edge-preview.test.js \
  packages/app/test/resources-site-export.test.js

deno check \
  --config examples/resources-site/deno.json \
  examples/resources-site/bunny-server.js
```

To inspect only the generated documents without emulating Bunny Storage:

```sh
cd examples/resources-site/exported
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080`. Directory `index.html` resolution exercises
the same friendly file layout, though the local file server does not reproduce
the edge security headers.

## Bunny deployment

For a reproducible local build:

```sh
./scripts/build-resources-bunny.sh
```

This produces a single Edge Script at
`dist/resources-bunny/resources-bunny.js` and the validated Storage objects at
`dist/resources-bunny/site`. The bundle is currently about 185 KB, well below
Bunny's 10 MB script limit.

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
   - `PUBLIC_ORIGIN`: canonical HTTPS site origin, with no path.
   - `GITHUB_CLIENT_ID`: GitHub OAuth or GitHub App client ID.
   - `GITHUB_CLIENT_SECRET`: an environment **secret**.
   - `GITLAB_CLIENT_ID`: GitLab OAuth application ID.
   - `GITLAB_CLIENT_SECRET`: an environment **secret**.
   - `SESSION_SIGNING_KEY`: a random environment **secret** of at least 32
     bytes; rotating it signs everyone out.
   - `BUNNY_DATABASE_URL` and `BUNNY_DATABASE_AUTH_TOKEN`: added by connecting
     the staging Bunny Database to the script.

4. Preview `/`, `/about`, a project route, a font URL, an unknown route, and a
   non-GET request before publishing.
5. Start with `PUBLIC_ORIGIN=https://staging.resources.co` (or the chosen
   staging hostname). Register these exact callback URLs:

   - `${PUBLIC_ORIGIN}/auth/github/callback`
   - `${PUBLIC_ORIGIN}/auth/gitlab/callback`

   Test both providers, callback rejection with altered state, signed-in
   rendering, and POST `/logout` before directing production DNS to the script.

Bunny Database is libSQL-based and SQLite-compatible, which is why the account
model uses ordinary SQLite SQL and parameter placeholders. It is currently a
public-preview service, so staging should exercise migrations, concurrent
identity upserts, replication behavior, backup/export, and rollback before
production. Keep the Storage, provider, session, and database credentials as
separate authorities.

The manual GitHub Actions workflow
`.github/workflows/deploy-resources-bunny.yml` builds both artifacts, uploads
the site, then deploys the standalone script. Configure its
`resources-production` environment with:

| Kind | Name |
| --- | --- |
| GitHub secret | `BUNNY_STORAGE_UPLOAD_KEY` |
| GitHub secret | `BUNNY_SCRIPT_ID` |
| GitHub secret | `BUNNY_DEPLOY_KEY` |
| GitHub variable | `BUNNY_STORAGE_UPLOAD_ORIGIN` |
| GitHub variable | `BUNNY_BUCKET_PREFIX` |

The upload key is CI-only. The Edge Script receives a separate read-only
`STORAGE_API_KEY` through Bunny. Use environment protection/approval for the
production workflow.

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

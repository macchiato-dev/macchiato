# Resources.co Bunny edge security model

## Runtime tiers

- `../bunny-server.js`: minified monolithic composition root and HTTP server.
- `bootstrap.js`: anonymous fast-home selection before database readiness.
- `../bunny-application.js`: application factory with lazy database readiness.
- `models.js`: pure validation and policy models with no SDK dependency.
- `app.js`: Fetch API orchestration with injected configuration, clock, fetch,
  and logger.
- `../auth/`: signed cookie, PKCE, GitHub/GitLab exchange, and identity validation.
- `@macchiato-dev/hub/accounts`: provider-neutral SQLite identity model behind a
  libSQL-compatible client boundary.
- `@macchiato-dev/hub/content`: account-owned organization and project model behind
  the same SQLite/libSQL boundary.
- `../seed.js`: route/view model and authored UI.
- `../export-static.js`: trusted publisher that runs strict `use-*` validation.

This division makes the deployed request path reviewable without reading the
large page renderer, and makes the renderer unable to grant itself new edge
routes after publication.

The server calls `serve()` synchronously and performs no remote work before
registration. Database readiness is a shared promise inside the isolate.
Production deployments should run the documented database
migration before publishing so readiness is normally idempotent verification
rather than first-time schema creation.

The local `resources-edge` declarative app uses the same bootstrap contract and
lazy-loads `../preview-application.js`. Tests assert that fast home rendering
does not import it, deferred routes import it once, prewarming shares the same
promise, and an import failure is retryable. Local development therefore
exercises the architectural seam instead of calling `app.js` directly.

## Trust flow

```text
repository route/view models
  -> style-use validates the complete stylesheet
  -> dom-use + html-use strictly sanitize document-profile markup
  -> exporter writes immutable objects and manifest evidence
  -> operator uploads one export prefix to private Bunny Storage
  -> build emits one minified Edge Script with no runtime code loading
  -> edge validates manifest structure and security profile
  -> request path canonicalizes to an exact allowlisted key
  -> authenticated, non-redirecting HTTPS Storage request
  -> fixed public response policy and CSP
  -> signed sessions render escaped account UI and trusted account-owned models
```

The generated manifest is publication authority, not user input. Anyone able to
write both the export objects and manifest can publish content; protect that
credential separately from the read-only credential used by the edge script.

## What is intentionally absent

- No QuickJS or other nested JavaScript sandbox at the edge.
- No edge-side HTML templating or interpretation of arbitrary route data.
- No public Storage proxy and no prefix-only authorization.
- No provider token in cookies, Storage, logs, or browser responses.
- No user-authored HTML. The document publication path remains read-only;
  authentication and account content use separate, narrowly modeled database
  boundaries. Names, slugs, and descriptions are always escaped.
- No app-authored JavaScript in the document-profile export. The only browser
  code is the fixed, host-owned command-palette, appearance, and native-menu
  dismissal modules.
- No passthrough of upstream response headers except ETag and Last-Modified.

## Accounts and linked OAuth identities

`users` is the account record. `user_identities` maps stable provider user IDs
to it, and `user_emails` enforces one normalized, provider-confirmed email per
account. Email comparison is case-insensitive but deliberately avoids
provider-specific dot or plus-address rewriting.

The account store receives an explicit allowlist of authentication-method
identifiers. GitHub and GitLab are enabled now; Apple and Google OAuth, passkey,
magic-link, or optional self-hosted credential adapters can be added without
changing the account schema. Each adapter remains responsible for proving its
identity and verified email before calling the shared account model.

A known provider identity signs in normally. A new identity with an unused
confirmed email creates an account. If that email is already used, the callback
returns `409` and asks the user to authenticate with their existing method
before linking the new identity to the same account. Candidate providers remain
internal and are not disclosed by the conflict response.

Once signed in, `/auth/github/link` and `/auth/gitlab/link` start fresh PKCE
flows. The target account ID travels only in the short-lived signed flow cookie,
so only an explicit authenticated flow can attach another identity. Provider
tokens are discarded after lookup. GitHub requires a verified address from
`/user/emails`; GitLab requires a confirmed address from `/api/v4/user/emails`.
Provider names belong in connection settings, not the account menu.

Provider profile refreshes do not overwrite the Resources.co username. Users
can change that stable username through `/profile`; the account model validates
the shared namespace policy and atomically updates personal project namespace
slugs before refreshing the signed session.

## Account content

Signed-in `/` is the account dashboard. `/projects` lists projects owned by the
stable Resources.co user ID; the dashboard also lists organizations. Project cards open
dynamic `/{namespace}/{slug}` views. `/projects/new` and `/organizations/new`
are ordinary server-rendered forms; a project POST redirects directly to its
new view, while an organization POST returns to the dashboard. The forms carry short-lived, signed,
account-and-action-specific CSRF tokens and also require a same-origin request.
Bodies are URL-encoded and size-limited. Project snapshot autosaves and version
restores use size-limited JSON, the same origin check, and a project-specific
CSRF token.

Projects use either the user's namespace or an organization owned by that user.
Database uniqueness constraints protect organization slugs and project slugs
within a namespace. The edge accepts only enumerated templates and visibility
values. The static export contains validated placeholder routes and layout;
`app.js` replaces one exact marker with trusted, escaped model output. No
user-authored markup or browser script crosses that boundary. Private project
lookups require the owning user ID; public projects can resolve without a
session.

Organization invitations target an existing username and create a pending
invitation plus notification in one transaction. The bell menu supports read,
delete, and accept actions. Acceptance creates a membership; owners and admins
can change member/admin roles. A partial unique index permits at most one admin
per organization, so the invariant survives races between edge isolates.

`resource_schema_migrations` is the deployment-wide migration ledger. The
database-dependent deferred bundle checks it once per isolate and shares the
resulting migration promise across requests. The small anonymous-home bootstrap
does not receive database authority merely to repeat that check.

Project content is multi-file and configuration-aware. `resource_project_state`
holds the current and last-checkpoint snapshots; `resource_project_versions`
holds ordered, verified patches. Five-minute periodic checkpoints bound normal
typing history, while destructive changes and restores create immediate
boundaries. Version reconstruction starts at the empty snapshot and rejects a
patch whose expected file text or configuration value does not match.
Selecting history in the editor is a read-only view until it is actually
edited. Container configuration names a registered container (`article`,
`page`, `canvas`, or `svg`) rather than embedding its DOM schema.

## Localized content

English and Spanish authored copy lives in `../content/en.md` and
`../content/es.md`. `../i18n.js` parses their small Markdown message-list
dialect and requires both files to expose the same keys. Publication renders
each locale through the normal `dom-use`, `style-use`, and `html-use`
validation boundary and writes HTML beneath `locales/<locale>/`; Markdown is
not interpreted on the public request path.

The edge returns a complete localized HTML document on the first request. It
does not fetch page content as browser JSON. CSP permits same-origin scripts
only because the export manifest contains the fixed command-palette and
appearance modules. Locale selection is:

1. the `resources_locale` cookie set by the footer language switcher;
2. the browser's `Accept-Language` preference;
3. English.

Switcher routes such as `/language/es/about` set an HTTP-only, same-site cookie
and redirect to `/about`. Localized HTML responses include `Content-Language`
and vary on `Accept-Language, Cookie`. The manifest carries the validated
locale allowlist and the small message set needed to localize the trusted
signed-in/guest status island.

Project descriptions are a separate content authority. `RESOURCES_CONTENT_ROOT`
points the publisher at a directory (or separate repository checkout) mirroring
public project paths such as `macchiato/app/es.md`. The in-repo
`../content-space/` tree is only the reproducible local/test fixture.

## Remaining deployment work

- Add a least-privilege upload job and keep its write credential out of the Edge
  Script environment.
- Confirm the chosen Storage endpoint and read credential with a staging zone.
- Add deployment provenance/signing if the manifest must defend against a
  compromised Storage writer; hashes currently support audit and accidental
  corruption diagnosis, not an independent signature root.
- Add production log sampling and alerting without logging secrets or full URLs.
- Exercise Bunny Database migration and rollback behavior for the account,
  organization, and project tables in staging. Keep its token separate from
  the Storage read key and session signing key.
- Split Bunny Database access into two injected clients. Rendering, lookup, and
  search paths should receive only `BUNNY_DATABASE_READ_ONLY_AUTH_TOKEN`;
  explicit validated mutations should receive
  `BUNNY_DATABASE_AUTH_TOKEN`. Both tokens are retained in staging now, but the
  current adapter still uses the full-access client for all queries. Make the
  distinction structural rather than selecting a token from request input, and
  fail closed instead of escalating a read path to the write client.
- Mirror that shape in the local adapter when useful by opening two
  `node:sqlite` clients on the same file. Apply `PRAGMA query_only = ON` to the
  read client and inject it only into query models; inject the normal client
  only into mutation models. Keep transactions on one connection rather than
  trying to span both. This makes local and Bunny deployments share the same
  model interfaces without pretending that `node:sqlite` and remote libSQL are
  the same transport.
- Decide whether future mutation APIs belong in a separate edge script/origin
  so the publication path retains its tiny read-only authority.
- Generate separate database-operation policies for read and mutation clients.
  The generator should inventory the actual parameterized statements used by
  Hub models, fail the build for an unclassified statement, and emit a compact
  read policy plus a mutation policy. The wrappers must enforce those policies
  around real client calls; a descriptive list that does not constrain SQL is
  not sufficient. The bootstrap has no database authority. The deferred bundle
  should inject a read-only client into rendering/search models and a full
  client only into explicit mutation and migration models.
- Reconsider a native browser client only when an interaction needs it. Keep its
  code and CSP capability separate from the current document-only profile.

## Staging boundary

Staging is a distinct deployment of the same bundle, not a conditional branch
inside the application. Its hostname, Storage prefix and credentials, OAuth
applications, session key, Edge Script, and Bunny Database are separate. That
keeps environment selection in deployment configuration while the reviewed
request path remains identical to production.

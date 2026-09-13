# Resources.co site

Resources.co has two explicitly separate runtime profiles built from the same
route, theme, and view models. The deployment boundary is an adapter, not a
fork of the application.

| Profile | Runtime | Validation and navigation |
| --- | --- | --- |
| Local Macchiato | Node + SQLite | Rich browser transitions sanitized by `dom-use`; optional browser QuickJS for the userbar state machine |
| Bunny edge | Bunny V8 isolate + Storage | Strict build-time validation; one host-owned machine controller with a MicroQuickJS frontend guest; full-document navigation |

The generic `@macchiato-dev/theme-use` module owns safe CSS-token definition,
merging, and rendering. [`theme.js`](theme.js) is the Resources.co-specific
model: it names the palette tokens and supplies the brand defaults. A caller
can provide a partial dark/light palette to `createResourcesArtifactSet()` or
`exportResourcesSite()`; undeclared tokens and active CSS values are rejected.

Every document resolves its saved appearance choice (System by default) in a
small synchronous head script before content paints. Its exact CSP hash is
checked in tests. This avoids a dark flash during initial loading and document
navigation while the frontend machine starts. Theme controls and subsequent
system appearance changes remain in the guest; unavailable browser storage
falls back to System without writing a preference.

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
userbar. The `edge` profile emits validated documents with the theme bootstrap
in the head. [`artifacts.js`](artifacts.js)
is the portable build boundary. Storage is supplied as `fetch`, so the same
dependency-free handler can use [`adapters/memory-storage.js`](adapters/memory-storage.js)
locally or the platform `fetch` against private Bunny Storage in production.

## Presentation parity and intentional differences

### Standard and focused views

Resources uses one layout with two declared view states. `standard` retains the
centered modular content and navigation sidebar. `focused` makes that same
layout full-bleed, places the unchanged breadcrumb contents in the top bar,
hides the sidebar, and removes outer workspace padding. New-project and project
detail routes are the first focused views. Keeping this as `data-view` state,
rather than a separate page shell, leaves room for the navigation layer to
transition between views later; routes that need fresh editor initialization
may continue using full-document navigation.

### Project editor environment

The focused project view keeps the project UI in a bounded page subtree and
mounts CodeMirror in its own iframe and machine. The trusted controller can
select the direct surface with
`startResourcesMachineController({ editorFrame: false })`. CodeMirror state,
extensions, and commands
run in a dedicated MicroQuickJS WebAssembly runtime with declared heap and stack
limits. The host owns only the constrained DOM renderer and filtered input
bridge, and disposes their listeners, handles, context, and runtime on page
teardown. The fixed frame shell constructs its bridge in the frame's realm;
project source remains text edited by the guest, never browser-executed code.
History and project details stay in the project UI machine, which owns the
editor and output through controller services. Build the controller and guest artifacts with
`node packages/website/build-project-editor.js`. The editor artifact currently
retains the filename `project-editor-quickjs-runtime.wasm`, despite using
MicroQuickJS. Language bytecode downloads and executes on guest request; the
initial artifact includes only its small shared atom catalog. See the
project-editor package's language-loading design.

The project program is not executed in the editor runtime. Each executable
output gets a disposable QuickJS context with its own DOM handle
table, timers, capabilities, and lifetime. The preview extracts inline and
same-project scripts before projecting the declared container DOM; those
scripts run only inside QuickJS. The guest's browser facade forwards admitted
DOM and drawing operations through `wasm-web-machine`.

Classic and module scripts execute inside that same output guest, including
when the optional iframe is disabled. Module dependencies are read through a
synchronous service limited to the current project's files; imports cannot
fetch a URL or access server files. QuickJS owns module linking, live bindings,
cycles, dynamic imports, and top-level `await`. Each output load uses new module
identities so edited dependencies are evaluated again. Old module records are
released when the output runtime is disposed, not on each refresh.

Disposal cancels native frames, throttled frames, timers, and ambient window
listeners as well as DOM listeners and observers. Queued event checkpoints and
late service replies cannot wake a disposed machine. The guest's timer handles
use one namespace for timeouts and intervals; cancelling either removes the
browser timer and releases the callback slot immediately. Removing a window
listener likewise unsubscribes it rather than leaving an inactive callback in
the browser.

Output storage is separate from the website's storage. The controller chooses
the namespace from the project identity (or page path for an unsaved project),
not from guest input or the iframe's shared URL. Guest keys are unprefixed;
local storage is limited to 8 KiB and session storage to 128 KiB per project,
counting UTF-8 key and value bytes. Changes can be observed across eligible
same-origin contexts without exposing other projects' keys. Removing an output
removes its listeners, but does not erase its saved notes or preferences.

Native `dialog` elements and `form method="dialog"` work in output. The machine
cancels network form submissions by default, including submission to the current
URL when no action is specified. Guest submit handlers still receive the event.
The trusted website and editor receive the broad `allowNavigate: "self"` grant
for same-origin native forms such as Create project. The output's link-pattern
callback does not grant native form submission or access to website storage.

Output mounts in one static iframe from the beginning. A source edit starts a
configurable 900 ms trailing build debounce. Once the compiled update is ready,
a replacement load retires the old guest and replaces the document element;
there is no additional handoff debounce. The frame, browser Document, history,
and QuickJS interpreter survive; the application gets a fresh session.
Guests supporting in-place live updates can instead run their update code in
the existing session, preserving state without going through replacement load.
Set `config.output.debounceMs` between 250 and 5000, or set
`config.output.iframe` to `false` for the direct development surface. That
element-granted path stages replacements in separate subtrees; it does not
create a frame. Whole-document root units and canvas painting require a
Document grant, not a nested HTML element. See
[the rendering document investigation](../../docs/project-output-document-boundary.md).

The iframe has `allow-scripts allow-same-origin allow-forms` sandbox permissions
and fullscreen permission. This is not the untrusted-code security boundary:
QuickJS plus the constrained DOM bridge remains that boundary. The static
frame evaluates CSS media queries such as
`prefers-color-scheme` in the normal browser realm without exposing
unrestricted browser globals to the project guest. Guest `matchMedia` returns
a constrained live MediaQueryList reference; change events cross the machine
bridge, with no polling or synthetic resize needed.

Both output-frame paths receive the resolved Resources appearance. They expose that
choice as `html[data-theme="light"|"dark"]`, the standard `color-scheme`
property, and `--macchiato-color-scheme`. Project CSS can therefore follow the
in-app System/Dark/Light selection instead of consulting only the operating
system preference. Theme changes are synchronized without recreating the
iframe or its QuickJS machine.

The focused project view follows the same resolved appearance for its app bar,
project toolbar, controls, details pane, and surrounding surfaces. The code
editing surface also follows the resolved appearance.

The selected site language is passed separately to the project machine and is
available to browser-shaped guests as `navigator.language`. It is environment
context, not a forced rendering decision: the host does not rewrite the
guest's `<html lang>` attribute or translate its content. A guest application
or container configuration decides whether to use it. Cat Memory Match is the
small reference behavior: it uses Spanish labels when `navigator.language`
starts with `es`, and otherwise keeps its English labels.

Stored projects autosave their working snapshot. Every direct snapshot change
also writes a project-scoped recovery copy to session storage before the
debounced server request, so reload does not require a browser unload prompt or
lose the edit. A successful server save removes that recovery copy; a reload
that finds one restores it and immediately resumes the normal save. Merely
opening, closing, or reordering file tabs remains session UI state. The explicit
**Save tab configuration** command is the direct action that copies that state
into project configuration and therefore marks the project as changed.

Version history keeps the selected checkpoint active until an actual content
change. Reopening the dropdown does not select the working draft again.
**Save project** can publish that exact historical checkpoint without appending
a duplicate. The one `LATEST` saved version appears first; all remaining
checkpoints retain reverse chronological creation order. An unpublished
working draft has its own row, below the pinned saved version. Publishing an
old selection preserves unpublished work and the chronological patch chain.

The starter gallery mirrors the Resources design reference: Hello HTML,
Digital clock, Logo mark, Bar chart, Bouncing ball, and Starfield, alongside
the product's Article and Blank starters. They reuse the named `page`, `svg`,
and `canvas` containers rather than embedding copied element schemas in each
project. The clock and both animations are browser-tested for observable work
originating in their QuickJS guest.

Both profiles now use the Resources.co teal/blue theme by default, render the
same brand, content, project metadata, navigation, footer, fonts, responsive
breakpoints, and friendly URLs. Both headers retain the compact notification,
create, and profile controls whether signed in or out. Guest authentication
links live only in the blank-avatar profile menu; language selection lives in
the same menu instead of the footer. Runtime diagnostics do not appear in the
product interface.

The remaining differences describe runtime capability rather than separate
designs:

| Local `resources-co` | Edge `resources-edge` |
| --- | --- |
| QuickJS-backed account popovers | Native server-rendered account disclosure |
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

Registration is open by default. Set the declarative app environment value
`SIGNUPS_ENABLED=false` to hide signup entry points and prevent a previously
unknown OAuth identity from creating an account. Existing linked identities
can still log in; `/signup` explains that registration is unavailable, and an
unknown identity completing OAuth receives that message without creating an
account. The home page alone shows X and LinkedIn update links in a small block
below its sidebar.

```sh
node packages/macchiato/src/macchiato.js app env set resources-edge SIGNUPS_ENABLED false
```

Restart the local app after changing its stored environment. On Bunny, set the
same non-secret variable on the Edge Script and deploy it; purge cached HTML
when changing the value.

Both implemented providers validate signed state and PKCE, exchange the code
only at the edge, fetch the provider identity, discard the provider token, and
issue a signed `Secure`, `HttpOnly`, `SameSite=Lax` session cookie. The edge
replaces one bounded account-status island with escaped guest or session markup
and marks personalized documents `private, no-store`. Browser code is limited
to the published `command-palette-use`, `theme-use`, and `user-menu-use`
modules. The menu module adds only outside-click and Escape dismissal to native
edge disclosures; none interprets account content or arbitrary commands.

The edge island uses native `details`/`summary` disclosure. It exposes
notifications, create, project, profile, settings, language, help,
authentication, and sign-out actions through ordinary document navigation.
GitLab still owns any required consent or redirect screen outside Resources.co;
provider login state is not treated as a Resources.co session.

The session identity is upserted into strict `users` and `user_identities`
tables through the web libSQL client before the session is issued. Bunny
Database supplies the production transport and can inject
`BUNNY_DATABASE_URL`, `BUNNY_DATABASE_AUTH_TOKEN`, and
`BUNNY_DATABASE_READ_ONLY_AUTH_TOKEN` when connected to the script. Its
credentials never enter the session or browser. The current adapter uses the
full-access token for both reads and writes. The intended next boundary is two
database clients: read-only by default for rendering, search, and lookup paths,
with the full-access client passed only to explicit, validated mutation paths.
Keeping both tokens in staging lets that split be tested without changing the
deployed database. The equivalent local adapter may open two `node:sqlite`
clients over the same database: a normal write connection and a read connection
configured with `PRAGMA query_only = ON`. That pragma is useful defense in
depth, while filesystem permissions and which connection is injected remain
the stronger capability boundaries. Provider identities remain separate rows.
OAuth refreshes provider display data without overwriting a username chosen on
Resources.co. `/profile` validates username changes with the same lowercase,
single-hyphen, four-character minimum and reserved-name policy as organization
names. A change atomically moves personal project namespace URLs.

The signed-in workspace from the July 22 reference is implemented in the edge
profile. Signed-in `/` is the account dashboard, while `/projects` lists every
project. Projects and organizations are read from Bunny Database (or the same SQLite schema in the
local preview). The create menu and dashboard link to server-rendered project
and organization forms. Projects can use the personal namespace or an owned
organization namespace. All mutations use validated URL-encoded POSTs,
short-lived signed CSRF tokens, same-origin checks, parameterized SQL, and a
`303` redirect. A namespace URL such as `/benatkin` or `/resources` lists the
projects visible under that user or organization, and project breadcrumbs link
back to it. Database triggers cap the installation at 50,000 projects, each
account at 20 projects and 5 organizations. Organization titles are 4–80
characters and their URL names are at least 4 characters; the short reserved namespace list includes administrative and
infrastructure names such as `admin`, `api`, `root`, `support`, and `www`.

New and existing projects share an editor-first workspace. A project snapshot
contains an ordered set of validated `{ path, content }` files and one JSON
configuration object. Unsaved new-project drafts keep the same diff chain in
session storage; creating the project sends the current snapshot with the
metadata form. Existing projects autosave through a same-origin JSON endpoint
with an action-specific CSRF token. Autosave updates a private draft; public
visitors continue to receive the separately stored published snapshot. “Save
project” publishes the current draft. Returning to a divergent draft presents
a dismissible warning and a server-validated action to revert it to the
published snapshot. Their focused view uses the same metadata
layout as creation: owners can edit and save it, while visitors see locked
metadata but can still modify the source in an explicitly non-persistent,
in-memory playground.

Draft and version preservation is also a resource-safety feature. Editing may
contain expensive or rate-limited work produced with a user’s LLM credits, so
navigation, a failed publish, or an accidental template change should not make
that work disappear. A pristine New Project page is not treated as a draft;
the draft lifecycle begins only after a real editor or container change.
Project versions will also roll up into the project chat: chat entries can
reference the version produced by an agent or user turn, while the version
store remains the authoritative snapshot/diff history. This preserves both the
conversation that motivated a change and the exact files and configuration it
produced without duplicating project state inside chat records.
The proposed activity model treats components as visibly distinct participants
and records host diagnostics in the same chronological stream. Unread errors
remain pinned per viewer until explicitly read; reading and resolving are
separate states. Projects inherit a user or organization container whose
identity, membership, and row policy scope database capabilities. See
[`docs/project-activity-log.md`](../../docs/project-activity-log.md).
The focused project page runs the site frontend, project editor, and project in
three independently disposable WebAssembly machine roles with disjoint DOM
authority. Container transitions rotate the two workspace machines without
resetting the site machine. See
[`docs/project-page-machines.md`](../../docs/project-page-machines.md).
New-project state is explicitly `clean`, `dirty`, or a session-saved draft, so
merely opening the editor does not create disposable state. Draft discard and
owned-project deletion both require a confirmation step; deleting a project
also removes its draft, publication, and version history through database
cascades.

Organization administration stays in the standard site layout. Owners and the
single optional administrator can invite an existing username as a member or
administrator. Invitations appear in the invited user’s bell menu and can be
marked read, deleted, or accepted. Acceptance creates membership in one
transaction. Managers can list members and change roles; partial unique indexes
enforce at most one administrator even across concurrent requests. Ownership
and administrative authority are checked server-side for every mutation.

`@macchiato-dev/hub/project-history` implements the history format without a diff
dependency. Each changed file is represented by one verified contiguous text
splice (or an add/delete), while configuration uses verified nested set/delete
operations. Applying a patch checks its expected base and fails instead of
silently corrupting divergent state. SQLite/libSQL keeps the current snapshot
separately and stores only patches in `resource_project_versions`. The first
version is a patch from an empty snapshot. Ordinary editing checkpoints at
most once every five minutes; configuration changes, file deletion, and
restoration checkpoint the destructive boundary immediately. Restoring an old
version creates a new version, so the state being left remains recoverable.
Explicit Save marks the newest checkpoint as the published `LATEST` version.
It may attach a short human title through the Save split-button menu; labels
live separately from patch data so future tags can extend the model cleanly.
The Save button counts working changes since the last explicit publication,
while background checkpoints continue without pretending to publish them.
The browser first views historical snapshots without writing; returning to
Current Version is also read-only. Editing a historical snapshot is the action
that creates a branch boundary. Project configuration invokes a reusable
container by name, with only container options stored alongside that name;
the allowed DOM rules are derived from the container registry.

The next design slices include richer template-specific creation and
further per-file editor lifecycle refinements.

The standalone file remains a design/prototype reference, not executable input
to the server or a trusted bundle.

The Bunny profile runs separate QuickJS application and SQL-policy guests,
and MicroQuickJS routing and document guests inside its V8 isolate. They communicate through constrained
server devices. Immutable public artifacts are validated before publication;
the backend runtimes and bytecode remain in the private Storage artifact.

## Build the edge artifacts

```sh
node packages/website/export-static.js \
  --out packages/website/exported
```

The export contains friendly-path HTML, local fonts, and `manifest.json`. The
manifest records:

- every public object allowed through the edge;
- the `document-navigation-v1` security profile;
- the `dom-use`, `style-use`, and `html-use` validators used;
- byte length and SHA-256 evidence for every artifact.

The HTML contains no module scripts, import map, QuickJS, or dynamic page-swap
code. A strict CSP at the edge uses `script-src 'self'` and the export manifest
allowlists only the fixed command-palette and appearance modules.

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

Resources Edge serves complete English or Spanish HTML on first load. Authored
copy is read from `content/*.md` during publication, not fetched as client JSON.
Use the footer switcher or send `Accept-Language: es`; see
[`edge/README.md`](edge/README.md#localized-content) for negotiation and
artifact details.

Translated catalogue descriptions come from a content space that mirrors public
project paths. The checked-in `content-space/` is the development fixture; use
an external checkout in a deployment build with:

```sh
RESOURCES_CONTENT_ROOT=/srv/resources-content ./scripts/build-resources-bunny.sh
```

For example, the Spanish description for `/macchiato/app` is read from
`$RESOURCES_CONTENT_ROOT/macchiato/app/es.md`. Missing required descriptions
fail publication instead of falling back to a mixed-language catalogue.

```sh
node --test \
  packages/app/test/resources-edge.test.js \
  packages/app/test/resources-edge-preview.test.js \
  packages/app/test/resources-site-export.test.js

deno check \
  --config packages/website/deno.json \
  packages/website/backend/controller.ts \
  packages/website/backend/machine.ts
```

To inspect only the generated documents without emulating Bunny Storage:

```sh
cd packages/website/exported
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

The editor and frontend build commands regenerate their QuickJS/MicroQuickJS
guest environments from source. The runtime builder's `--environments-only`
mode skips standalone demo applications and fixtures; it must not be replaced
with a dependency on whichever generated facade happens to be in the checkout.

Verify the resulting inventory and run the exported backend artifact in Deno
before uploading. Substitute the build's seven-character revision below:

```sh
node scripts/verify-resources-bunny-build.js dist/resources-bunny
node --test packages/website/test/*.test.js
deno test --config packages/website/deno.json --allow-read \
  packages/website/test/bunny-machine-artifact.test.ts -- \
  dist/resources-bunny/site/resources-co-REVISION/machines/backend.bin
deno test --allow-read --allow-env \
  packages/website/test/bunny-entry-artifact.test.ts -- \
  dist/resources-bunny
```

The Deno smoke test decompresses the actual upload, compiles both runtimes,
executes routing and escaped document rendering, and checks SQL-policy
rejection. It needs no database, deployment key, or network permission. These
local checks do not establish Bunny's startup timing or replace a staging
playtest against its database and Storage configuration.

The entry test imports the actual single-file edge script, intercepting only
its platform HTTP registration and Storage fetches. It verifies registration
before fetching, then GET/HEAD home responses for both languages and signup
states against exported HTML. WASM startup is prohibited on these paths. It
uses a dummy Storage key, needs no network permission, and restores its test
environment afterward. Its Deno execution time is not a Bunny cold-start
measurement.

The build defaults `BLOG_EXAMPLES_ORIGIN` to
`https://blog-examples.resources.co`. Set it explicitly only when building for
another environment, such as staging.

This produces one reviewed Edge script and the validated Storage objects:

```text
dist/resources-bunny/
  deployment.json                    hashes and roles for every build artifact
  edge/script.ts                     conventional Bunny upload entry
  site/resources-co-<sha>/
    manifest.json
    machines/backend.bin              private runtime and backend bytecode bundle
    ...published site objects
```

The browser and server sources use the same scoped names. The Bunny build
bundles `backend/controller.ts` and its generated `machine.js` into the single
published `edge/script.ts` artifact.

Both runnable Edge forms embed the seven-character Git revision used by the
Storage prefix. Bunny's current Set Code API accepts one code string, so
`script.ts` is the reproducible bundle used by the official deployment action.
The controller fetches one private, gzip-compressed `backend.bin` object. Its
bounded resource table contains one QuickJS runtime reused by the application
and SQL-policy instances, their separate bytecode programs, and the MicroQuickJS
routing/document runtime and bytecode. One shared promise performs that Storage read.

Public `resources-site` JavaScript, WASM, and language bytecode also have
precompressed `.gz` variants in the Storage export. The static handler chooses
them through `Accept-Encoding` and returns the original MIME type with
`Content-Encoding: gzip`; browser URLs and streaming compilation stay unchanged.
Local resources-edge uses the same preparation and negotiation. This does not
enable caching or compress user/API responses. Upload the complete export,
including the variants; the deployment verifier checks that each decompresses
to its original asset. No additional environment variable is needed.

The Resources application and its SQL policy run in separate Wasm machines.
Application `sql` messages are forwarded to the policy machine, which owns the
fixed statement catalog, argument validation, read/write selection, batch
rules, row limits, and result shaping. Only that machine can request the host's
low-level database adapter. The adapter transports column names, row arrays,
and affected-row counts; it contains no `sql-use` catalog or operation policy.
Database migration and store initialization remain lazy and shared across
requests, but their orchestration now runs in the inner QuickJS application
machine. Their compatibility clients also cross the policy machine: legacy
query-shaped calls are matched against the same build-time catalog before the
host database adapter sees them. This keeps `sql-use` and its policy maps out of
the host bundle while the hub application code is moved into the inner machine.
`/health` and the authenticated project-version list/read APIs
execute their route decisions and version reconstruction inside that guest.
Account, organization, and project stores are also constrained by exact named
SQL policies.
Schema migration now uses the same fixed-operation `sql-use` adapter. The
migration runner can select only the ledger reads/writes and schema statements
enumerated from the checked-in migration set; arbitrary runtime SQL is rejected.
All supported HTTP methods enter `server-use`. The guest performs method and
protected-document routing—including provider-link authorization—before
delegating GET/HEAD rendering through a request-scoped document device, while
response bodies remain outside its arena.
Notification read, delete, and invitation acceptance writes also run there;
the guest validates form encoding, origin, session, and CSRF state before
requesting fixed writes or atomic named batches.
Organization invitation and member-role POSTs follow the same boundary: the
guest owns their validation, authorization state machine, redirects, UUID
requests, and atomic write composition while the controller exposes only the
named organization operations.
Profile username changes now use that controller as well, including the
project-namespace update and refreshed session cookie.
Project snapshot saves and restores now enter through the same guest. The guest
owns content-type, origin, session, and project-scoped CSRF decisions before it
invokes a request-scoped project capability. That capability consumes the body
as bounded 64 KiB chunks and preserves the existing 72 MiB request and response
contract without copying a project-sized value into the server guest's 4 MiB
arena. It forwards the validated value to the separate QuickJS application
machine, where snapshot validation, diffing, checkpoint planning, persistence,
and reconstruction now run. The controller no longer carries a parallel
project snapshot implementation.
Project form mutations use the controller too. `POST /projects` and
`POST /projects/:id` are intercepted before the published-document handler.
The MicroQuickJS guest owns authentication, same-origin and form-encoding
policy, CSRF sequencing, intent selection, create/update/save/publish/revert/
delete ordering, and redirects. A request-scoped device keeps the large
URL-encoded snapshot outside the guest arena and exposes only bounded fields;
it does not collapse the workflow into one host-side application operation.
The application machine receives database results only through the separate
QuickJS SQL-policy machine. Both use growable buffers with a 128 MiB wire-message
ceiling, not a preallocated arena of that size. The routing runtime's 1 MiB
transfer buffer and 4 MiB MicroQuickJS arena cannot carry large snapshots.
Avoiding the remaining project-sized copies with bounded shared resources is
a future performance refinement; SQL authority stays inside the policy guest.

Build-published HTML and CSS remain ordinary immutable Storage objects. They
have already passed `html-use`, `dom-use`, and `style-use`, so serving them does
not require reparsing them in the request path. Dynamic HTML/CSS generation is
different: it belongs in the policy/rendering machine and crosses to the
controller only as validated output. The controller forwards messages between
that machine and the application machine; it does not become a renderer.

The application machine also owns the dynamic document plan. It chooses the
published shell and gathers project, namespace, profile, dashboard,
notification, and public-discovery models. Its plan names the CSRF capabilities
the controller may mint. The MicroQuickJS document machine consumes the shell,
plan, signed tokens, and localized messages, then performs all dynamic region
composition. Consequently the host coordinates storage, authentication, and
machine messages without carrying the page-kind switch or direct store calls.

### Update an existing staging deployment manually

1. Run `BLOG_EXAMPLES_ORIGIN=https://staging-blog-examples.resources.co ./scripts/build-resources-bunny.sh`.
2. Upload the *contents* of `dist/resources-bunny/site/` to the Storage zone
   root. This creates the revisioned directory already embedded in the
   function. Upload its `manifest.json` last, then keep older revisioned
   directories until the new function is deployed and verified.
3. Replace the staging Edge Script contents with
   `dist/resources-bunny/edge/script.ts`, then save and deploy it.
4. Purge the staging Pull Zone cache and check `/`, `/projects/new`, `/blog`,
   and both locale choices before testing OAuth.

For cacheable anonymous HTML, configure Bunny's cookie vary list with
`resources_locale` and `__Host-resources_session`, and vary by the
`Accept-Language` request header for visitors who have not selected a language.
Anonymous localized documents use a short public cache lifetime. Responses
with a valid session remain `private, no-store`; do not override that policy
with a broad HTML cache rule. Immutable scripts, styles, fonts, and example
assets may retain their long public lifetime.

1. Build the deployment and upload the *contents* of
   `dist/resources-bunny/site/` to the root of a private Bunny Storage zone.
   The build-created revision directory is part of every uploaded object key.
2. Create one Bunny standalone Edge Script from
   `dist/resources-bunny/edge/script.ts`. The authored TypeScript controller is
   `packages/website/backend/controller.ts`; the build bundles its machine and
   embedded compressed runtime into the single Set Code artifact.
3. Configure the main Resources.co script with:

   - `BUNNY_STORAGE_ORIGIN`: HTTPS Storage API origin, including the zone path
     if required by the selected endpoint.
   - `MANIFEST_TTL_MS`: optional manifest cache time, clamped to 1–300 seconds.
   - `STORAGE_API_KEY`: an environment **secret**, not a normal variable.
   - `PUBLIC_ORIGIN`: canonical HTTPS site origin, with no path.
   - `BLOG_EXAMPLES_ORIGIN`: the separate origin used by sandboxed examples.
   - `GITHUB_CLIENT_ID`: GitHub OAuth or GitHub App client ID.
   - `GITHUB_CLIENT_SECRET`: an environment **secret**.
   - `GITLAB_CLIENT_ID`: GitLab OAuth application ID.
   - `GITLAB_CLIENT_SECRET`: an environment **secret**.
   - `SESSION_SIGNING_KEY`: a random environment **secret** of at least 32
     bytes; rotating it signs everyone out.
   - `SIGNUPS_ENABLED`: registration is enabled when omitted; set exactly to
     `false` to prevent unknown OAuth identities from creating accounts.
   - `BUNNY_DATABASE_URL`, `BUNNY_DATABASE_AUTH_TOKEN`, and
     `BUNNY_DATABASE_READ_ONLY_AUTH_TOKEN`: added by connecting the staging
     Bunny Database to the script. Named `sql-use` reads use the read-only
     client; named writes and migration operations use the write client.

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
separate authorities. See [Bunny Database operations](../../docs/bunny-database-operations.md)
for the difference between Bunny's internal durability snapshots and an
operator-controlled backup.

The minified Edge entry registers its HTTP server without network or database
work. An anonymous `GET /` with no query or session cookie reads a
pre-rendered localized home document directly from the revisioned Storage
prefix and identifies itself with `X-Resources-Edge-Tier: bootstrap`. The fast
document intentionally uses the valid empty state for live project discovery;
Browse and signed-in home use the bundled application because they require the
database.

On the first database-backed request, the application checks
`resource_schema_migrations`. If it is
current, the request proceeds; otherwise one shared promise applies ordered,
idempotent SQL migrations and all affected requests wait. A failure returns a
non-cacheable `503`, clears the promise, and a later request retries.

The `resources-edge.localhost` adapter deliberately follows the same lifecycle.
Its anonymous home passes through `edge/bootstrap.js`; other routes dynamically
import `preview-application.js`, wait on the same migration runner, memoize the
application within the process, and clear the promise after a failed import so a
later request can retry. The local Storage transport remains in memory, but it
must not bypass the loading or readiness boundary that production depends on.

Prefer initializing and verifying the database before deployment by providing
its full-access credentials in the environment and running:

```sh
deno run --config packages/website/deno.json \
  --allow-env=BUNNY_DATABASE_URL,BUNNY_DATABASE_AUTH_TOKEN \
  --allow-net \
  packages/website/migrate-bunny-database.js
```

The command uses the same SQL migration ledger and verifies all expected tables
through `sqlite_schema`. It never uses the read-only token;
application reads can move to that separate client once the planned
query/mutation capability split is implemented.

Home and Browse are curated discovery surfaces. They list public projects only
from the `benatkin`, `resources`, and `macchiato` namespaces. This does not make
other public projects private: their direct namespace/project URLs continue to
work, and account project lists remain complete.

Deployment is manual; this repository does not contain a Bunny deployment
workflow. Build and package without deployment credentials. Before uploading,
`scripts/verify-resources-bunny-build.js` re-hashes the complete
deployment inventory, verifies the revision embedded in the Edge controller,
requires both private machines, and proves that neither machine entered the
public site manifest. Upload the revisioned Storage artifacts with the manifest
last, then deploy the matching standalone script. Keep staging and production
credentials separate. The existing Storage upload script uses:

| Kind | Name |
| --- | --- |
| Upload credential | `BUNNY_STORAGE_UPLOAD_KEY` |
| Upload destination | `BUNNY_STORAGE_UPLOAD_ORIGIN` |

The upload key belongs only in the deployment step. The Edge Script receives
a separate read-only `STORAGE_API_KEY` through Bunny. A deployment container
must remain a narrow, Fedora-based, Podman-compatible client: builds, packaging,
and development servers stay outside it and do not receive its credentials.

For staging, create a separate Storage prefix, Edge Script, and Bunny Database;
do not point the staging script at production state. In the staging script set
`PUBLIC_ORIGIN` to the exact staging hostname and add the Storage read key,
OAuth client IDs/secrets, and a fresh `SESSION_SIGNING_KEY`. From Bunny
Database's Access page, use **Add Secrets to Edge Script** so Bunny supplies
the database URL plus full-access and read-only tokens. This application creates
accounts and projects, so explicit mutation handlers still require the
full-access token. Retain the read-only token for the planned default client;
do not silently fall back from a read-only operation to full access once that
boundary is implemented.

Attach two hostnames to the same validated export and Edge Script. Production
uses `https://blog-examples.resources.co`; staging uses
`https://staging-blog-examples.resources.co`. Set `BLOG_EXAMPLES_ORIGIN` to the
matching value in each deployment environment. Locally, the development plugin
installs `blog-examples.localhost` as its own declarative app. The example host
serves only `/-/blog-examples/` artifacts; iframe CSP names these origins
explicitly and does not grant `allow-same-origin`.

Register these provider callbacks against that same `PUBLIC_ORIGIN`:

```text
https://staging.resources.co/auth/github/callback
https://staging.resources.co/auth/gitlab/callback
```

Deploy to staging first and check the English and Spanish home pages, `/blog`,
sign-in, and project loading/editing before considering production. Local build
and browser checks do not establish that the Bunny deployment has succeeded.
Production deployment remains a separate explicit action.

`BUNNY_ORIGIN` remains accepted as a compatibility alias, but new deployments
should use the less ambiguous `BUNNY_STORAGE_ORIGIN` name.

The SDK is pinned through `deno.json` and `deno.lock`; the edge script does not
import executable code from a third-party CDN such as esm.sh.

### Install the code-tour project

The blog's exported `dom-use` tour can also be represented by an ordinary,
public Resources project. The installer requires an existing Resources user
and defaults to `benatkin` in the default local data directory:

```bash
node packages/website/seed-tour-project.js
```

Use `--username <name>`, `--data-dir <directory>`, or `--source-dir <directory>`
for another account, database, or tour checkout. Re-running the command updates
and republishes the same project. The project ZIP contains the editable tour
HTML, CSS, JavaScript, generated data, and illustrations. The configured
`BLOG_EXAMPLES_ORIGIN` supplies the environment-specific published export.

### Future Deno module publication

Projects will shortly need a space for JavaScript that Deno can import over
HTTPS. This should be a separate deployment authority and origin, not another
path in the Resources document bucket. Published releases should use immutable,
versioned or content-addressed URLs and an explicit manifest recording module
paths, media types, and hashes. The origin should expose only the CORS needed by
Deno and approved browser consumers. Declarative project configuration will pin
exact module URLs; a mutable `latest` URL must not become part of a reproducible
or security-sensitive deployment.

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

## Credits

HTML character references are decoded in the compiler guest by
[entities](https://github.com/fb55/entities), with separate text and attribute
rules. Its decoder is bundled into the compiler, not downloaded by the browser
or added to the host. The [license notice](THIRD-PARTY-NOTICES.txt) is also
included alongside the exported runtime artifacts.

Resources.co uses [QuickJS](https://bellard.org/quickjs/) for JavaScript
sandboxes and [CodeMirror](https://codemirror.net/) for constrained code-editing
surfaces. Development, review, writing, and design have been assisted by
[Codex](https://openai.com/codex/), [GPT](https://openai.com/),
[Claude Code](https://www.anthropic.com/product/claude-code),
[Claude](https://www.anthropic.com/claude), Claude Design,
[Kimi](https://www.kimi.com/), and [Kimi Code](https://www.kimi.com/code).

### Icon inventory

Lucide icons are copied inline so the interface remains offline-capable and
does not acquire an icon-font or runtime network dependency. Keep this ledger
complete whenever another Lucide icon is introduced.

| Source | Icon | Interface use |
| --- | --- | --- |
| [Lucide](https://lucide.dev/) | [`history`](https://icones.js.org/collection/lucide?s=history&icon=lucide:history) | Project version-history button |

The remaining home, close, editor, split-view, output-view, details,
full-screen, file-browser, notification, create, account, and disclosure icons
are platform-owned inline SVGs rather than Lucide glyphs.

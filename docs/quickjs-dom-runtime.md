# QuickJS DOM Runtime Design

## Live browser capability prototype

`@macchiato-dev/browser-use` now prototypes the live-DOM branch of this design.
It gives QuickJS opaque handles scoped to one browser subtree and forwards a
small, JSON-only `document` surface. The host allowlists selectors, readable
properties, and writable properties; native node references never cross into
QuickJS. It also detects the subtree's actual tag, attribute, class, depth,
element-count, and text shape at mount time and after each mutation.

`@macchiato-dev/code-editor-use` is the first specialized adapter. CodeMirror 6
runs natively because selection, focus, composition, layout geometry, and
incremental rendering are browser capabilities that cannot be represented by
the current serialized `dom-use` tree. A QuickJS controller observes its
shape through `browser-use`, while the adapter fixes the CodeMirror extensions
and continuously checks one declared subtree. Shape violations destroy and
clear the editor. See `examples/code-editor-use/`.

This is intentionally not a claim that arbitrary browser libraries can run
unchanged in QuickJS. The general bridge and each native adapter remain
separate capabilities: `browser-use` controls access, and the adapter declares
the additional native behavior it requires.

## Status

Macchiato has the first pieces of a constrained app runtime, but it does not
yet automatically run app scripts inside QuickJS or connect those scripts to a
live host-rendered DOM.

Current pieces:

- `@macchiato-dev/quickjs-emscripten-sandbox` can evaluate JavaScript strings in
  a QuickJS context.
- `@macchiato-dev/dom-use` can create a schema-bound guest DOM tree and validate
  node creation, attributes, child relationships, depth, `innerHTML`, and style
  declarations.
- `@macchiato-dev/html-use` can parse and serialize simple HTML through a
  caller-provided element factory.
- `@macchiato-dev/style-use` validates allowed CSS properties and rejects
  dangerous style values.
- `examples/dom-use-demo` stores a page fragment, stylesheet, DOM schema, and
  CSS schema that can be imported into SQLite and served as a sandboxed page.
  Schemas may be stored inline on the page row or referenced by name, such as
  `@macchiato-dev/dom-use@0.0.1/article.json`.

Missing pieces:

- Hosted HTML can be loaded from SQLite and sanitized with `dom-use`; full app
  documents are not yet managed as live runtime documents.
- Server-side rendering and browser hydration do not yet share one app runtime
  contract.
- `<script>` tags are not extracted and run in QuickJS.
- Guest scripts do not receive a DOM capability inside QuickJS.
- Browser events are not forwarded into QuickJS.
- Guest DOM mutations are not streamed or batched into a live host renderer.
- There is no no-WebAssembly browser mode for dynamic pages.
- Authored Content Security Policy is not yet validated against schema policy.
- The runtime boundary is not yet strong enough to hide host policy objects from
  guest code.

## Goal

The runtime should let a registered Macchiato app behave like a small web app
while keeping all guest behavior behind explicit capabilities.

Guest code should be able to:

- read and mutate a constrained document tree;
- register event handlers;
- set safe text, attributes, and styles;
- use sanitized `innerHTML` where allowed;
- receive safe event records from browser interactions.

Guest code should not be able to:

- execute directly in the browser page;
- access the real `window`, `document`, DOM nodes, cookies, storage, or network
  APIs unless explicitly granted;
- inspect or replace the schema/policy object;
- bypass `dom-use`, `html-use`, or `style-use` mutation checks;
- load external resources through DOM URL attributes or CSS `url(...)` unless
  the schema explicitly allows that URL shape;
- create arbitrary host objects or retain host references after teardown.

## Proposed Architecture

```
registered app files
        |
        v
 app loader + schema cascade engine
        |
        +--> parse HTML into guest tree through dom-use
        |
        +--> extract scripts and block browser execution
        |
        v
 runtime target
        |
        +--> server QuickJS, browser QuickJS/WASM, or no-WASM browser policy
        |
        v
 guest execution boundary  <---- safe event records ---- browser host
        |
        v
 DOM capability
        |
        v
 schema-bound guest tree
        |
        v
 mutation queue
        |
        v
 host renderer ---- validated output ---- real DOM
```

## Rendering Modes

The runtime contract should not assume WebAssembly exists in the browser. The
same app and schema should support multiple rendering modes:

- **SSR only**: the server resolves schemas, runs allowed app code if needed,
  sanitizes the result, and sends inert HTML/CSS. No app JavaScript is sent to
  the browser.
- **SSR plus QuickJS hydration**: the server sends the validated initial DOM and
  a browser QuickJS/WebAssembly runtime. Browser events are delivered to guest
  code through `dom-use` and mutations are applied through the host renderer.
- **SSR plus no-WASM hydration**: the server sends validated HTML/CSS plus a
  host-owned enhancement layer that does not evaluate guest JavaScript in the
  browser. Any behavior must be expressible as schema-approved host behavior,
  form submissions, links, or server round trips.
- **Client-only QuickJS**: useful for demos such as `dom-use-todos`, but not the
  default shape for public pages that need stable first paint and predictable
  fallback.

SSR is the common base. Hydration is an enhancement selected by policy and
capability detection, not a requirement for page correctness. A page should be
readable and navigable after SSR even when WebAssembly, JavaScript, or hydration
fails.

The server should record which mode produced a response. That mode belongs in
debug headers or server logs, not in guest-visible page content.

## Document, Style, and Policy Pass-Through

Normal mode should treat HTML, CSS, and CSP similarly: authored input can pass
through when it is ordinary, policy-compliant, and easy for Macchiato's small
parser/serializer components to understand. Unusual input should be rejected
rather than partially interpreted.

This keeps the first implementation tractable:

- `html-use` can parse and serialize a deliberately small HTML surface.
- `style-use` can validate common CSS without becoming a full browser CSS
  engine.
- CSP validation can check authored directives against schema/resource policy
  without introducing a second CSP authoring API.

The tradeoff is intentional. Normal mode is for predictable app/page shapes,
development validation, SSR, and production deployment where the input stays
inside the supported subset. It should fail closed on syntax or constructs that
would require browser-grade parsing to understand safely.

Eventually there should be a fuller runtime mode for compatibility with the
broader web platform. That mode will likely need heavier components, such as
Servo-derived HTML/CSS parsing, serialization, and policy integration, under its
own runtime setup. It should not complicate normal mode's small validators or
change their fail-closed defaults.

## Load Flow

1. Resolve the registered site and page configuration from SQLite.
2. Resolve schema references, package defaults, site policy, page policy, and
   runtime overrides through the schema cascade engine.
3. Compile the effective policy into DOM, CSS, runtime, resource, and CSP
   validators.
4. Read the app entry HTML.
5. Parse HTML on the host.
6. Build an initial guest DOM tree through `dom-use`.
7. Extract script tags instead of serving them to the browser as executable
   script.
8. If SSR execution is enabled, create a server QuickJS context for the app
   instance.
9. Install a narrow API surface in QuickJS, such as `document`, timers, and
   event registration.
10. Execute extracted scripts in dependency order.
11. Render the initial guest tree into HTML and CSS.
12. Validate the authored CSP against the effective policy and emit it when the
    host is responsible for the response.
13. If hydration is enabled and available, attach the selected browser runtime.
14. Flush subsequent guest mutations into the host renderer.

## DOM Capability Shape

The first useful API should be intentionally small:

```javascript
document.createElement(tagName)
document.createTextNode(text)
document.body
node.appendChild(child)
node.removeChild(child)
node.replaceChildren(...children)
element.setAttribute(name, value)
element.getAttribute(name)
element.removeAttribute(name)
element.textContent
element.innerHTML
element.addEventListener(type, handler)
```

Every operation should resolve a guest object ID and call host-owned `dom-use`.
QuickJS should not hold direct host DOM references. The bridge should expose
opaque handles, not live host objects.

## Mutation Model

The bridge should record validated mutations as patches:

```javascript
{ op: "createElement", id, tagName }
{ op: "setText", id, text }
{ op: "setAttribute", id, name, value }
{ op: "appendChild", parentId, childId }
{ op: "removeChild", parentId, childId }
```

The host renderer can apply patches incrementally. A full rerender is simpler
for the first implementation, but patches become important once event handlers,
focus, text selection, and larger trees matter.

## Event Model

Browser events should become plain data records before they cross into QuickJS:

```javascript
{
  type: "click",
  targetId: "node-42",
  currentTargetId: "node-42",
  key: null,
  value: null,
  checked: null
}
```

Only explicitly supported event fields should be copied. Methods such as
`preventDefault()` and `stopPropagation()` can be modeled as return values or
small event capability handles, but the guest should not receive the native
browser event object.

## Script Handling

Initial support can restrict scripts to classic inline scripts and local script
files. Module loading, import maps, dynamic imports, and package resolution can
come later.

Suggested first pass:

- extract `<script>` elements during HTML load;
- reject remote script URLs;
- read local script files from the registered site directory;
- run scripts in source order inside one QuickJS context;
- expose only the installed runtime globals.

No-WASM browser mode should not run guest scripts in the browser. It can still
serve SSR output and host-owned enhancement code, but that code must not import
or evaluate app-provided JavaScript. Dynamic behavior in this mode should come
from one of three places:

- server-rendered navigation and forms;
- host-owned components selected by schema policy;
- declarative, schema-validated behavior that the host implements directly.

This keeps the fallback mode useful without recreating a second unsafe JavaScript
runtime.

## Content Security Policy

CSP should be hand-written policy owned by the app or operator. Macchiato should
validate it against the effective schema, not replace it with a separate runtime
API or require apps to ask Macchiato for generated directives during normal
operation.

That distinction matters for deployment. A team may use Macchiato as a
development tool to validate DOM, CSS, resources, and CSP, then ship the same
HTML, CSS, assets, and CSP headers through ordinary production hosting without
carrying Macchiato runtime overhead. For SSR deployments where Macchiato owns the
HTTP response, it can emit the authored CSP header. For static or external
production deployments, the validated CSP can be copied into the hosting layer.

CSP is not the only protection layer, but it is the browser-enforced backstop
for no-WASM and partially hydrated modes.

Default posture:

```text
default-src 'none'
base-uri 'none'
object-src 'none'
frame-ancestors 'none'
form-action 'self'
img-src 'self'
font-src 'self'
style-src 'self'
script-src 'none'
connect-src 'none'
```

Authored directives should be validated against the effective schema:

- `script-src 'none'` for SSR-only and no-WASM pages that do not need host
  enhancement code.
- A nonce or hash-based `script-src` for host-owned hydration/runtime code.
  Guest script text should not be whitelisted as browser script.
- `connect-src` should stay `none` unless the schema grants a specific host
  capability, such as a same-origin event or form endpoint.
- `font-src` should default to same-origin cached font routes such as
  `/-/fonts/...`; provider URLs require explicit schema approval.
- `img-src`, `media-src`, and other URL-bearing directives should be derived
  from the same URL rules used by `dom-use` and `style-use`.
- `style-src` should prefer host-served stylesheets. Inline styles require a
  nonce/hash and still must pass `style-use`.
- `form-action` should only include allowed submission origins and defaults to
  same-origin or `none` depending on whether forms are enabled.

CSP validation should refuse a policy broader than the DOM/CSS schema allows. If
a schema says no external URLs but an authored CSP asks for
`font-src https://fonts.example`, that should be a policy error rather than a
best-effort warning. Conversely, a stricter CSP than the schema allows is valid;
it just means the browser may block resources the schema would have permitted.

The authored CSP should be testable independently. A good test shape is:

1. load the authored CSP and effective schema;
2. validate the CSP against the schema;
3. render the page in Playwright with the CSP enforced;
4. assert no unexpected console CSP violations;
5. assert blocked probes fail, such as inline browser script or disallowed font
   provider requests;
6. assert allowed same-origin resources load.

## Hydration Selection

Hydration should be selected by the host from the effective runtime policy and
the browser capability, not by the app content itself.

Possible policy shape:

```json
{
  "runtime": {
    "ssr": true,
    "hydrate": "optional",
    "browserEngines": ["quickjs-wasm", "none"],
    "fallback": "server-roundtrip"
  }
}
```

Interpretation:

- `ssr: true` means the server can produce the first render.
- `hydrate: "required"` should be rare because it makes no-WASM browsers unable
  to use the page.
- `hydrate: "optional"` allows QuickJS/WebAssembly hydration when available.
- `browserEngines: ["none"]` means no guest code may run in the browser.
- `fallback: "server-roundtrip"` means forms, links, and actions should remain
  usable through server requests.

The host should prefer this order for public pages:

1. SSR response;
2. optional browser QuickJS hydration when policy and capability allow it;
3. no-WASM host behavior or server round trips when QuickJS is unavailable.

The Resources.co homepage should fit this model: SSR first, no guest JavaScript
sent as browser script, with any future interactivity either hydrated through
the runtime or expressed as policy-approved host behavior.

## Schema Source and Resolution

Schema names such as `@macchiato-dev/dom-use@0.0.1/article.json` should be
treated as package-addressed resources, not arbitrary labels. The name says:

- package scope and name: `@macchiato-dev/dom-use`;
- schema package version: `0.0.1`;
- resource path inside that package: `article.json`.

The source of truth should be the package artifact. In a Node install this will
usually mean resolving the resource from `node_modules`, for example:

```text
node_modules/@macchiato-dev/dom-use/article.json
```

The SQLite `schemas` table can then act as a controlled mirror/cache of package
schema resources. This keeps runtime page rows stable and auditable while still
letting schemas originate from versioned source packages.

Suggested lifecycle:

1. Install or otherwise make a schema-providing package available.
2. Resolve a schema reference against trusted package sources.
3. Validate and normalize the schema document.
4. Store the normalized JSON in SQLite under its fully qualified schema name.
5. Store page rows with schema references, not copied schema bodies, when the
   page wants package-managed policy.
6. Resolve page schema references from SQLite at request time.

The resolver should avoid loading arbitrary files from the app directory. It
should only read from trusted schema package locations or from a separate
administrator-controlled schema store. This keeps app content, schemas, and
runtime code under different authority levels.

## Schema Cascade Engine

Schemas will need to cascade like browser policy: broad defaults first, then
more specific trusted policy, with page-local rules allowed only where the parent
policy explicitly permits them.

The cascade should compile one effective policy from ordered layers:

1. **Runtime defaults**: safest platform defaults, such as no scripts, no
   external URLs, conservative size limits, and no browser guest execution.
2. **Package schema**: versioned policy from trusted schema packages, such as
   `@macchiato-dev/dom-use@0.0.1/article.json`.
3. **Compatibility patch**: trusted replacement metadata for older schema names.
4. **Operator policy**: install-wide allowlists, pinned versions, provider
   choices, and storage decisions.
5. **Site policy**: subdomain or app-level choices owned by the site operator.
6. **Page policy**: page-specific narrowing, such as fewer allowed elements or a
   lower node limit.
7. **Runtime request context**: temporary facts such as selected hydration mode,
   nonce values, and same-origin route mounts.

Each layer should declare whether a field is mergeable, replace-only, or
non-overridable. Examples:

- `limits.maxNodes` can only become stricter unless an operator policy grants a
  higher ceiling.
- `urls` can add allowed patterns only from trusted operator/site layers, not
  from app-authored HTML.
- `nodes` can be narrowed by page policy, but broadening requires a trusted
  schema or operator layer.
- `events` should be explicit by event type and payload fields; broad wildcard
  event grants should not cascade from page content.
- CSP directives are authored policy artifacts. The cascade engine validates
  them against effective resource/runtime policy instead of treating them as
  arbitrary strings page policy can append to.

The engine should keep provenance for every effective field. When a page can
load `font-src 'self' /-/fonts/...`, the debug/audit data should answer which
schema layer allowed fonts, which layer chose the font cache, and which layer
selected the public route.

The cascade output should be a normalized object consumed by all validators:

```json
{
  "dom": {},
  "css": {},
  "events": {},
  "resources": {},
  "runtime": {},
  "cspValidation": {},
  "provenance": {}
}
```

`dom-use`, `style-use`, the server renderer, the hydration runtime, and CSP
validation should all consume the same effective policy. This prevents a common
security bug where the authored CSP allows a URL that `dom-use` rejects, or
hydration exposes an event that the static sanitizer never approved.

The cascade engine should fail closed. Unknown fields, invalid merge operations,
or attempts to broaden policy from an untrusted layer should reject the page
configuration during import or request rendering.

## Schema Package Control

Schema packages are security policy, not ordinary app assets. The implementation
should eventually move schema resolution into a small, tightly controlled module
with a narrow API:

```javascript
resolveSchema("@macchiato-dev/dom-use@0.0.1/article.json")
```

That module can enforce:

- allowed package scopes;
- exact version parsing;
- resource paths ending in `.json`;
- package integrity checks where available;
- schema JSON validation before import;
- no transitive file serving to the browser;
- no fallback to app-owned paths unless explicitly configured by an operator.

The current SQLite `schemas` table is a practical first step, but the long-term
resolver should preserve a faithful mirror of package schema resources and make
their provenance clear.

## Schema Compatibility and Security Patches

A newer schema package may need to stand in for older schema versions. This is
useful when the newer package contains a security patch and can safely validate
content written for an older schema.

The compatibility rule should be explicit data, not an implicit semver guess.
For example, a schema package could declare that
`@macchiato-dev/dom-use@0.0.2/article.json` is valid for pages requesting
`@macchiato-dev/dom-use@0.0.1/article.json`.

Possible compatibility metadata:

```json
{
  "name": "@macchiato-dev/dom-use@0.0.2/article.json",
  "replaces": [
    "@macchiato-dev/dom-use@0.0.1/article.json"
  ],
  "reason": "security patch for allowed attribute handling"
}
```

Resolution policy should be conservative:

- exact schema name wins when present and allowed;
- replacement must be declared by the newer trusted schema package;
- replacement should only tighten or preserve behavior, not broaden it;
- the resolved effective schema name should be recorded for audit/debugging;
- operators should be able to pin an exact old schema if they knowingly accept
  that risk, but safe defaults should prefer patched replacements.

This means a Macchiato install does not have to download or store every historic
schema file forever. It can store a newer package plus compatibility metadata,
then satisfy older page rows through a patched effective schema.

## Sanitization Boundary

There should be one mutation path:

```text
guest script -> QuickJS bridge -> dom-use/html-use/style-use -> guest tree -> host renderer
```

No guest-controlled string should be assigned to the real DOM directly. Host
debug UI may inspect internals during development, but production-like demos
should avoid showing the schema object to guest-visible code.

URL-bearing sinks are part of the sanitization boundary. `dom-use` should deny
URL attributes such as `href`, `src`, `srcset`, `action`, and `formaction` by
default. `style-use` should deny CSS `url(...)` and `@import` by default. A
schema may opt in to specific URL patterns, but the baseline must be no imports
and zero unintentional exfiltration.

CSP validation should use these same URL decisions. There should not be a
separate CSP allowlist that can accidentally drift wider than the DOM/CSS
validators. If a resource is allowed by authored CSP but rejected by `dom-use`
or `style-use`, the page policy is inconsistent and should fail validation.

Schemas should also carry host-enforced resource limits. The current DOM/CSS
validators cap text length, attribute name/value length, attribute count, node
count, stylesheet length, CSS value length, URL length, and import count, with
defaults in place even when a schema omits `limits`. Text, attributes, and CSS
also reject troublesome control/bidi/noncharacter code points by default.

Normal mode may also reject otherwise valid browser syntax when accepting it
would require full-fidelity parsing, serialization, or cascade behavior. The
important contract is that supported input passes through predictably and
unsupported input is rejected clearly. A future browser-grade mode can broaden
compatibility without weakening normal mode.

## Resource Limits

The QuickJS runtime should enforce limits before this becomes usable for
untrusted or semi-trusted apps:

- execution timeout or interrupt handler;
- memory limit;
- maximum DOM node count;
- maximum event queue depth;
- maximum serialized string length for `innerHTML`;
- teardown that disposes QuickJS handles and host object tables.
- maximum CSP directive length and source expression count;
- maximum cascade depth and merged policy size.

## Open Questions

- Should the first bridge live in `dom-use`, a new `page-use` package, or the
  app server?
- Should event handlers be stored as QuickJS function handles or guest-side
  listener IDs?
- Should rendering begin with full rerendering and later evolve to patches?
- What subset of browser APIs should exist beyond DOM and timers?
- How should async work: microtasks only, host-driven timers, or a fuller event
  loop abstraction?
- How should app files declare their schema: database row, manifest file, or
  host-owned default policy?
- What metadata format should schema packages use to declare replacement
  compatibility for older schema names?
- Should the runtime support multiple isolated app instances on one host page?
- What is the minimal declarative behavior model for no-WASM browser mode?
- Which cascade fields can be widened by site policy, and which require
  operator policy?
- How should development mode report authored CSP issues without requiring
  Macchiato to be the production response path?

## Incremental Plan

1. Add a runtime package that owns an app instance, a QuickJS context, object
   handles, and a `dom-use` document.
2. Expose a minimal `document` bridge into QuickJS.
3. Run a hardcoded script that creates a title, paragraphs, and a list.
4. Render the resulting guest tree to host HTML.
5. Add browser event forwarding for `click`, `input`, and `submit`.
6. Parse registered app HTML, extract scripts, and run them in source order.
7. Add mutation patches instead of full rerendering.
8. Move schema selection into host-owned app configuration.
9. Resolve schema names from package-backed schema sources and mirror them into
   SQLite.
10. Add explicit schema replacement metadata for security-patched versions.
11. Add resource limits and teardown tests.
12. Add a schema cascade engine that compiles DOM, CSS, event, resource, and
    runtime policy with field provenance.
13. Add authored CSP validation and Playwright tests for allowed and blocked
    resources.
14. Add SSR-first rendering for Resources.co, with optional hydration selected
    by effective runtime policy.
15. Add no-WASM browser mode that uses CSP plus host-owned declarative behavior
    or server round trips rather than guest browser script execution.

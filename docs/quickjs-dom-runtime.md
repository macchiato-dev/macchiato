# QuickJS DOM Runtime Design

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
- `<script>` tags are not extracted and run in QuickJS.
- Guest scripts do not receive a DOM capability inside QuickJS.
- Browser events are not forwarded into QuickJS.
- Guest DOM mutations are not streamed or batched into a live host renderer.
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
- create arbitrary host objects or retain host references after teardown.

## Proposed Architecture

```
registered app files
        |
        v
 app loader
        |
        +--> parse HTML into guest tree through dom-use
        |
        +--> extract scripts and block browser execution
        |
        v
 QuickJS runtime  <---- safe event records ---- browser host
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

## Load Flow

1. Resolve the registered site directory from SQLite.
2. Read the app entry HTML.
3. Parse HTML on the host.
4. Build an initial guest DOM tree through `dom-use`.
5. Extract script tags instead of serving them to the browser as executable
   script.
6. Create a QuickJS context for the app instance.
7. Install a narrow API surface in QuickJS, such as `document`, timers, and
   event registration.
8. Execute extracted scripts in dependency order.
9. Render the initial guest tree into real DOM.
10. Flush subsequent guest mutations into the host renderer.

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

## Resource Limits

The QuickJS runtime should enforce limits before this becomes usable for
untrusted or semi-trusted apps:

- execution timeout or interrupt handler;
- memory limit;
- maximum DOM node count;
- maximum event queue depth;
- maximum serialized string length for `innerHTML`;
- teardown that disposes QuickJS handles and host object tables.

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

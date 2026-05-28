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
- `experiments/dom-use-demo` manually builds a guest tree in browser JavaScript
  and copies that tree into the real DOM.

Missing pieces:

- Hosted HTML is not parsed into a managed runtime document.
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
9. Add resource limits and teardown tests.

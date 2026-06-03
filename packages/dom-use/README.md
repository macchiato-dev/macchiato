# @macchiato-dev/dom-use

Structured DOM access according to a schema. `dom-use` is the **top-level**
capability that guest contexts interact with. It orchestrates `html-use` and
`style-use` but never exposes their internals directly.

## Architecture

```
         dom-use  ←  top-level API (this package)
        /       \
   html-use   style-use  ←  implementation details
```

`dom-use` depends on both `html-use` and `style-use`. `html-use` does **not**
depend on `dom-use` — instead, `dom-use` passes its `createElement` factory
and schema into `html-use` at runtime. This avoids a circular dependency.

## Why this direction?

`dom-use` owns the schema and the guest element factory. `html-use` is a
lower-level toolkit: it parses HTML strings and serializes trees, but it needs
a caller to tell it what nodes are allowed and how to create them. By having
dom-use call into html-use (rather than the reverse), the dependency graph
stays acyclic and the public API surface remains at dom-use.

## Concepts

- **DomSchema** — a declarative graph describing permitted node types,
  attributes, parent-child relationships, URL rules, content rules, and limits
- **DomUse** — a runtime capability bound to a schema; wraps guest DOM
  operations and enforces boundaries
- **NodeValidator** — validates that a proposed node conforms to the schema
- **TreeValidator** — validates that a tree mutation preserves conformance
- **innerHTML / outerHTML** — delegated to `html-use` with dom-use's schema
  and element factory injected at call time

URL-bearing DOM attributes such as `href`, `src`, `srcset`, and `action` are
denied by default, even when the attribute name is otherwise listed in `attrs`.
Schemas must explicitly add URL allow rules through `urls` before those
attributes can load or point at external resources. The default posture is zero
unintentional exfiltration.

`dom-use` also applies resource and content defaults. By default, a document can
create up to 1000 guest nodes, text nodes can contain up to 10000 characters,
attribute values up to 2048 characters, attribute names up to 128 characters,
and each element can hold up to 32 attributes. Text and attribute content reject
control characters, bidi override/isolate characters, and Unicode noncharacters
unless the schema explicitly opts out. Override these through `limits` and
`content`.

## Example

```javascript
import { DomUse } from "@macchiato-dev/dom-use";

const domUse = new DomUse({
  nodes: {
    div: { attrs: ["class", "id", "data-*"], children: ["p", "span", "div"] },
    p: { attrs: ["class"], children: ["span", "#text"] },
    span: { attrs: ["class"], children: ["#text"] },
  },
  urls: false,
  maxDepth: 10,
  limits: {
    maxTextLength: 500,
    maxAttributeValueLength: 200,
    maxAttributes: 8,
    maxNodes: 100,
  },
  content: {
    allowedPattern: /^[a-z0-9 .,:'-]+$/i,
  },
});

const doc = domUse.createDocument();
const div = doc.createElement("div");
const p = doc.createElement("p");
p.textContent = "hello";
div.appendChild(p); // ok

div.appendChild(doc.createElement("script")); // throws — script not in schema

// innerHTML is implemented by dom-use calling into html-use
// with dom-use's createElement and schema injected:
domUse.setInnerHTML(div, '<p>safe</p><script>evil()</script>');
console.log(domUse.getInnerHTML(div)); // "<p>safe</p>"
```

To allow URL attributes, opt in explicitly:

```javascript
new DomUse({
  nodes: {
    a: { attrs: ["href"], children: ["#text"] },
  },
  urls: {
    href: /^https:\/\/example\.test\//,
  },
});
```

## Layer above: hydration and dynamic loading

`dom-use` now provides the reusable pieces needed to build that layer:

- `@macchiato-dev/dom-use/bridge` — host-side node registry, schema-enforced
  DOM operation dispatch, event target lookup, event payload shaping, and
  bounded localStorage capability plumbing
- `@macchiato-dev/dom-use/guest-runtime` — guest-side minimal DOM wrapper,
  source HTML parser, inline module runner hooks, and event dispatcher

A future package (possibly `page-use` or `app-use`) can sit above these pieces
and handle concerns like:

- Hydrating server-rendered HTML into a live guest DOM
- HTMX-style partial page updates (swapping fragments via `dom-use`)
- Event delegation and lifecycle hooks

`dom-use` stays focused: schema-bound node creation, mutation, event policy,
and tree validation. Higher-level orchestration belongs in the layer above.

## Related

- `@macchiato-dev/html-use` — parser/serializer that dom-use injects its
  factory into
- `@macchiato-dev/style-use` — CSS validation that dom-use delegates to

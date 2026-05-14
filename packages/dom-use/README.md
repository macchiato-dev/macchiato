# @macchiato-dev/dom-use

Structured DOM access according to a schema. `dom-use` defines what node types,
attributes, and tree shapes a guest context is permitted to create and mutate.

It integrates with `style-use` for CSS validation and serves as the structural
foundation for `html-use`.

## Concepts

- **DomSchema** — a declarative graph describing permitted node types,
  attributes, parent-child relationships, and depth limits
- **DomUse** — a runtime capability bound to a schema; wraps guest DOM
  operations and enforces boundaries
- **NodeValidator** — validates that a proposed node (type, attributes,
  children) conforms to the schema
- **TreeValidator** — validates that a proposed tree mutation preserves
  schema conformance

## Example

```javascript
import { DomUse } from "@macchiato-dev/dom-use";

const domUse = new DomUse({
  nodes: {
    div: { attrs: ["class", "id", "data-*"], children: ["p", "span", "div"] },
    p: { attrs: ["class"], children: ["span", "#text"] },
    span: { attrs: ["class"], children: ["#text"] },
  },
  maxDepth: 10,
});

const doc = domUse.createDocument();
const div = doc.createElement("div");
const p = doc.createElement("p");
p.textContent = "hello";
div.appendChild(p); // ok

div.appendChild(doc.createElement("script")); // throws — script not in schema
```

## Related

- `@macchiato-dev/style-use` — CSS validation that `dom-use` delegates to
- `@macchiato-dev/html-use` — parses HTML strings and hydrates them through
  a `dom-use` schema

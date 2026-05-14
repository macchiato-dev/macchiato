# @macchiato-dev/html-use

The backend for sandboxed `innerHTML` and `outerHTML`. `html-use` parses HTML
strings, validates them against a `dom-use` schema, generates clean HTML, and
hydrates guest documents.

It is the bridge between raw string HTML and the structured, schema-bound DOM
that `dom-use` provides.

## Concepts

- **HtmlParser** — parses an HTML string into a guest DOM tree via `dom-use`
- **HtmlSerializer** — serializes a guest DOM tree back to an HTML string
- **HtmlUse** — the runtime interface: `setInnerHTML`, `getOuterHTML`, `hydrate`
- **Sanitizer** — validates parsed trees against the schema and strips or
  rejects invalid nodes/attributes

## Example

```javascript
import { HtmlUse } from "@macchiato-dev/html-use";
import { DomUse } from "@macchiato-dev/dom-use";

const domUse = new DomUse({
  nodes: {
    div: { attrs: ["class"], children: ["p"] },
    p: { attrs: [], children: ["#text"] },
  },
});

const htmlUse = new HtmlUse(domUse);

const el = domUse.createElement("div");
htmlUse.setInnerHTML(el, '<p>hello</p><script>evil()</script>');
// <script> is stripped by the sanitizer — not in schema
console.log(htmlUse.getInnerHTML(el)); // "<p>hello</p>"
```

## Related

- `@macchiato-dev/dom-use` — the schema-bound DOM that `html-use` parses into
  and serializes from
- `@macchiato-dev/style-use` — CSS validation for `style` attributes and
  `<style>` elements during parsing

# @macchiato-dev/html-use

The authoritative implementation is Deno-compatible TypeScript in `source/`;
`src/` contains generated standard ESM and declarations. `HtmlFragment` gives
the parser root a stable data shape. The parser and serializer remain
function-oriented. See the [cluster build notes](../../docs/use-cluster-typescript.md).

HTML parser, serializer, and structural sanitizer. `html-use` is a lower-level
toolkit that `dom-use` consumes—it does not implement the complete `dom-use`
policy by itself.

Instead, `dom-use` passes its schema constraints and element factory into
`html-use` at runtime. This avoids a circular dependency: `dom-use` depends on
`html-use`, not the other way around.

## Concepts

- **parseHTML** — parses an HTML string into a tree of guest nodes using a
  caller-provided `createElement` factory
- **serializeHTML** — serializes a guest node tree back to an HTML string
- **sanitizeHTML** — filters element names using a small structural schema and
  returns a clean HTML string
- **Style validation** — delegates to `style-use` for `style` attributes and
  `<style>` element content

## How dom-use uses html-use

`dom-use` calls `parseHTML` and passes its own `createElement` factory:

```javascript
import { parseHTML, serializeHTML } from "@macchiato-dev/html-use";

const fragment = parseHTML("<p>hello</p>", {
  createElement: (tag) => domUse.createElement(tag),
  schema: domUse.schema,
  styleUse: domUse.styleUse,
});
```

`html-use` never imports `dom-use`. It receives everything it needs through
its options object.

For a security boundary that enforces attributes, URLs, parent/child rules,
content limits, and operation gas, use `DomUse#sanitizeHTML`. The standalone
helper here is intentionally only a structural convenience; passing a
`dom-use`-owned element factory to `parseHTML` applies the full policy while
the tree is constructed.

## Related

- `@macchiato-dev/dom-use` — the top-level package that orchestrates `html-use`
  and `style-use` into a schema-bound DOM capability
- `@macchiato-dev/style-use` — CSS validation that `html-use` delegates to

Parsing is not itself a network grant. `dom-use` owns that schema even though
this package does not depend on it directly. See the [browser
network-capability inventory](../../docs/network-capability-inventory.md);
standalone structural sanitization is not an exfiltration boundary.

# @macchiato-dev/html-use

HTML parser, serializer, and sanitizer. `html-use` is a lower-level toolkit that
`dom-use` consumes — it does not know about `dom-use` schemas directly.

Instead, `dom-use` passes its schema constraints and element factory into
`html-use` at runtime. This avoids a circular dependency: `dom-use` depends on
`html-use`, not the other way around.

## Concepts

- **parseHTML** — parses an HTML string into a tree of guest nodes using a
  caller-provided `createElement` factory
- **serializeHTML** — serializes a guest node tree back to an HTML string
- **sanitizeHTML** — parses, validates against a schema, and returns a clean
  HTML string
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

## Related

- `@macchiato-dev/dom-use` — the top-level package that orchestrates `html-use`
  and `style-use` into a schema-bound DOM capability
- `@macchiato-dev/style-use` — CSS validation that `html-use` delegates to

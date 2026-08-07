# @macchiato-dev/style-use

The authoritative implementation is Deno-compatible TypeScript in `source/`;
`src/` contains generated standard ESM and declarations. `StyleUseState`
precomputes limits and effective property rules once, and function entry points
are available for validation without forcing current method callers to migrate.
See the [cluster build notes](../../docs/use-cluster-typescript.md).

Govern what CSS styles are permitted — both inline (`element.style.*`) and
within stylesheets. `style-use` is the foundation that `dom-use` builds on.

A style schema declares which properties, values, and at-rules a guest context
is allowed to use. `style-use` validates declarations against this schema and
can sanitize or reject invalid rules.

URL-bearing CSS is denied by default. Any `url(...)` value is rejected unless
the schema explicitly provides a `urls` allow rule, and `@import` is rejected
unless imports are explicitly enabled. This prevents accidental imports,
tracking pixels, font/image loads, and other unintentional exfiltration through
CSS.

Styles also have default resource and content limits. Stylesheets are capped at
100000 characters, CSS values at 4096 characters, properties at 128 characters,
URLs at 2048 characters, and imports at 32 once imports are explicitly enabled.
CSS text rejects control characters, bidi override/isolate characters, and
Unicode noncharacters unless the schema explicitly opts out.

## Concepts

- **StyleSchema** — a whitelist of permitted CSS properties and value patterns
- **InlineStyleValidator** — validates `element.style[property] = value` calls
- **StylesheetValidator** — validates full CSS text (rules, selectors, at-rules)
- **StyleUse** — the runtime validator bound to a schema

## Example

```javascript
import { StyleUse } from "@macchiato-dev/style-use";

const styleUse = new StyleUse({
  properties: {
    color: /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|\w+)$/,
    "background-color": true,
    "font-size": /^\d+(px|em|rem|%)$/,
  },
  urls: false,
  limits: {
    maxStylesheetLength: 4000,
    maxValueLength: 160,
    maxImports: 0,
  },
  selectors: /^[a-zA-Z0-9_\-\s\.:>\[\]="]+$/,
});

styleUse.validateInline("color", "#ff0000"); // ok
styleUse.validateInline("color", "url(evIL)"); // throws
```

To allow a narrow URL surface, set `urls` explicitly:

```javascript
new StyleUse({
  properties: { background: true },
  urls: { background: /^https:\/\/assets\.example\// },
});
```

## Related

- `@macchiato-dev/dom-use` — structured DOM access that delegates style
  validation to `style-use`

The [browser network-capability
inventory](../../docs/network-capability-inventory.md) covers CSS image/font
functions, SVG presentation attributes, HTML URLs, script APIs, and response
headers such as `Link` prefetch/preload. A CSS property grant never implicitly
grants one of those effects.

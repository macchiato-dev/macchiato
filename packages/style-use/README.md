# @macchiato-dev/style-use

Govern what CSS styles are permitted — both inline (`element.style.*`) and
within stylesheets. `style-use` is the foundation that `dom-use` builds on.

A style schema declares which properties, values, and at-rules a guest context
is allowed to use. `style-use` validates declarations against this schema and
can sanitize or reject invalid rules.

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
  selectors: /^[a-zA-Z0-9_\-\s\.:>\[\]="]+$/,
});

styleUse.validateInline("color", "#ff0000"); // ok
styleUse.validateInline("color", "url(evIL)"); // throws
```

## Related

- `@macchiato-dev/dom-use` — structured DOM access that delegates style
  validation to `style-use`

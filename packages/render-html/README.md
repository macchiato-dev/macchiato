# @macchiato-dev/render-html

Serialises a [`dom-tiny`](../dom-tiny/README.md) virtual DOM tree to an HTML
string.

## API

```js
import { renderElement, renderDocument } from '@macchiato-dev/render-html';
```

### `renderDocument(document)` → `string`

Renders a `VDocument` to a complete HTML document string, including the
`<!DOCTYPE html>` declaration and `<html>` wrapper.

### `renderElement(element)` → `string`

Renders a single `VElement` to an HTML string. Useful for partial rendering
in tests or server-side fragment generation.

Text content and attribute values are HTML-escaped.

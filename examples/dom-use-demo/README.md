# examples/dom-use-demo

SQLite-backed `dom-use` example for Macchiato.

The files in this directory are imported into SQLite. The browser is served
HTML and CSS from the database, not from these files directly.

Files:

- `page.html` stores the HTML fragment.
- `style.css` stores the stylesheet.
- `dom.schema.json` stores the allowed HTML/DOM schema, including content and
  size limits.
- `css.schema.json` stores the allowed CSS schema, including stylesheet limits.

Both schemas explicitly deny URL loading. This is also the default: no DOM URL
attributes or CSS `url(...)` imports are allowed unless a schema opts in.
They also cap text, attributes, node count, and stylesheet size so stored pages
fail closed instead of growing without bounds.

Import it into the default SQLite database as a sandboxed page:

```bash
node packages/macchiato/src/macchiato.js schema add \
  @macchiato-dev/dom-use@0.0.1/article.json \
  examples/dom-use-demo/dom.schema.json

node packages/macchiato/src/macchiato.js schema add \
  @macchiato-dev/style-use@0.0.1/basic.json \
  examples/dom-use-demo/css.schema.json

node packages/macchiato/src/macchiato.js site add-page \
  dom-use \
  examples/dom-use-demo/page.html \
  examples/dom-use-demo/style.css \
  @macchiato-dev/dom-use@0.0.1/article.json \
  @macchiato-dev/style-use@0.0.1/basic.json \
  --title "Neighborhood Library"

node packages/app/src/index.js
```

Then open `http://dom-use.localhost:8765`.

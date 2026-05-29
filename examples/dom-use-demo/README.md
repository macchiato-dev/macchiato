# examples/dom-use-demo

SQLite-backed `dom-use` example for Macchiato.

The files in this directory are imported into SQLite. The browser is served
HTML and CSS from the database, not from these files directly.

Files:

- `page.html` stores the HTML fragment.
- `style.css` stores the stylesheet.
- `dom.schema.json` stores the allowed HTML/DOM schema.
- `css.schema.json` stores the allowed CSS schema.

Import it into the default SQLite database as a sandboxed page:

```bash
node packages/macchiato/src/macchiato.js site add-page \
  dom-use \
  examples/dom-use-demo/page.html \
  examples/dom-use-demo/style.css \
  examples/dom-use-demo/dom.schema.json \
  examples/dom-use-demo/css.schema.json \
  --title "Neighborhood Library"

node packages/app/src/index.js
```

Then open `http://dom-use.localhost:8765`.

# Built-in Containers

A container is a named, reusable environment made from WebAssembly machines,
`*-use` capabilities, schemas, and budgets. A project invokes a container by
name instead of repeating that configuration. Containers may be composed from
smaller containers whose responsibilities and limits remain independent.

## Article

`article` is a compact document surface for headings, paragraphs, lists, code,
and explicitly allowed links. It is intended for prose whose DOM shape should
remain small and predictable.

## Page

`page` supports a conventional structured page with main, section, header,
footer, image, list, and link elements. URL-bearing attributes still require
explicit URL rules.

## Canvas

`canvas` gives a QuickJS guest a constrained canvas surface. The drawing
program owns the canvas API budget but not the surrounding page.

## SVG

`svg` permits a bounded set of SVG geometry, paint, text, and grouping
elements. Its HTML and SVG element/attribute grants are audited separately.

## Presentation

`presentation` runs a portable presentation in QuickJS and projects its DOM
through `dom-use`. It can use a larger, presentation-specific surface and a
single in-memory archive while retaining node, storage, and execution budgets.

## Single-file HTML/CSS/JS

`single-file-web-app` accepts exactly one raw `index.html` file. It does not
split inline markup, styles, or JavaScript into generated project files. It is
a composition of two containers:

- `single-file-html-runtime` builds the runnable input and executes inline
  JavaScript in the project's QuickJS WebAssembly VM.
- `single-file-web-surface` displays the result through `dom-use` and checks
  inline CSS with `style-use`.

The runtime executes the inline JavaScript text as supplied and the surface
installs the validated inline CSS text without rewriting selectors or
declarations. Viewport sizing, scrolling, and DOM reconciliation belong to the
host display shell and do not alter the project's source.

The default configuration permits no external resources. A project may grant
the QuickJS guest up to ten exact fetch URLs from jsDelivr or unpkg. Each URL is
limited to 100 characters, must use HTTPS, and cannot contain a query string or
fragment. The host preloads only those declared files, applies per-file and
aggregate byte limits, and exposes them through a guest `fetch()` implementation;
the guest never receives the browser's unrestricted fetch function. Binary
responses provide `response.dataUrl()` in addition to the familiar `ok`,
`status`, `headers`, `text()`, and `json()` surface.

The data URL is still subject to the display surface. For example, this
container explicitly grants selected image MIME types on `img.src` and gives
only that tag/attribute pair a larger value limit. Ordinary attributes and CSS
values retain their smaller limits.

Repeated images can use `response.resourceUrl()`. QuickJS receives a short,
opaque reference, while the display runner resolves it to the validated data
URL before setting the browser image. This preserves real `<img>` content and
the same URL policy without repeatedly serializing a large data URL through the
guest DOM bridge.

This fetch grant is currently specific to scripts executing in the project's
QuickJS sandbox. It does not allow external `<script>`, `<link>`, `<img>`, CSS
URL, or font loads. Future CDN script and stylesheet capabilities must remain
separate: scripts would be fetched by the host and executed in QuickJS, while
stylesheets would be sanitized before use.

Seed or replace a project from an unchanged HTML file:

```bash
node packages/website/seed-single-file-project.js \
  --source ./app.html --username benatkin \
  --slug my-app --name "My app" \
  --fetch-url https://cdn.jsdelivr.net/npm/example@1.0.0/data.json
```

Use `--stdin` instead of `--source` to pipe the raw file. The resulting project
snapshot contains exactly one content file, `index.html`.

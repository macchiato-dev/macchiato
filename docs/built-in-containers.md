# Built-in Containers

Projects currently run in one generic WebAssembly container. Templates choose
the initial files and configuration; they are not separate security
containers. The generic container runs project JavaScript in QuickJS and
projects its DOM through the machine's constrained browser surface.

Fragment-only links are always available. External navigation still requires
an explicit Allowed Link URL Pattern.

## Templates

The following names describe starting points within the generic container.
They select example files and sensible initial constraints; changing one does
not select a different runtime.

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

`presentation` starts with a portable presentation application. It uses the
same QuickJS machine and project-file model as every other template while
retaining suitable node, storage, and execution budgets.

## Project files

The initial single-file template accepts a raw `index.html` without splitting
its inline markup, styles, or JavaScript. A project can also contain supporting
files such as images, data, stylesheets, and scripts. Relative guest calls such
as `fetch("./tiles/Flower1.svg")` resolve only against those project files and
do not grant network access.

Every project file appears in the Files picker and is included in project ZIP
exports and imports. This keeps examples such as Mahjong portable and prevents
their assets from silently depending on a CDN.

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

Use `--stdin` instead of `--source` to pipe the raw file. This seed command
creates a project with only `index.html`; supporting files can subsequently be
added through the project file model and remain part of its portable archive.

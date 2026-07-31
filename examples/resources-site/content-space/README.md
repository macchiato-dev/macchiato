# Resources.co catalogue content space

This checked-in tree is the reproducible development fixture for an external
content space. Production may set `RESOURCES_CONTENT_ROOT` to a separate
checkout or mounted directory with the same public-path mirror:

```text
<root>/
  macchiato/
    app/
      en.md
      es.md
    dom-use/
      es.md
```

Each English and Spanish locale file contains exactly one concise Markdown-list
field:

```markdown
# macchiato/app

- **description**: Descripción localizada.
```

The directory path is the public project path. Publication fails if a required
project/locale file is absent or malformed, so an incomplete content checkout
cannot silently produce a partly translated catalogue.

Archived blog posts live in `blog/*.md`. Their compact dialect uses a title,
slug and ISO publication date, followed by a `Body` heading and Markdown
paragraphs. An optional `Example` list entry may name a CodeSandbox embed. The
publisher accepts only its HTTPS embed origin and emits a lazy iframe without
`allow-same-origin`; iframe permissions are fixed by the renderer, not content.

Import the legacy static HTML directory with:

```sh
node scripts/import-resources-blog.js /path/to/resources-co-website/blog \
  examples/resources-site/content-space/blog
```

# Archived VTV blog example

This is a standalone reconstruction of the React visual JSON editor shown in
the 2020–2021 Resources.co posts. It uses the later standalone VTV canary from
the same repository rather than importing the old Next.js application. The
article-era examples are selected with `?preset=hierarchy`, `code`, or `types`.

```sh
npm ci
npm run build
```

The publisher copies `dist/` to `/-/blog-examples/vtv/`. Its iframe gets only
`allow-scripts`; it has an opaque origin, no network permission in CSP, no
forms, popups, downloads, top navigation, or same-origin access. Package
versions and overrides are locked, and `npm audit --omit=dev` is expected to
report zero vulnerabilities.

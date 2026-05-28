# experiments/dom-use-demo

End-to-end `dom-use` demo for Macchiato.

This app imports the workspace `@macchiato-dev/dom-use` and
`@macchiato-dev/style-use` packages in the browser, builds a schema-bound guest
DOM tree, serializes it, and renders it into the real DOM through a tiny host
renderer.

Run it through the Macchiato app server after registering the site:

```bash
node packages/macchiato/src/macchiato.js site add dom-use-demo experiments/dom-use-demo
node packages/app/src/index.js
```

Then open `http://dom-use-demo.localhost:8765`.

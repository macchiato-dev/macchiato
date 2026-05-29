# experiments/dom-use-demo

End-to-end `dom-use` demo for Macchiato.

The served app is static HTML and CSS. It sends no JavaScript to the browser.

The source that demonstrates how the output was produced with `dom-use` and
`style-use` lives outside this served directory:

```text
experiments/dom-use-demo-source/render.mjs
```

That source file marks the host-owned HTML/DOM schema and CSS schema near the
top of the file. The static page in this directory shows the rendered result,
the serialized guest DOM, and the capability checks.

Run it through the Macchiato app server after registering the site:

```bash
node packages/macchiato/src/macchiato.js site add dom-use-demo experiments/dom-use-demo
node packages/app/src/index.js
```

Then open `http://dom-use-demo.localhost:8765`.

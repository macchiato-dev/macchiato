# Exported dom-use tour

This blog example is the portable presentation artifact, not its authoring environment.
It is one self-contained HTML file; notes, reading progress, and navigation history use
`sessionStorage` in the embedded browsing context.

Build the tour first, then copy its export into the Resources.co artifact set:

```sh
cd /root/dom-use-tour && npm run export:offline
cd /root/macchiato/examples/resources-site/blog-examples/dom-use-tour && npm run build
```

Set `DOM_USE_TOUR_EXPORT` when the tour repository lives elsewhere.

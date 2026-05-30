# examples/dom-use-todos

QuickJS-backed todo app running behind `dom-use` validation.

The browser receives rendered HTML plus a small host transport script. The todo
application state, event handlers, and limited DOM wrapper run inside QuickJS.
After each render or event, the host validates the guest HTML with the DOM
schema and validates the stylesheet with the CSS schema before sending output
to the browser.

Files:

- `guest.js` is the sandboxed todo app plus the minimal DOM surface it uses.
- `handler.js` owns the QuickJS session and host validation.
- `dom.schema.json` defines the HTML surface the guest may render.
- `css.schema.json` defines the stylesheet surface.
- `style.css` is host-validated and served with the page.

Run the app server and open:

```text
http://dom-use-todos.localhost:8765
```

This is intentionally a first vertical slice. It keeps event handling inside
QuickJS, but it validates complete rendered fragments rather than forwarding
each individual DOM mutation to a host-owned `dom-use` tree.

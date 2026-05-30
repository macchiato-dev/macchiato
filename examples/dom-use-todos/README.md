# examples/dom-use-todos

QuickJS-backed todo app running behind `dom-use` validation.

The browser receives rendered HTML plus a small host transport script. The todo
source stays in `examples/todo/index.html`; the host passes that HTML string
into QuickJS unchanged. Inside QuickJS, `guest.js` parses the source with a
small homegrown HTML parser, installs a minimal document wrapper, and runs the
inline script content as separate QuickJS modules. Every DOM operation initiated
by that guest-side wrapper goes through a narrow host capability, and the host
capability applies `dom-use` before mutating the host-owned tree.

Files:

- `guest.js` is the guest-side parser, DOM wrapper, and event dispatcher.
- `handler.js` owns the source loading, QuickJS session, schema config, and
  host-side `dom-use` capability.
- `dom.schema.json` defines the HTML surface the guest may render.
- `css.schema.json` defines the stylesheet surface.
- `../todo/index.html` remains the app source that is passed to the guest.

Run the app server and open:

```text
http://dom-use-todos.localhost:8765
```

LocalStorage is a host capability too. It is disabled by default in the
capability implementation; this example enables a pass-through backend for the
single `guest-todos` key with a bounded value length.

# browser-use

`browser-use` is the policy boundary between a JavaScript guest and one granted
browser subtree.

## Guest environment source

The first code evaluated inside the guest is:

`guest/quickjs-dom-environment.js`

It is a plain self-invoking JavaScript file with no imports and no bundler
requirement. It installs the fake `window`, `document`, DOM handles, event
dispatch, timers, and environment configuration expected by browser guests.

`src/quickjs-dom-guest.js` is generated from that file. It only exports the
same bytes as a JavaScript string so a host can pass them to QuickJS. Do not
edit the generated adapter directly.

```bash
npm run build:guest -w @macchiato-dev/browser-use
npm run check:guest -w @macchiato-dev/browser-use
```

The repository test suite compares the source bytes with the exported string
and evaluates the plain source without a bundler. `npm run check:generated` is
the short root-level drift check.

## Boundary

The host compiles a policy for tags, attributes, classes, event subscription
types, size, and depth. Guest DOM handles are opaque. Reads, writes, methods,
and listener registration cross the JSON host function and fail closed when
the operation is outside that policy.

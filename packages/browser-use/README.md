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

Event listeners retain browser identity across the boundary. Duplicate
registrations are ignored, `removeEventListener` releases the matching guest
callback and native listener, capture is preserved, and the envelope reports
both the constrained target and actual registered `currentTarget`.
`preventDefault`, propagation stops, and immediate propagation stops are
applied back to the same native event. A document listener may observe events
from the granted subtree (including a drag that leaves it), but any native
target outside that subtree is represented by the granted root rather than
exposed to the guest.

Native object identity is bidirectional and bounded to one host generation. A
strong `Map` resolves opaque string handles to native objects while a
`WeakMap` reuses a handle when the same native object is encountered again.
Only the granted root and its descendants, host-created detached subtrees, and
explicitly scoped objects such as ranges and selections can receive handles.
Attribute nodes inherit the ownership of their `ownerElement`; traversal to a
parent outside the root resolves to `null`. The known `document` handle exposes
only the narrow document operations modeled by the guest facade and cannot be
used as a mutation target.

Call `destroy()` when the guest or component is discarded. It removes native
listeners, disconnects observation, clears the strong handle map, replaces the
weak registries, and invalidates subsequent dispatch. `stop()` only pauses
observation and listeners and is not a substitute for final teardown.

The host calls this accounted capability a **surface**. `host.surface` reports
the current shape, limits, and remaining capacity, including optional per-tag
ceilings. `maxOperations` adds renewable operation gas;
`renewOperationBudget()` begins a new allocation while retaining the cumulative
audit count. A specialized `*-use` module decides when renewal is justified by
a native event, command, or bounded timer.

Surfaces compose as owned subtrees rather than one application-wide allowance.
See [Composable use surfaces](../../docs/use-surfaces.md).

DOM-shape permission is separate from network permission. Specialized adapters
may avoid the general `dom-use` runtime overhead, but must respect and be
audited against the [browser network-capability
inventory](../../docs/network-capability-inventory.md).

# Guest node-cache lifetimes

The CodeMirror DOM facade preserves wrapper identity by host reference number.
That index must not own the wrappers: a detached node remains usable while guest
code retains it, but an unreachable wrapper must let its native finalizer return
the host-reference lease.

## Reproduction

`packages/project-editor/test/node-cache-lifetime.browser.test.js` uses the real
MicroQuickJS Wasm runtime and observes host-reference leases. Creating and
removing elements leaves the real DOM empty, but initially retains their leases
even after explicit guest collection. The first fixture accidentally treated a
string `"false"` as truthy and performed twice the intended churn. It now decodes
the named-call argument and tests exactly 100 removals per round.

There are two independent causes:

- The JavaScript `WeakRef` fallback stores its target strongly.
- The collector finalizes only the first object in a run of adjacent dead
  blocks. Merging subsequent blocks skips their user-class finalizers.

The replacement should use collector-aware weak storage, preserve live wrapper
identity and guest properties, and survive collection and reference reuse. It
must not advertise a complete ECMAScript WeakRef implementation merely to supply
the facade's private identity cache.

The candidate uses two internal C functions backed by the existing weak-key
collection implementation. A cell has one object key and an undefined value;
dereferencing reads that key, which collection removes when unreachable. The
new cell is explicitly rooted while its backing table is allocated. Unlike a
standard WeakRef, dereferencing does not add an end-of-job retention rule.

Host reference IDs currently increase monotonically, so dead cache cells also
need removal. Each insertion checks at most four cells in a rotating index;
it does not scan the entire cache or host-reference table. This maintenance is
separate from collection of the targets. The regression checks bounded index
growth, retained subtrees, guest properties, reinsertion, cyclic targets, invalid
primitive arguments, and releasing a previously retained subtree.

Correct collection exposed another lifetime dependency: queued DOM calls held
only numeric receiver/argument IDs. An intervening collection could release a
node before the queued operation used it. Queued receivers now retain their
wrapper, and encoded reference arguments carry a guest-only wrapper entry. The
wire writer still sends exactly the same numeric IDs. No extra host permission,
round trip, or wire-format change is involved.

The focused browser regression now passes 20 rounds of 100 removals, followed by
five more rounds while retaining a detached subtree. Every unretained round
returns to the baseline lease count; the retained subtree adds two leases, both
released when its guest reference is dropped. The rotating cache remains at 102
entries rather than growing with all 2,500 temporary nodes.

## Integration checks

The rebuilt `f2e3355` export passes the runtime regression group (32 passes,
with the two known IntersectionObserver parity TODOs still failing), the full
project-editor stress test, all 152 deployment-manifest checks, and compressed
backend execution in Deno. The stress run includes 80 edits, undo/redo, scrolling,
save/reload, output-error recovery, phone views, and large paste/native input.
The light and dark screenshots were inspected. Local evidence is in
`/root/macchiato-work/weak-node-cache-*`.

The isolated 106 KB JavaScript comparison also passes native/MicroQuickJS/
MicroQuickJS/native runs with identical editor sources and per-key text checks.
With the initial parse completed before typing, the two guest runs spend
284–285 ms in view updates over eight keys and 95–96 ms in DOM-tree updates.
Those are inclusive diagnostic timings, not independent costs to add together.
This remains much slower than native and does not resolve the parser/view-update
performance work. No forced full parse was added to production.

## Separate observer discrepancy

`packages/project-editor/test/intersection-observer.browser.test.js` records a
second, independent mismatch: the guest's current IntersectionObserver always
reports visibility, including for an offscreen target. The native Chromium
control checks clipping, thresholds, unobserve, disconnect and re-observe. A
separate native probe records Chromium clearing queued records on disconnect.
The Wasm parity cases remain executing TODO tests until native forwarding is
implemented; passing controls do not imply guest parity.

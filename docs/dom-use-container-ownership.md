# Container-owned DOM and positional mirrors

## Direction

A `dom-use` surface should normally own the complete DOM subtree beneath each
granted container root. The bridge should not require a permanent host ID and
map entry for every descendant merely to prove ownership.

The host retains the real DOM. The guest retains an exact structural mirror of
the owned subtree. Most nodes are addressed by a named root and child indexes:

```text
main / 2 / 0 / 4
```

`main` is a granted container slot. `[2, 0, 4]` identifies a descendant by
position. A component with a bounded portal can have another slot such as
`overlay`. Slots are capabilities, not selectors: the guest cannot invent one
or walk from a root into the surrounding page.

The mirror is an API-free structure, not a second browser DOM. Disposable guest
objects provide whichever subset of `Node`, `Element`, `Document`, or `Range`
a library such as CodeMirror expects. Each wrapper contains a container slot,
path, and mirror revision. It never contains or crosses the boundary to a
browser node.

## Performance model

Indexing a child is a good hot-path primitive. Guest mirror children can be
ordinary arrays, making each segment lookup constant-time. Browser
`childNodes[index]` and `children[index]` are indexed live collections in
practice. Resolving a path is therefore approximately one indexed lookup per
depth level, and `dom-use` already keeps depth bounded.

Batch-local resolution can cache common prefixes, so ten operations under
`main/2/0` traverse that prefix once. A wrapper used repeatedly within one turn
can cache its resolved mirror node while its revision remains current.

The less favorable operations are structural edits in wide arrays and retained
paths after an earlier sibling changes. These are reasons to use child-range
operations, shallow component trees, atomic batches, and short-lived wrappers;
they are not reasons to retain a permanent global node map by default. If a
specific browser capability cannot be represented efficiently by a position,
it may receive an exceptional durable handle without changing the normal model.

## Why it is attractive

The current bridge keeps a host `Map<ID, node>`, a host `WeakMap<node, ID>`, and
long-lived guest wrappers. Container ownership makes most bookkeeping derived:

- containment is structural rather than an ownership-record lookup;
- subtree deletion releases descendants without deleting an ID per node;
- serialization, counts, and schema traversal operate over one owned tree;
- guest wrappers become disposable cursors rather than canonical identities;
- a compact mirror can later use arrays, string tables, typed arrays, or a
  binary arena rather than an object per node;
- a subtree change can cross as one bulk batch rather than many bridge calls.

## Synchronization rule

Host and guest begin with the same snapshot and revision. Every structural or
property update is an atomic batch with a base revision and resulting revision.
Paths in the batch are interpreted against the base revision. Both sides apply
operations in the specified order using the same semantics.

```text
host event
  → derive container slot and path at revision N
  → guest resolves the path in its revision-N mirror
  → guest code creates a mutation batch
  → guest applies the batch to its mirror
  → host validates and applies it to the owned real subtree
  → revisions and optional structural digests agree
```

A bare path is not safe without the mirror and revision. Inserting an earlier
sibling changes later paths. An event therefore carries the revision under
which its target path was observed. If the guest has advanced, the runtime may
translate through a short retained mutation log when unambiguous, or reject and
request fresh state. It must not silently resolve a stale path to another node.

Useful first operations are:

- set/remove a declared property, attribute, text, or style value;
- splice a text value;
- insert a validated subtree at a child position;
- remove or move a child range; and
- replace a validated subtree.

Schema validation and gas accounting apply to the whole batch before observable
host changes commit. Large insertions can be validated into a detached fragment
and committed afterward rather than mutating and rolling back browser nodes.

## Wrapper lifecycle

A DOM-compatible wrapper is a view over `(slot, path, revision)`, not the mirror
node itself. When a structural batch changes positions, the guest runtime can:

1. update paths for wrappers known to remain live;
2. lazily translate a path through a short structural mutation log; or
3. mark older wrappers stale and recreate them on demand.

The third is the simple default. A CodeMirror adapter may use the second for
observed retention patterns. Guest build tooling can rewrite common DOM access
into direct mirror operations and avoid wrapper allocation. Proxies are
optional; pseudo-proxy classes with stable shapes may be cheaper in QuickJS.

Listeners should usually belong to paths or delegated component boundaries,
not permanent host IDs. One host listener per event type at a container root can
derive a target path from the native composed path, sanitize the payload, and
deliver it to the guest. Direct native listeners remain possible only where
browser semantics require them.

## Detached construction

`document.createElement()` produces a node before it has a child path. The guest
mirror therefore needs a bounded detached arena owned by the same surface.
Detached nodes receive arena positions or short-lived allocation handles. An
insert batch moves a detached subtree into a container path. Dropping its last
guest reference or cancelling the batch releases the allocation.

Detached trees remain subject to node, text, depth, schema, and gas budgets, so
they cannot evade limits by remaining unattached. Their ownership never grants
insertion outside configured container slots.

## Explicit exclusions later

Complete descendant ownership should be the default. A future configuration
may declare excluded subtrees: host-owned islands within a guest-owned
container, such as a credential control or separately sandboxed child.

Exclusions must be positive host configuration and appear as opaque boundary
nodes in the guest mirror. The guest cannot inspect their descendants, replace
them, attach listeners inside them, or move them without a separate grant. This
should be designed only after whole-container ownership is stable; introducing
it now would risk recreating per-node ownership complexity as the default.

## Resynchronization and auditing

Development builds should periodically compare deterministic structural
digests and report the first difference. Production can compare less often or
at security-sensitive transitions. A mismatch freezes the surface, preserves
logical user input/history where possible, and rebuilds from a validated
snapshot. It never guesses which side is correct.

Audit records should include slot, base/result revisions, operation count,
affected paths, budget delta, gas cost, and snapshot or stale-path translation.
Sensitive content values can be redacted or hashed.

## Migration plan

1. Extract an API-free mirror and deterministic batch applier, informed by
   `virtual-dom-use` but governed by `dom-use` schemas.
2. Add an opt-in container-owned mode for one small demo while retaining the
   current ID bridge.
3. Delegate events at the root and address targets by revisioned paths.
4. Add bulk text/property changes and child-range edits; benchmark them against
   the ID bridge.
5. Adapt the partial guest DOM classes into disposable positional wrappers.
6. Move CodeMirror incrementally, recording wrapper retention, layout reads,
   selection behavior, and stale-path cases.
7. Add named portal/multiple-root slots with independent schemas and budgets.
8. Make ownership the default after mutation, ordering, fuzz, browser, and
   equivalence tests pass. Retain exceptional handles only where justified.
9. Design opaque exclusions separately when a concrete use case requires them.

Measure host and guest memory, live wrappers, operations and bytes per
keystroke, path depth, validation and native commit time, event latency, and
recovery cost. The goal is a simpler ownership proof and a smaller predictable
hot path—not merely deleting two maps.

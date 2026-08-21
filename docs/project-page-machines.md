# Project page machine model

The Resources project workspace composes three independently bounded execution
roles. They are separate WebAssembly machine instances today, each containing a
QuickJS runtime. The roles are architectural identities rather than a promise
that QuickJS is the only guest runtime they may ever contain.

## The three roles

### Site frontend

The site frontend machine owns bounded Resources.co interface behavior such as
user-menu state. It receives only the host functions required by those
components. It does not receive the editor surface or the project surface.

This machine follows the surrounding site page. Replacing an editor or project
machine must not reset the site menu or other app-wide state.

### Project editor

The editor machine owns the `project-editor` guest, its DOM surface, and
the in-browser draft/version model. The host gives it one editor mount and a
narrow JSON bridge. It does not receive the project preview DOM.

The machine is scoped to a live project workspace. With the current single
workspace UI, opening another project navigates away, disposes the old editor,
and creates a new one. A container identity change also replaces the editor
machine because the available files, configuration, limits, or editor adapters
may describe a different environment. Editing container options that do not
change its identity does not rotate the machine.

Future project tabs should generalize this to one editor machine per retained
workspace, not force the product back to one global editor. Background tabs may
remain warm under explicit machine and memory limits, or serialize their state,
dispose their machines, and restore them when selected. A hybrid can retain a
small working set of live machines while keeping serialized checkpoints for the
rest. The choice is per component and workload: a live machine preserves
ephemeral browser and editor identity; serialized state makes disposal,
migration, recovery, and multi-machine scheduling cheaper. The tab model,
serialization boundary, and eviction UX remain to be designed.

### Project

The project machine runs the project's script inside its selected container.
It receives the container's `*-use` capabilities and owns only the project
surface delegated by the host. It does not receive the editor DOM, site DOM, or
version store.

The project machine is the most disposable role. An ordinary source edit may
replace it after the output debounce. A container change disposes it
immediately. The browser may retain one static iframe and alternate its hidden
DOM roots without retaining the old project machine. A future container may
instead support a reviewed hot-update protocol, but retaining a guest is never
implicit merely because the browser mount is unchanged.

The intended runtime API separates the expensive engine from its disposable
execution contexts. A reusable runtime owns the compiled Wasm module, QuickJS
runtime, memory ceiling, and shared immutable resources. It can create two
isolated contexts with distinct DOM roots and reference tables: the visible
context continues running while the next context mounts into the hidden root;
after a successful swap, the old context is destroyed. Context failure leaves
the visible generation intact. This must remain an explicit runtime/context
API—passing a runtime object or a class that owns it—not an inference based on
two machines receiving the same iframe.

## DOM authority

The browser host retains the real document. Each role receives a distinct root
and policy:

```text
Resources page host
├── site component roots  → site frontend machine
├── editor mount          → project editor machine
└── project mount         → project machine
```

The editor may provide a DOM element to the project container, but it does not
delegate its own editor authority. The host creates a new capability for the
project root. Messages between roles cross explicit JSON or event protocols;
one guest cannot obtain another guest's node handles.

Project status follows the same boundary. The project machine reports a typed
event such as `blocked`, `mounted`, or `storage` through its container
transport. The host passes that event into the editor machine, which owns the
current preview generation, the ordered status log, and the active blocking
error. Only then does the host render the editor's status rail. A late event
from a disposed project generation is rejected instead of overwriting the
current project's state. This keeps error interpretation with the workspace
that can explain and preserve the user's input; it does not give either guest
the other guest's DOM or JavaScript objects.

The browser host is still the enforcement point and may originate a blocked
event when a guest instruction never reaches the project surface. Development
containers can attach more guest diagnostics, but production correctness does
not depend on cooperation from untrusted code.

DOM quotas, event budgets, gas, memory, and network rules are accounted per
role. A project exhausting its operation budget must not stop the editor, and
an editor surface violation must not silently grant the project more DOM.

## Lifetime and recovery

Machine identity is inspectable in development through a generated machine ID,
the underlying WebAssembly module ID, and its role. IDs are diagnostic evidence,
not authorization tokens.

The current lifecycle is:

1. The page starts the site frontend machine.
2. A project workspace starts its dedicated editor machine.
3. Rendering the project starts a separate dedicated project machine, including
   for a static project so its capability boundary remains observable.
4. Editing may dispose and recreate only the project machine.
5. Changing container identity disposes both project and editor machines and
   restores the editor from the host-held current snapshot.
6. Leaving the single-workspace page disposes both workspace machines.

The host and persistence layer remain responsible for recoverable input. A VM
can be garbage-collected after its references are dropped without becoming the
only copy of a draft, version, or authored file. The editor VM constructs local
snapshot diffs and checkpoints, while the host stores returned history and the
server validates durable versions again.

Serialization does not have to reproduce every implementation detail of a
machine. A project editor checkpoint can contain authored files, configuration,
versions, open tabs, selections, and other deliberately recoverable state while
omitting disposable DOM references, timers, caches, and runtime internals. When
those internals are important to continuity, retaining the live machine is the
better policy. Components may also expose a versioned serialization protocol so
the state can be restored by a newer runtime rather than depending on a raw VM
memory image.

When project code is eventually allowed to update specific files, the editor
machine should expose a rate-limited file-change capability. The project machine
will propose changes through that capability; it will not receive direct access
to editor internals or durable storage. Checkpoint coalescing and version limits
belong to the editor and persistence policies so a runaway project cannot create
unbounded history.

## Verification

Browser coverage checks that the site, editor, and project machine IDs are all
different, that a container transition replaces the editor and project IDs,
and that the site machine remains stable. Sandbox unit tests separately verify
that dedicated machines use different WebAssembly modules, while shared-mode
QuickJS runtimes still have distinct diagnostic machine IDs.

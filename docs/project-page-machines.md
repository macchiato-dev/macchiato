# Project page machine model

The Resources project workspace composes three independently bounded execution
roles. A page does not satisfy this model merely by allocating three machine
IDs: each role must own the application state and behavior named below, and the
browser integration must remain a small, auditable host controller.

The intended runtime split is MicroQuickJS for the Resources frontend,
full QuickJS for the CodeMirror editor while its compatibility surface is still
being refined, and a disposable runtime selected by the project container. A
benchmark may justify changing a runtime, but it must not collapse the three
authority and lifetime boundaries.

Three is the ordinary steady-state topology, not a machine limit. A build/watch
session commonly adds a fourth machine, and tools may create other short-lived
machines for compilation, indexing, conversion, or inspection. The controller
owns those lifetimes and must not let a completed tool machine retain DOM or
project references.

## The three roles

### Site frontend

The site frontend machine owns the Resources.co workspace controller as well as
bounded site behavior such as theme, language, command-palette, and user-menu
state. In particular, draft state, open files, pane selection, preview
debouncing, save/version orchestration, and project navigation do not run as a
large browser-realm controller. The frontend receives narrow editor and output
services; it does not receive either machine's internal DOM references.

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

## Host controller budget

The browser integration has two named layers. **Macchiato Machine Host** is the
general mechanism that instantiates one Wasm machine, grants its concrete host
capabilities, and carries `msg`/`onmsg`. **Macchiato Machine Controller** is the
application-specific composition that creates several hosted machines, assigns
roles and roots, and controls their lifetimes.

These architectural names deliberately omit “Wasm.” `WasmWebMachine` is the
current in-browser host implementation, not the definition of a machine. A
controller may instead place a role in a JavaScript isolate, an eBPF-mediated
process, an OCI container, a MicroVM, or an in-thread RISC virtual machine. It
may also drop a containment layer in an audited production composition. The
message protocol and explicit capabilities should survive that choice, making
the security/performance trade visible rather than baking WebAssembly into the
application model.

“Host” names an implementation role, not a guest-visible object. A machine
still exposes only `msg` and `onmsg`. Its reader/writer codec carries calls to
explicit devices such as DOM, storage, clock, navigation, and fetch. The
Machine Controller grants and routes those devices. No `host` global is needed,
and the same device protocol may terminate in a browser document, isolate,
remote renderer, or deterministic test implementation.

The Resources Machine Controller is not an application. Its authored source is
capped at 500 lines and is expected to do only the following:

- compile or reuse the three WebAssembly modules;
- create and dispose the three machines and their explicitly granted roots;
- relay bounded `msg`/`onmsg` service messages without interpreting workspace
  policy;
- service bounded same-origin fetch requests received through `msg`/`onmsg`;
- stage the output iframe and swap successful output generations; and
- report machine failures to the frontend machine when a guest cannot report
  them itself.

DOM construction, tabs, drafts, version labels, menus, theme behavior, parsing
project configuration, and deciding when output is stale belong to guest code.
Generated runtime code and `WasmWebMachine` itself are audited separately from
the 500-line site integration budget.

The Machine Controller is also the only frontend layer allowed to create a
QuickJS child machine. Fetch and child creation therefore use the same typed
message protocol and capability check. A guest fetch request supplies a
relative or same-origin URL, an allowlisted HTTP method, bounded headers, and a
bounded body. The Machine Controller rejects credentials or redirect behavior that
the application did not explicitly receive, performs the request, and returns
status, selected headers, and bytes through `onmsg`. Neither the frontend nor a
child receives an ambient browser `fetch` object.

A container remains a userspace composition of machines, runtimes, controllers,
policies, and resources. A Machine Controller is analogous to an OCI entry point: an
image could use `ENTRYPOINT ["controller.sh"]` to assemble the same roles and
lifetimes. It is not an additional mandatory WebAssembly layer.

## Compiled application loading

The frontend uses MicroQuickJS bytecode rather than shipping its modern source
to the browser interpreter. The resident guest environment and the Resources
application are separate artifacts. This permits the small environment to
start first and the versioned application bytecode to load dynamically.

Build tooling lowers the authored module graph through Babel and compiles the
result with a WebAssembly-hosted MicroQuickJS compiler. A WebAssembly-hosted
Babel loader is a further build/runtime tool, not ambient authority in the
frontend machine: it accepts bytes through an explicit service, emits compiled
bytes, and receives no DOM or network capability. Bytecode is runtime-versioned
and trusted like executable code; it is not accepted from an untrusted project.

The same runtime and device model is intended to host Pi agent contexts and
Vite build/watch contexts using a bottom-up Node-compatible facade. Their
requirements, proxy boundary, and native-versus-machine artifact hash checks
are specified in [JavaScript tooling in Macchiato
machines](javascript-tooling-machines.md).

Reproducible build recipes use Dockerfiles restricted to the Docker/Podman
common subset. They install the explicit Rust, C, Node, Babel, and
MicroQuickJS toolchain and invoke the same checked-in build entry points used
by local development. Developers may run those entry points directly when
already inside a rootless container, as in the current development setup; a
temporary orchestration script may remain uncommitted. The container recipe is
a reproducibility boundary, not a second hidden build system or a nested
container requirement.

## Package distribution

The machine ecosystem publishes native Rust responsibilities to Cargo as well
as JavaScript responsibilities to npm. Candidate crates include the compact
message codec, WIT-like reader/writer, artifact manifest and stamping tools,
runtime builders, and reusable controller/device primitives that have a real
Rust API. Browser controller integration, JavaScript guest facades, and typed
web APIs remain natural npm packages.

One registry is not a dumping ground for opaque output from the other. A crate
must be useful to a Rust or Wasm consumer without requiring npm at runtime; an
npm package must not require Cargo merely to use a prebuilt browser artifact.
Source builds may compose both toolchains explicitly.

Every published package records the source revision, toolchain versions,
feature set, runtime ABI version, and SHA-256 of its reproducible artifacts.
When Cargo and npm packages expose two sides of one protocol, compatibility is
declared by the ABI version and verified against shared protocol vectors rather
than inferred from coincident package version numbers.

## Build, export, and isolated runner

The project editor exposes an explicit **Build / Export** action. A clean build
may produce either a stamped Wasm module or a packed `.bin` containing the
machine and resources behind the compact WIT-like name/type/length table. The
artifact is portable and must not depend on the live editor VM.

Build may be presented as an editor action without putting the compiler inside
the long-lived editor machine. The normal path creates a short-lived build
machine, gives it an immutable project snapshot and selected runtime, receives
the artifact, and disposes it. Watch mode may retain that fourth machine until
the user stops watching or closes the project.

Browsers can support many small WebAssembly machines, so the separate,
short-lived build machine is the default. The editor machine may still host the
same bounded compiler interface as an explicit optimization or integration
mode. Both paths compile an immutable snapshot and release compiler resources
afterward; measured startup, memory, and input latency can choose between them
without weakening the default ownership boundary.

The controller budgets memory first and machine count second. A rough
per-process ceiling around one hundred Wasm instances may remain relevant in
some common mobile browsers, but a much smaller number of badly bounded
machines can exhaust a device first. It must not create a machine per trivial
operation or retain completed tools indefinitely. The normal three-to-four
live machines are comfortably below the count ceiling; future project tabs
need an eviction/serialization policy before approaching it.

One JavaScript context per medium-sized, independently disposable component is
a supported design pattern rather than an antipattern. A context does not
imply a separate WebAssembly machine: one QuickJS engine can host several
contexts while sharing engine code, immutable bytecode, linear-memory
capacity, and bridge infrastructure. An editor tab is a natural context
boundary: its document, syntax state, extensions, selections, undo history,
timers, and failures can live and die together without sharing JavaScript
globals with neighboring tabs. The same reasoning can apply to a terminal,
rich-text document, canvas tool, or other substantial component.

One machine per tab remains available when stronger memory, runtime, or failure
isolation is worth its cost, and even that topology can fit beneath the rough
hundred-machine compatibility ceiling. A shared machine with one context per
tab is the likely memory-efficient many-tab topology because the engine and
common runtime are amortized. Measurements must compare both; the controller
must not silently treat a shared machine as though its contexts had independent
linear-memory or crash boundaries.

Neither topology justifies a context per button, event, request, or tiny view.
The useful test is whether the component has meaningful state, authority,
failure isolation, and a lifecycle that can be measured and reclaimed as a
unit.

Inactive contexts need not all remain resident. The controller may keep a
small recently used set warm, serialize application state for colder tabs, and
recreate their contexts when selected. Closing a tab must dispose its context
unless another visible owner intentionally retains it. This makes per-tab
contexts compatible with mobile memory budgets while preserving the option to
keep several tabs immediately responsive on devices that have room.

### Mobile memory measurements

Mobile limits must be established by measurement rather than inferred from
desktop tab memory or the number of Wasm instances. Record at least:

- baseline browser tab memory before the project is opened;
- incremental memory for the frontend, editor, output, and temporary build
  machines, including each machine's current and maximum linear memory;
- host DOM nodes, retained references, project bytes, editor document bytes,
  syntax trees, decorations, history, and output resources;
- peak and settled memory while opening, typing, searching, folding, changing
  language modes, building, replacing output, switching projects, and closing
  the editor; and
- reclamation after project changes and machine disposal, including repeated
  open/close cycles that expose leaks hidden by one clean run.

Run the matrix on representative low-, middle-, and high-memory phones in
Safari and Chromium-family browsers. Test 100-, 1,000-, and 5,000-line files,
plus large lines and several language modes. Capture input latency, long tasks,
memory warnings or process termination, and whether returning from the
background preserves the project. Measurements should distinguish steady
state from short build/export peaks and should be repeatable from a fresh tab.

Adaptation belongs to the controller and editor policy, not to the generic
Machine Host. Keep ordinary CodeMirror behavior while it remains responsive.
Under measured pressure or above tested document-complexity thresholds, the
editor may reduce expensive decorations, parse only a relevant region, switch
to a cheaper or adaptive highlighter, or finally disable syntax highlighting.
File size alone is not sufficient: line length, syntax-tree complexity,
decorations, open histories, and active language services can dominate it.
The interface should disclose an adaptation and restore richer behavior when
pressure falls; it must never silently discard text or history to save memory.

A separate runner page accepts an artifact through file selection or drag and
drop. It creates a fresh Machine Host with no network or navigation device. It
does not inherit the Resources frontend's same-origin fetch grant and it is not
the editor preview. Its default authority is limited to the dropped bytes, a
bounded DOM surface, clock/input where requested by the artifact, and explicit
local storage only if the runner configuration grants it. Browser tests must
attempt both fetch and navigation and prove that neither reaches the network or
changes the runner location.

The runner distribution is intentionally smaller than the module graph used
to author it: one readable, medium-sized JavaScript file starts one `.bin` or
`.wasm` artifact. A release build may inline the same controller, bridge, and
device implementations that are published as individual npm modules. It must
not introduce a second implementation or silently patch vendored code; a
manifest records the included package versions, source revisions, and hashes.
This keeps deployment and auditing simple without giving up reusable modules.

CSS and SVG rendering are capabilities supplied to the DOM display device,
not necessarily implementations embedded in that device. Focused renderer
packages own their parsers, semantic forms, and deterministic serialization;
the display device owns the target root, installation, and reference policy.
A distinct server-side display machine can use the same packages for
pre-rendering, while the browser display device validates and installs the
same representation before guest hydration. Project application code never
becomes the trusted CSS or SVG renderer merely because it runs on the server.
The audit-oriented runner vendors the exact renderer package sources into its
single readable JavaScript file rather than loading extra modules at runtime.

These packages are likely to graduate together into a machines monorepo. That
repository can version the protocol, machine host, compact reader/writer,
bridges, DOM display device, CSS and SVG renderers, runtime adapters, and build
tools beside shared conformance fixtures. Each useful boundary remains an
independently publishable npm or Cargo package. Consumers do not need the whole
workspace, while integration builds can prove that the published sources
produce the same single-file runner and stamped artifacts.

The public Pages deployment has two deliberately different release surfaces:

- `machines` is the complete monorepo, documentation, conformance fixtures,
  and demos, published at `https://macchiato-dev.github.io/machines/`.
- `machine-runner` is a separate, much smaller repository and Pages artifact,
  also mountable at `/machines/machine-runner/`. It contains no demos or
  authoring workspace: only minimal HTML, a tiny inline controller bootstrap,
  the readable machine JavaScript file, and the selected `.bin` or `.wasm`.

All runner URLs and imports are relative so the same files work at a repository
Pages root or at the nested path. The HTML supplies charset, viewport, title,
an empty mount point, and a concise inline module that imports the machine file
and starts the artifact. Capability policy remains explicit in that controller;
moving the runner to a smaller repository must not add ambient authority.

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

Browser coverage checks behavior and ownership, not IDs alone:

- the page loads no browser-realm theme, menu, command-palette, or content-form
  application scripts outside the bounded host controller;
- the frontend, editor, and project IDs are distinct and each machine performs
  a substantive operation observable through its own protocol;
- a container transition replaces the editor and project IDs while the
  frontend machine and its menu state remain stable;
- destroying project output does not destroy draft, tab, or editor history;
- delayed events from an old output generation cannot affect the current one;
- the authored browser host controller remains below 500 lines; and
- long Playwright sessions cover typing, selection, scrolling, search, folding,
  undo/redo, versions, themes, responsive pane changes, output debounce,
  failures, save/reload, and repeated machine replacement.

### Standalone compiler parity

The temporary playground keeps its page integration behind a controller and a
small set of related devices. A session device owns namespaced ephemeral state,
an editor device owns the editor machine, a compiler device selects a local or
supervised-server build, and an output device owns the disposable output
machine. The document module may construct the controller, but it must not
contain a second body of application behavior beside those objects.

The single-file compiler is shared source, not two implementations expected to
converge. Its browser build and its Deno build inertly parse the same HTML,
apply the same source envelope, reject network-capable markup and CSS, and emit
the same tree and guest program. Automated parity tests compare their complete
serialized output. The Machine Host remains the final enforcement boundary;
successful compilation never grants a host DOM node, stylesheet, navigation,
or fetch capability.

Container-mode stylesheets are scoped to a unique machine-owned root class.
Selectors that name `html`, `body`, or `:root` map to that root instead of the
host document. Document-mode machines remain explicitly page-wide. Browser
tests place a matching host element beside output and prove that guest styles
cannot affect it.

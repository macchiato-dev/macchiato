# Project page machine model

The Resources project workspace composes three independently bounded execution
roles. A page does not satisfy this model merely by allocating three machine
IDs: each role must own the application state and behavior named below, and the
browser integration must remain a small, auditable host controller.

The current runtime split is MicroQuickJS for the Resources frontend and
CodeMirror workspace, with full QuickJS for project output. A
benchmark may justify changing a runtime, but it must not collapse the three
authority and lifetime boundaries.

Three is the ordinary steady-state topology, not a machine limit. A build/watch
session commonly adds a fourth machine, and tools may create other short-lived
machines for compilation, indexing, conversion, or inspection. The controller
owns those lifetimes and must not let a completed tool machine retain DOM or
project references.

## The three roles

### Site frontend

The site frontend machine owns bounded site behavior such as theme, language,
command-palette, user-menu state, and project navigation. Draft state, open
files, pane selection, output debouncing, and save/version orchestration belong
to the editor machine below, not to a large browser-realm controller. The
frontend receives narrow editor services; it does not receive either child
machine's internal DOM references.

This machine follows the surrounding site page. Replacing an editor or project
machine must not reset the site menu or other app-wide state.

### Project editor

The editor machine owns the complete project workspace: its layout and details
form, files and tabs, the `project-editor` guest, drafts and version history,
save/build/export orchestration, and output lifecycle. The host gives it the
server-rendered project workspace root and a narrow device bridge. It does not
receive the surrounding Resources navigation or account DOM.

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

The project machine runs the project's script through WasmWebMachine.
It receives configured device capabilities and owns only the project
surface delegated by the host. It does not receive the editor DOM, site DOM, or
version store.

The project machine is the most disposable role. An ordinary source edit may
replace it after the output debounce. A container change disposes it
immediately. The browser may retain one static iframe and alternate its hidden
DOM roots without retaining the old project machine. A future container may
instead support a reviewed hot-update protocol, but retaining a guest is never
implicit merely because the browser mount is unchanged.

The intended runtime API separates the expensive engine from its disposable
execution contexts. A reusable engine owns the compiled Wasm module, memory,
allocator, and shared immutable resources. It can create two
isolated contexts with distinct DOM roots and reference tables: the visible
context continues running while the next context mounts into the hidden root;
after a successful swap, the old context is destroyed. Context failure leaves
the visible generation intact. This must remain an explicit runtime/context
API—passing a runtime object or a class that owns it—not an inference based on
two machines receiving the same iframe.

Output `load()` now uses `ProjectOutput` in both the direct and iframe paths.
Each load gets a fresh QuickJS session and machine-scoped root; the previous
session remains visible until the new scripts/modules finish initialization.
A failed or superseded preparation is disposed without replacing that visible
root. Successful replacement removes old styles, callbacks, modules, globals,
and pending jobs. Fetch responses belong to their originating session and are
ignored after its disposal. The controller retains the same iframe and actual
WebAssembly instance across loads.

The QuickJS session adapter in `dev/wasm-web-runtimes/quickjs/` creates
independently disposable JS sessions in one WebAssembly instance. Its tests
cover nested failures, reference cleanup, and bounded repeated replacement.
They also leave modules suspended in top-level `await` before disposal, check
that a finalizer-reporting error cannot skip sibling sessions, and reject
reattachment after engine disposal. Storage and route services can return
unsubscribe functions, which the bridge now calls when a machine is destroyed;
the shared service itself can survive for the replacement machine.
The module integration tests exercise both output paths, including repeated
classic-script declarations, failed and superseded loads, persistent storage,
late fetch replies, dialogs, and asynchronous errors. Preparation is not a
transaction over external services: permitted storage writes or navigation
performed by startup code are not rolled back if that code subsequently fails.

The September 2026 browser verification found intermittent
`event callback ... is unavailable` failures during repeated editor input.
The editor build regenerated its JavaScript environment but stamped an older
demo bytecode file, retaining old callback semantics. It now compiles that
environment explicitly before stamping. The artifact test compares the actual
embedded runtime with freshly compiled source and failed on the stale build;
the edit/save/error/recovery test passed after rebuilding. Browser tests that
compile their own runtime cannot establish that the shipped artifact is fresh.
Do not hide callback errors by ignoring missing indices.

Caret testing must also cover held keys, not just isolated key presses.
CodeMirror restarts its blink animation through inline `animationName` and
`animationDuration` access. Those operations must reach the real CSSOM, with
the machine's scoped keyframe names hidden on reads and preserved on writes.
`packages/project-editor/test/caret.browser.test.js` compares repeated-arrow
movement with the same native editor and checks that idle blinking still works.

The language-loading regression also uses the shipped editor runtime rather
than a demo bytecode file. This exposed an element `remove()` implementation
that removed the host node but bypassed the guest mirror update. CodeMirror's
temporary measurement line could consequently be read back as document text
during input. Element and text-node removal now share the cache-aware method;
a focused regression checks removal and reinsertion without relying on a
MutationObserver to repair the cache.

## DOM authority

The browser host retains the real document. Each role receives a distinct root
and policy:

```text
Resources page host
├── site component roots  → site frontend machine
├── editor mount          → project editor machine
└── project mount         → project machine
```

The editor identifies an output element within its workspace, but it does not
delegate the rest of its workspace authority. The host creates a new capability
for that output root. Messages between roles cross explicit JSON or event
protocols; one guest cannot obtain another guest's node handles.

Creation follows the same hierarchy as authority. The outer Resources machine
asks the Machine Controller for an editor child and hands that child the editor
mount capability—not the page document. The editor machine may then ask for an
output child for its current generation; the controller hands that child only
the output mount capability. The controller performs the WebAssembly
instantiation, but the parent guest owns the lifecycle decision and receives
the resulting opaque child handle. A hidden fourth “project app” machine that
merely duplicates either parent is not part of this model.

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

Asynchronous browser callbacks report through the machine's optional `onError`
hook. An iframe relays a string error on its existing private message port;
the editor routes it to the output status rail without stopping CodeMirror.
The original exception remains visible in DevTools. No error object or DOM
reference crosses from the output into the editor.

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

The current build tooling lowers the authored module graph through Babel and
compiles the result with a WebAssembly-hosted MicroQuickJS compiler. That ES5
path is transitional. The planned authoring target is a documented ES6 subset
implemented by a hybrid of MicroQuickJS, full QuickJS, and explicit calls to
safe host operations. The hybrid should delegate rather than duplicate stable
functions, while leaving authority at the same typed machine boundary.

A WebAssembly-hosted Babel loader remains a possible build/runtime tool, not
ambient authority in the frontend machine: it accepts bytes through an
explicit service, emits compiled bytes, and receives no DOM or network
capability. Cached bytecode is runtime-versioned, reproducible, and disposable,
closer to a `.pyc` cache than source authority. Builds record the source,
compiler/runtime identity, and hashes needed to inspect or recreate it;
untrusted projects cannot supply privileged cache artifacts.

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
`.wasm` artifact. A release build literally concatenates the selected
controller, bridge, and device sources in a declared order. It does not use a
module bundler to discover, rewrite, tree-shake, or wrap their relationships.
Those same sources may also be published as individual npm modules. The build must
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
The audit-oriented runner concatenates the exact renderer package sources into
its single readable JavaScript file rather than loading extra modules at
runtime. A surface that does not need CSS or SVG omits those source segments.
The small, hand-written integration at the end constructs the bridge and
devices explicitly.

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
  published at `https://macchiato-dev.github.io/machine-runner/`. It contains no demos or
  authoring workspace: only minimal HTML, a tiny inline module bootstrap,
  the readable machine JavaScript file, and the selected `.bin` or `.wasm`.

The second repository is intentional: GitHub Pages assigns each project its
own stable top-level path, so the small runner can have an independent release
and cache lifecycle without inheriting the machines monorepo's demo payload.

All runner URLs and imports are relative so the same files work at the
repository Pages path or another static mount. The HTML supplies charset, viewport, title,
an empty mount point, and a concise inline module that imports one entry point
and starts it. The repository publishes two readable JavaScript distributions:
Each surface may have its own `machine.js`, containing only its selected,
literally concatenated machine, bridge, and device sources plus a hand-written
integration. `machine-runner.js` concatenates the standard
runner controller, capability policy, and vendored renderers. The runner page
loads only `machine-runner.js` and its artifact rather than fetching both files;
source is shared by the build, not duplicated as competing implementations.
moving the runner to a smaller repository must not add ambient authority.

The release JavaScript is compiled from TypeScript into paired artifacts:
`machine.js` and `machine-runner.js` are readable, while `machine.min.js` and
`machine-runner.min.js` are their esbuild-minified equivalents. Each file has
an external source map with embedded `sourcesContent`, an esbuild metafile, and
a content hash. Conformance tests run against readable and minified builds and
require equivalent behavior. The tiny Pages bootstrap loads the minified
runner by default, while the readable build remains directly available for
auditing and debugging. The source packages and machines monorepo retain the
TypeScript. The release build does not inject remote dependencies or eval-based
loaders.

Stamped `.bin` artifacts support whole-file gzip. HTTP servers may expose the
same bytes transparently with `Content-Encoding: gzip`; files intended for
download, drag-and-drop, or static hosting use the explicit `.bin.gz` suffix.
The reader checks gzip magic bytes before reading the WIT-style resource index.
Browser, Deno, and Node builds all use their built-in `CompressionStream` and
`DecompressionStream`, so this adds no compression dependency and does not
invent per-resource archive semantics.

Esbuild performs the TypeScript stripping and JavaScript generation directly.
`tsc --noEmit` is a separate required type-check gate; it does not produce an
intermediate distribution that could drift from the esbuild output.

Combined distributions vendor their selected package sources into one
dependency-free TypeScript file per entry point: `machine.ts` and
`machine-runner.ts`, not a directory of compiled JavaScript. Deterministic
source-boundary comments and a manifest map each generated line range to its
package file, revision, and hash. `tsc --noEmit` checks each combined file and
esbuild generates its readable and minified JavaScript outputs from that exact
single-file input.

The JavaScript source maps resolve to that combined TypeScript file. Mapping
from its documented ranges back to canonical package sources belongs to the
provenance manifest rather than a second browser source-map stage.

At that stage the vendored source graph is runtime-dependency-free. Its build
toolchain is only the pinned TypeScript checker and esbuild; the emitted runner
does not resolve npm packages or CDN modules and imports only its own relative
`.bin` or `.wasm` artifact.

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

`packages/project-editor/test/modules.browser.test.js` exercises the generated
output Wasm through both the direct integration and the generated iframe
controller. Its guest scripts attempt network-capable element creation,
external image/link attributes, refresh metadata, CSS image URLs, and embedded
HTML/SVG URLs. Denied replacements must preserve the visible application and
must not produce external requests. The test also checks subtree query and
parent/closest boundaries, safe inline styling and fragment links, and removal
of a previous load's navigation grant. This is regression coverage of these
paths, not a substitute for auditing the full host protocol and its renderers.

### Local verification checkpoint: September 10, 2026

The `bc11a84` export passed the 151-file manifest check and the Deno test of
its compressed backend artifact (routing, escaped document output, and unknown
SQL-operation rejection). Browser checks used its exported controller, machine,
Wasm, iframe, and language assets with the local API. Cat Memory Match, Mahjong,
the code tour, and the SQLite reader loaded; the tour traversed 50 slides and
accepted keyboard navigation, and SQLite's internal link changed only the
iframe fragment. These checks did not save over the existing projects.
Those first live runs exercised public views: the diagnostic cookie lacked
the required `v: 1` and expiry fields. The `4bb5227` follow-up supplied valid
session fields and asserted `data-persistence="stored"` on all four owner
views, repeating those navigation checks. A separate owner-edit run recovered
from invalid CSS and intercepted its three autosave requests; the stored
Mahjong version and timestamp remained unchanged. Read-only diagnostics must
block writes explicitly, not assume that avoiding the Save button is enough.

The separate disposable-database stress test passed editing, scrolling,
undo/redo, theme switching, save/reload, and output-error recovery. The
first-paint test now also runs the actual server document renderer for the
project form, with frontend code withheld, checking both pane loaders and the
details background for all seven appearance-preference cases.

The responsive follow-up runs those seven first-paint cases at both 1440×900
and 390×844. The narrow initial split renders as output-only before guest
startup, matching the guest's responsive view, with no unusable Split button.
The owner stress test also crosses that breakpoint in both directions,
switches editor/output repeatedly, opens and closes Details, and checks that
the editor content node and output heading retain their identities. This
caught an invalid `insertBefore` in the UI's toolbar relocation: its Close
button must return to the destination before it can serve as an anchor.
Touch taps no longer leave mouse/focus tooltips covering project content.

A separate Chromium touch-viewport diagnostic of the existing owner Mahjong
project recorded three exported Wasm memories: 40,960,000 bytes each for the
frontend and editor, and 12,976,128 bytes in the output iframe after layout.
Their count and sizes stayed unchanged across five editor/output cycles.
CDP reported approximately 5.9–6.0 MB of used JavaScript heap during those
cycles, following explicit collection between interactions. These are
allocated linear-memory sizes and a separate host-heap measurement, not live
guest allocations or total process memory. Weak references observed the
memories without retaining disposed instances; no profiler was added to the
production controller. Desktop Chromium with a phone viewport does not
establish memory limits or performance on physical phones.

Export `f4c9a5a` includes these responsive fixes and viewport-first parsing.
Its 151-file manifest and
compressed backend test passed; the four owner-project browser checks also
passed narrow/desktop pane switching with assets served from this export.
The tour's 50-slide/keyboard check and SQLite's iframe-only fragment navigation
remain covered. The local deployment archive was refreshed; Bunny deployment
and its real cold-start behavior are still untested.

The editor now limits synchronous `forceParsing` to CodeMirror's
default viewport target and budget, instead of requesting the entire document
for 250 ms. Guest mount measurements on real 109 KB JavaScript and 26 KB Rust
files dropped from roughly 342–384 ms to 89–132 ms. Tests require parsing to
catch up at the final viewport after typing and scrolling; deferred work is
not discarded. The separate 2,024-line JavaScript typing run still had median
insert/delete round trips of about 176, 111, and 87 ms at its beginning,
middle, and end, including Playwright overhead. This is a startup improvement,
not evidence that the larger-file typing target is complete. The full owner
editing, save/reload, output-recovery, theme, and responsive test also passed.

A separate DevTools profile of the stamped-language editor attributed about
45–57% of sampled self time to MicroQuickJS's `JS_Call` interpreter loop.
String comparison/atom lookup and `JS_GC2` also appeared among the larger
native costs; browser-side DOM calls did not dominate this fixture. Function
numbers were mapped using an unstripped build whose 163,986-byte code section
matched the profiled artifact byte for byte. This is an editor-only diagnostic
after exercising multiple grammars, not a profile of the full Resources
snapshot/autosave path, and it does not identify the guest JavaScript callers
inside the interpreter. Profiled timings are not substituted for unprofiled
keyboard measurements.

That fresh-target build also exposed rest parameters in the directly compiled
example runtime, which bypasses Babel. They now use `arguments`. A source
compilation test requires a fresh bytecode output. The vendored `mqjs` also
now exits unsuccessfully on a parse error, rather than letting build scripts
silently accept an older output file. The test checks that case explicitly;
a cached Cargo build alone would miss this failure. The clean
build, owner stress test, lazy-language tests, and direct/iframe module tests
passed after the correction. No host permission or interpreter behavior was
expanded for either profiling or this fix.

This is not a completed performance or deployment audit. The unprofiled
2,020-line editing diagnostic still measured median insert/delete round trips
of roughly 91–163 ms, including Playwright overhead. Real Bunny cold starts,
mobile memory, and full protocol review are not established by these results.

### September 10 snapshot comparison and remaining paste latency

The editor's change path used to construct a complete patch merely to ask
whether anything changed, discarding the splice immediately. It now uses
`projectSnapshotsEqual`. This still validates and normalizes both snapshots,
but compares file paths/content and canonical configuration without scanning
the unchanged prefix and suffix in JavaScript. Actual history checkpoints
still construct patches. Tests compare equality with empty-patch results for
reordering, additions, deletions, renames, edits, and nested configuration.

A read-only live-owner diagnostic inserted the first 400 lines of
`content-form-client.js` from commit `28d2874` into a disposable browser
session. On this 33,176-character fixture, first-page insert/backspace round
trips measured a median of 187 ms before and 172 ms after. Each run discarded
two warm-up pairs and measured ten pairs, with no build or profiler running.
These include Playwright overhead and are a small sample, not a general
latency guarantee. All writes to the real project were intercepted.

The same diagnostic exposed unresolved bulk-replacement latency: inserting
the whole 109 KB file stalled the renderer, and replacing the 33 KB content
again also exceeded the diagnostic deadline. Do not extrapolate the
standalone editor's mount measurements to this full workspace operation.
Investigate the native-input/guest-update path separately from typing and
output debouncing; no runtime instrumentation was added to production.
The reproducer is `/root/macchiato-work/workspace-typing.js`, with
`SOURCE_LINES=2024` selecting the larger case. Sixteen regression tests passed
after the equality change, covering history, owner editing/save/reload,
responsive panes, lazy grammars, compiler failures, and direct/iframe output.

Export `7e4c04f` passed the 151-file manifest verification, compressed backend
execution in Deno, and browser checks for all four stored owner projects.
Those include 50 tour slides, SQLite fragment navigation, theme switches,
and narrow/desktop pane changes using the exported assets. The deployment
tarball at `/root/resources-bunny.tar.gz` contains this export; the previous
archive is retained under `/root/archive/2026/09/10/`. It has not been deployed
to Bunny, so real edge cold starts remain unverified.

### September 10 input layout and listener lifetimes

The reported divider crash was a missing `hasPointerCapture` guest method.
The facade now forwards all three pointer-capture methods to the native
element. A live-owner Playwright check dragged the divider, edited modern
JavaScript, then changed invalid font CSS back to valid CSS. The iframe
recovered all 144 Mahjong tiles without reloading or retaining an error.
All project writes, including autosaves, were intercepted in that check.
The redundant `allowfullscreen` attribute was removed; the trusted iframe's
`allow-scripts`/`allow-same-origin` warning is separate from the guest exception.

Tracing the 33 KB native-insertion stall attributed about 33 seconds to 1,656
browser layouts, mostly rooted at the full document. Size containment on the
already-sized editor mount prevents its content from contributing to ancestor
intrinsic sizing. Only `contain: size` was added to the website's CSS policy;
paint containment remains disallowed. A repeat measured roughly two seconds,
not 35 seconds. These are diagnostic samples, not latency guarantees.

Element listener registration also bypassed the existing free-callback list.
It now reuses retired slots, unregistering the host listener synchronously
before making its ID reusable. Tests cycle 5,000 registrations/removals, check
bounded slot use, and dispatch real events to prove only the current listener
runs. Both stamped and downloaded language builds pass. Quotas are unchanged.

The expanded owner test covers a 109 KB clipboard paste, 400 lines of native
insertion, stable mount dimensions, and whole-operation undo/redo. Linux redo
uses the same `Control+y` shortcut as the existing test. All sixteen regression
cases pass with this coverage. A separate 109 KB native `insertText` diagnostic
still takes about a minute and exhausts the general callback allocator, even
after listener-slot reuse. It is not the same operation as clipboard paste,
which took about 1.2 seconds. That larger native case remains unresolved; it
has not been reclassified as a passing test. Extra layout containment did not
help and was not retained. The installed native CodeMirror enables EditContext
only on Android, so that is not an explanation for the desktop comparison.

Export `8110100` passed manifest verification, compressed backend execution,
and the four-project browser check, including 50 tour slides and SQLite
navigation. `/root/resources-bunny.tar.gz` now contains that export and was
verified again after extraction. The previous `7e4c04f` archive is retained
under `/root/archive/2026/09/10/`. No Bunny deployment was performed.

### September 10 batched event-cache retirement

A test-only served-host counter traced the remaining callback exhaustion to
7,892 zero-delay timers during the 109 KB native insertion. Each newly delivered
event wrapper scheduled its own timer to retire its dispatch-cache entry.
The guest now schedules one timer to retire that cache as a batch. It does not
coalesce application callbacks, change input dispatch, or invalidate events
retained by application code. The host and its callback quota are unchanged.

A 5,000-event regression checks shared identity and expandos in target and
document listeners, bounded callback slots, and retained event access after
cache retirement and guest GC. It runs with both stamped and downloaded
language bytecode. The independent live-owner counter and insertion reproducer
established the failure before the fix.

The uninstrumented live-owner 109,485-character native insertion now completes
without errors or text loss. Twelve first-page insert/backspace pairs followed;
the ten measured pairs had a median round trip of 223 ms. Insertion still took
62.7 seconds. A separate native CodeMirror control with the same source (minus
the diagnostic's 12-character comment) took 7.0 seconds. Those layouts differ,
so this is not a pure interpreter comparison. The native bulk-input latency
remains an open performance issue; batching cache retirement fixes exhaustion,
not the repeated browser layout. Real clipboard paste remains a separate,
much faster path. The owner regression now exercises the full file in both
paths instead of restricting native input to 400 lines.

The expanded owner test and four editor/runtime browser cases passed. In that
test, 109 KB clipboard paste took 1.25 seconds and native insertion took 68.6
seconds; both preserved exact source through undo and redo. The increased
test timeout accommodates the known latency rather than treating it as fast.

Export `40795fc` passed its 151-file manifest check, compressed backend test,
and all four owner-project browser checks (including tour navigation and
SQLite fragments). The extracted `/root/resources-bunny.tar.gz` was verified
again; the previous archive remains under `/root/archive/2026/09/10/`.
Nothing was deployed to Bunny. The next performance comparison should match
the native control's surrounding layout to the workspace before attributing
the remaining difference to the interpreter.

### September 10 output appearance inheritance

Live first-paint sampling found that explicit Resources.co light/dark choices
did not reach the output iframe: its computed `color-scheme` was `normal`, and
Cat Memory followed the operating system instead. Two scoped stylesheet rules
now set the iframe's scheme from the already-resolved page theme. The browser
then updates embedded CSS media queries and native `matchMedia` change events,
which the existing machine ABI forwards to the existing guest. No replacement
VM, new message protocol, or new host permission is involved. The website's
stylesheet schema accepts only `light` and `dark` for this property.

The static first-paint tests cover explicit/system preferences, navigation,
reload, unavailable storage, and desktop/phone loading panes before frontend
startup. Their iframe probe clears Playwright's explicit media emulation after
checking the page: that override otherwise supersedes the browser's embedded
scheme inheritance. Separate direct/iframe QuickJS tests repeatedly switch
appearance, check both CSS colors and guest `matchMedia` notifications, and
assert that the Wasm instance count does not change.

The live owner check sampled appearance across loading and repeated selection
changes with native browser media behavior (no forced media override). The
iframe scheme, its media query, and Cat Memory's palette agreed at every sampled
state after frame creation. A flipped card and the original board node survived
all switches. Recordings, startup frames, and ready-state light/dark screenshots
were reviewed; no live project writes were permitted.

The combined 46-case regression run passed. Export `a1d1e13` also passed its
151-file manifest check, compressed Deno backend execution, and all four stored
owner-project browser checks. `/root/resources-bunny.tar.gz` contains this
verified export, with the previous `b22d700` archive retained under
`/root/archive/2026/09/10/`. Nothing was deployed to Bunny. These checks do not
resolve the remaining large native-input latency or pre-observer DOM parity
gap described below.

### September 10 sibling-read experiments

The guest's `nextSibling` and `previousSibling` getters scanned its cached
child array. Besides a linear search on each traversal step, this returned
stale siblings after native changes and before MutationObserver delivery.
The first experiment read the native properties through the existing host
reference ABI. Returned nodes passed the same subtree/ownership check as
parent reads. It did not change event scheduling or reference lifetime rules.

A browser regression failed on the old implementation and passed with both
stamped and downloaded language bytecode in that experiment. It reordered native
children and reads siblings synchronously, checks identity, detaches the owned
parent, removes a child, and checks that siblings outside the granted root are
not exposed. Large-file timing is a separate gate, not implied by this test.

The first full-size native insertion exceeded the 90-second diagnostic
deadline. A separate profiled run completed in 103.2 seconds: the previous
array-search hotspot disappeared, but interpreted guest execution and wire
exchange costs increased. This is a regression, not a successful optimization.
A follow-up experiment reduces interpreted calls in the integer codec and
operation encoder without changing the wire format or host permissions.
Keep the known-good deployment archive until the experiment is resolved.

Even after the integer/operation-loop optimization, the uninstrumented native
insertion took 91.9 seconds (first-page edit/backspace median 230 ms). Direct
sibling forwarding was therefore backed out, including its host permission.
The synchronous pre-observer parity issue remains open; do not describe the
current child mirror as immediately reflecting arbitrary native changes.
The sibling tests now explicitly wait for native observer delivery and also
exercise synchronous guest moves. A new experiment caches a child index only
as a hint, verifying `siblings[index] === node` before every use and searching
again when that condition fails. This does not claim to fix pre-observer reads.

The updated regression found that the host rejected zero optional observer
flags, although `childList: true` is always set by this ABI. Zero now correctly
means child-list-only observation, without attributes, character data, or
subtree observation. Both language-loading variants exercise this case.

With validated child-index hints and the bounded integer/operation loops, two
uninstrumented live-owner runs inserted the same 109,485-character fixture in
26.7 and 25.5 seconds, compared with approximately 63 seconds before these
experiments. The first-page type/backspace medians were 230 and 232 ms, broadly
unchanged from the earlier 223 ms sample. Every run verified exact source and
no page errors; all real-project writes were intercepted. The matched native
workspace control remains approximately 17 seconds. This is a substantial
bulk-input improvement, not a claim that large native insertion is now fast
or that every editor interaction accelerated. No profiling was enabled during
these measurements, and no build or other test ran concurrently.

The final 27-case regression run passed, including owner editing/save/reload,
undo/redo, invalid-output recovery, native input and clipboard paste, responsive
panes, lazy languages, reference/callback lifetimes, and the wire codec. Its
109 KB paste took 1.24 seconds and native insertion 29.0 seconds. Desktop light,
desktop dark, and phone editor screenshots were reviewed.

Export `b22d700` passed its 151-file manifest check, compressed backend execution
in Deno, and all four stored owner-project browser checks: Mahjong, Cat Memory,
50 tour slides, and SQLite fragment navigation, including theme switches and
responsive panes. `/root/resources-bunny.tar.gz` now contains that verified
export; the previous `250cf75` archive is retained under
`/root/archive/2026/09/10/`. Nothing was deployed to Bunny. Large native insertion
latency and the pre-observer child-mirror parity gap remain open.

### September 10 native layout comparison and tab stops

A diagnostic copies the live workspace's layout and active CSS, removes its
scripts and form values, and mounts native CodeMirror into the same editor
slot. The first 109 KB insertion sample took 17 seconds there, compared with
7 seconds in the minimal native page. This first sample still used an older
local Mahjong starting document; the diagnostic now captures the actual
starting document too. These controls are not production code and do not
save changes to the real project.

Repeating that native control with the actual stored starting document took
17.1 seconds, so the starting-document correction did not remove the gap.
The copied layout isolates native CodeMirror from the frontend/editor guests;
it is a diagnostic baseline, not an alternative production editing path.

Comparing computed styles uncovered a guest API mismatch independently of
timing: `CSSStyleDeclaration.tabSize` was missing. CodeMirror's feature probe
therefore chose `-moz-tab-size`, which the CSS adapter intentionally ignores,
and the browser kept its default eight-space tabs. The standard `tab-size`
declaration was already supported by the semantic CSS renderer and host.
Adding the property to the guest's existing style facade fixes the probe;
there is no new host permission or CodeMirror customization.

Both stamped and downloaded-language tests failed before the change with an
empty inline tab-size value. They now check 2-, 8-, and 4-space state facets,
the inline/computed CSS values, and actual tab width measured with a native
Range. Both pass, including the existing event-lifetime and selection tests.

### September 10 mutation-batch membership scans

A fresh profile after the layout and event-cache fixes changed the diagnosis.
Of 63.8 sampled seconds, `js_strict_eq` accounted for 43.6% self time and
`js_array_indexOf` for 15.5%, predominantly under mutation-observer delivery.
The running Wasm's 163,986-byte code section matched the symbol-bearing build
exactly. The earlier layout-dominated profile must not be used to explain this
new bottleneck: about 38 seconds now belonged to repeated guest array searches.

An experiment replaced reconciliation membership scans with reference-keyed
tables and removed the new-wrapper child search. It preserved the tested DOM
semantics but the live insertion still took 63.5 seconds, with no demonstrated
improvement. That bookkeeping was backed out. The profile establishes expensive
array searches under mutation delivery, not which guest JavaScript caller
causes them. Sibling traversal, which searches the parent array on each getter,
is another candidate to measure; it has not been changed speculatively.

The regression moves nodes between parents, removes and reinserts a retained
node, adds a new node, and replaces text in one browser operation. It compares
the native observer's record count with the guest's, final child order,
parentage, and retained identity. This also exposed a missing element
`textContent` getter (the setter shadowed the node getter). The host previously
allowed text-node reads only; element text reads now require an owned node or
a node within the granted roots. The guest forwards that scoped read directly.

After backing out the membership experiment, all sixteen history/compiler/
editor/output regression cases passed, including the new tab-stop and mutation
checks. Full-file clipboard paste took 1.23 seconds in that run; native input
still took 68.7 seconds. A useful next experiment is to compare the guest's
array-based sibling traversal with ordinary scoped native sibling reads,
before adding another layer of cached indexes.

Export `250cf75` passed the 151-file manifest check, compressed backend test,
and the four-project exported-browser check. `/root/resources-bunny.tar.gz`
contains that export and passed verification after extraction. The previous
`40795fc` archive is retained under `/root/archive/2026/09/10/`. It has not
been deployed to Bunny; bulk native-input performance remains unfinished.

### Standalone compiler parity

The temporary playground keeps its page integration behind a controller and a
small set of related devices. A session device owns namespaced ephemeral state,
an editor device owns the editor machine, a compiler device selects a
client-side Wasm or supervised-server build, and an output device owns the disposable output
machine. The document module may construct the controller, but it must not
contain a second body of application behavior beside those objects.

The single-file compiler is shared source, not two implementations expected to
converge. Its client Wasm build and its Deno build inertly parse the same HTML,
apply the same source envelope, reject network-capable markup and CSS, and emit
the same tree and guest program. Automated parity tests compare their complete
serialized output. The Machine Host remains the final enforcement boundary;
successful compilation never grants a host DOM node, stylesheet, navigation,
or fetch capability. The page controller never parses project CSS. A server
build may give the output guest WIT-encoded stylesheet operations, while raw
dynamic CSS may instead be sent as inert guest input for the guest to encode.
Only semantic operations cross from that guest into the DOM display device.
CSS already active in the initial document was checked before the document was
sent and is inherited directly.

Container-mode stylesheets are scoped to a unique machine-owned root class.
Selectors that name `html`, `body`, or `:root` map to that root instead of the
host document. Document-mode machines remain explicitly page-wide. Browser
tests place a matching host element beside output and prove that guest styles
cannot affect it.

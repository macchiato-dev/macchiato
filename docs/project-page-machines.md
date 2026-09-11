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

### September 10 mutation-observer containment

A direct-ABI test demonstrated that a div-scoped machine could observe the
real host document and read old attribute values from unrelated elements.
Filtering the guest facade's target nodes was not sufficient: hostile guest
code can read `MutationRecord.oldValue` directly through the ABI.

Document observation now targets only the machine's granted roots in container
mode, including explicitly granted portal roots. Document-mode machines retain
native full-document observation. Explicit observation targets must be inside
the grant or owned by the machine. Scope is enforced when registering the
native observer, so callbacks and synchronous `takeRecords()` have the same
boundary without filtering every normal editor mutation afterward.

The new browser regression uses the ABI directly rather than trusting the DOM
facade. It fails before the fix for single-root, multi-root, and portal grants,
and passes after it; full-document behavior remains covered. This addresses
observer registration, not a complete audit of every event/selection-derived
reference and its permitted operations.

The rebuilt site passed all 51 regression checks and the live-owner divider,
modern-JavaScript, and invalid-to-valid font CSS recovery check. The latter
intercepted all project writes; all 144 tiles returned with no guest errors.
Export `ef95528` passed its 151-file manifest, compressed backend execution,
and exported-browser checks for Mahjong, Cat Memory, the 50-slide tour, and
SQLite fragment navigation. It has not been deployed to Bunny.

### September 10 delegated input containment

Direct-ABI tests showed that container-mode document/window listeners could
read and cancel keyboard, input, change, and clipboard events originating in
another host subtree. Those input events now require a target inside a grant
or an original dispatch path through a granted root. The latter preserves
document delegation when an earlier native listener removes the target.
The check is selected once when registering each listener, not by allocating
an event-type list on every pointer movement.

The regression covers single roots, root collections, explicit portals, and
full-document machines. It checks both message delivery and native default
prevention, outside pointer delivery, and removal during dispatch. Document
mode retains its full-page input behavior. Outside pointer events remain
available for dismissal and dragging; this change does not by itself audit
every operation reachable through an event's target reference.

The first full regression run caught an over-broad classification: a media
query's `change` notification is not form input. Excluding media-query
listeners restored native light/dark changes in both direct and iframe
QuickJS tests while retaining all delegated-input scope checks.

The exported tour check also exposed a real focus gap: clicking plain slide
text left the iframe's outer body focused, so its arrow keys were correctly
outside the grant. Each output surface now has native `tabIndex = -1`; clicks
focus that ancestor without adding a tab stop or forwarding unrelated input.
Direct and iframe tests click ordinary text, press an arrow, and check native
focus as well as the guest's event response. The full tour remains an export
gate rather than relying only on this small reproduction.

Remaining containment checks must use the raw ABI too: an outside pointer's
target reference can reach node operations, and a selection can return range
endpoints. Test reads, writes, node arguments, and retained/detached lifetimes
before claiming these reference paths are contained. Blocking unrelated input
delivery does not substitute for checking the authority of those operations.

Final export `c120746` passed all 51 regression checks, the live-owner
invalid-to-valid edit recovery check, all four exported-project browser checks
(including 50 tour slides and keyboard navigation), the compressed backend
test, and its 151-file manifest. The corrected build is live locally. No
project writes were persisted by the live checks, and no Bunny deployment was
performed. Earlier exports from the failed media/focus checks were not promoted.

### September 10 node-reference authority

Raw-ABI tests reproduced reads and writes through an unrelated pointer target,
including moving that node into a grant before reading it. They also reproduced
real-document child enumeration and reading private selection text. A returned
reference now preserves identity without automatically granting these operations.
Node reads/writes, method receivers, and mutation arguments require node authority;
scoped parent/closest and node-type/name inspection remain available. A container's
document capability exposes its explicit services, not generic native child-list
or document mutation access. Range measurement and insertion into a selection
check both endpoint nodes.

Native nodes acquired within a grant keep their authority after detachment.
Their detached descendants inherit that grant; references and ownership tracking
do not add strong retention beyond the existing reference leases. Native scoped
observer records and original event dispatch paths establish authority for nodes
removed before delivery. Tests include retained nodes across guest GC, removal
by an earlier native capture listener, and querying a retained detached subtree.
This preserves native editing lifetimes rather than treating removal as immediate
revocation. It is not a blanket claim that all remaining event, graphics, and
service surfaces have been audited.

Export `fe6bcae` passed all 67 regression checks, live-owner edit/error recovery,
the four-project exported-browser checks, the compressed backend test, and its
151-file manifest. The tour passed 50 successive slides plus keyboard input;
SQLite fragment navigation and theme switching remained functional. Live checks
intercepted project writes. In the stress run, 109 KB clipboard paste took
1.27 seconds and native insertion took 28.7 seconds; the latter remains slow.
No Bunny deployment was performed.

### September 10 drag-transfer boundaries

Raw ABI tests exposed a missing scope check for delegated drag events. A
container's document listener could read another subtree's transfer text,
replace it, and cancel its drag. Keyboard and clipboard events were already
scoped, but `dragstart`, `dragend`, `dragenter`, `dragleave`, `dragover`, and
`drop` were missing from that same input boundary. They now use it as well.
No new permission, wrapper, or guest convention is involved.

The fixture checks all six events in single-root, multiple-root, portal, and
whole-document modes. It checks both data access and native cancellation, and
keeps drops into the grant working even if an earlier native listener removes
their target. Outside mouse events still support gesture completion and panel
dismissal. This is a targeted containment check, not a completed host audit.

Next, test inherited active markup through raw references: an existing `style`
or `script` node, its text children, and clones or reinserted subtrees. The
creation allowlist alone does not prove that generic operations on preexisting
nodes cannot bypass the CSS renderer or activate content. Cover document grants
as well as hydrated containers; keep this separate from native editor events.

The native/MicroQuickJS comparison now also uses actual browser text dragging,
requiring trusted `dragstart` and `drop` events, exact moved text, retained
selection, undo, and redo. Both implementations pass, alongside the held-arrow
caret and idle-blink checks. The harness measures a nonempty text range for its
drop coordinates; collapsing a range at an element boundary returned an empty
rectangle and initially sent the drag to the page corner in both versions.

The full rebuilt suite passed 71 checks. Export `b273d03` passed its 151-file
manifest, compressed backend execution, and the four live-owner project checks
using exported assets, including the tour's 50 slides and SQLite navigation.
The local server and `/root/resources-bunny.tar.gz` now use this build. The
preceding archive is retained under `/root/archive/2026/09/10/`; no live project
writes or Bunny deployment were performed.

### September 10 inherited active markup

Raw inherited-node probes confirmed that creation restrictions were insufficient:
the guest could replace stylesheet text, change a stylesheet's Text child, or
clone/reinsert active markup. Generic content mutation now checks the element
allowlist, including containing elements for Text changes. Insertion and cloning
check descendants as well; moving/removing text also checks its previous parent.
This leaves reference identity, reading, and removal of whole stylesheets intact,
but styles must still be authored through the structured CSS renderer.

Nested HTML templates exposed another real request path. A selector over a
template fragment does not enter nested template contents, so an image hidden
there escaped validation and loaded after insertion. The check now enters those
contents, and template assignment keeps the validated nodes rather than reparsing
the original string and losing embedded-image resolution. Embedded `src` values
take their explicit validated path, not the unrelated generic attribute list.

Tests cover container/document grants, style text and child operations, wrapped
active subtrees, inert scripts becoming executable on cloning/reinsertion, nested
template images/scripts, and valid resolved images. Unexpected resource requests
are intercepted and asserted absent. The 62-case focused run also includes raw
reference boundaries, direct/iframe output, and native/MicroQuickJS editing.
This remains a targeted improvement, not a completed audit of all inherited
attributes or every browser object surface.

The whole workspace required its existing passive `kbd`, `details`, `summary`,
fieldset/legend, and figure/caption/output elements in the mutation allowlist.
Those are ordinary content, not exceptions for active markup. The expanded-view
check verifies viewport coverage above the app bar and preserves the original
iframe and output node when closing. The workspace stress test passes with those
elements included.

Validation walks native element nodes (and separate template fragments), avoiding
per-text-node child-array copies. A first 109 KB timing comparison rose from
229 ms to 336 ms per insert/backspace pair; a subsequent old/new/old host-only
comparison measured 584/441/581 ms. This variability does not isolate a regression
to the new guards or establish a speedup. The new profile still spent about 90%
in guest delivery. Repeat performance measurements under stable conditions;
do not remove containment checks to fit these samples.

Final verification of export `283bdb0`: 111 checks passed in the combined run,
while the native-insertion stress case timed out at three minutes. An isolated
old-host control then passed in 106 seconds (52 seconds native insertion); the
current-host retry passed in 96 seconds (41 seconds native insertion), with
unchanged actions, text/undo assertions, and recording enabled. Thus all 112
checks passed across the run and retry, not in one uninterrupted green run.
The 151-file manifest, compressed backend, and all four exported owner projects
also passed. The local server and refreshed `/root/resources-bunny.tar.gz` use
this export; prior archives remain under `/root/archive/2026/09/10/`. Live checks
saved no project data, and no Bunny deployment was performed.

Further raw-ABI coverage is still needed for attribute/value restrictions on
inherited nodes and HTML-assignment paths, including form associations and
navigation. Creation and content-element checks alone do not prove those cases.

### September 10 attribute-path and form parity

Raw probes found different policies in HTML assignment and `setAttribute`:
HTML could associate controls with an outside form, set network form methods,
and bypass several element/value and size restrictions. The two paths now use
one attribute setter. The HTML-only embedded-image and limited inline-style
paths remain explicit; this does not widen the general `src` attribute grant.
Nested templates pass through the same checks.

The native form guard also checks the submitter, not just the form's location.
A real click on an inherited button inside the guest formerly issued a request
through its outside form. The guard now prevents that without suppressing
unrelated outside form events or the frontend's explicit same-origin POST grant.
Dialog forms, propagation behavior, and normal guest submit handlers still work.

The focused 141-case run passed: raw content/reference tests, attribute checks
through DOM calls, direct HTML, and nested templates in both container/document
modes, plus native form activation and direct/iframe project output. The host
change removes duplicated checks rather than adding another policy layer.

The first complete run passed all 210 tests, but the exported tour exposed a
compatibility omission: its source line numbers use `li[value]`. List items
now accept signed 32-bit integer values through the same shared setter. The
expanded 161-case raw-markup suite passes, including positive and negative
list values, overflow, and invalid text across all three assignment paths.
The initial export stopped at slide 9 and was not promoted to the archive.

Final export `e0bfc15` passed all 234 regression checks in one uninterrupted
run, the 151-file manifest verification, and compressed backend execution.
All four stored owner projects passed the exported-browser check, including
50 successive tour slides, embedded keyboard navigation, SQLite fragments,
theme switches, and phone/desktop panes. The separate live Mahjong check
verified divider dragging and invalid-to-valid font CSS recovery with all
144 tiles, without reloading; all writes, including autosaves, were blocked.
Screenshots were reviewed. The local server and `/root/resources-bunny.tar.gz`
now use this export; the archive also passed verification after extraction.
The preceding archive remains under `/root/archive/2026/09/10/`. No Bunny
deployment was performed, so production edge startup remains unverified.

### September 10 binary reply copies

A fresh DevTools sample of the 109 KB native insertion spent about 69% outside
JavaScript/Wasm stacks and 30% in guest delivery. The browser timeline showed
4,000 input events, 8,093 layouts, and 8,095 layout-tree updates. This differs
from the earlier guest array-search bottleneck; do not change input semantics
merely to bypass this stress case. Ordinary first-page typing after loading
the same source measured a 219 ms median for an insert/backspace pair.

The binary reply decoder was still calling an interpreted byte getter for each
payload byte. It now checks the declared length once and copies into a fresh
Uint8Array using `set` and `subarray`. MicroQuickJS already implements this
same-type copy with native `memmove`; no new C primitive or host ABI is needed.
The fresh buffer is important because the bridge reuses its transfer buffer.

Independent wire fixtures check exact bytes, logical truncation boundaries and
cursor positions, empty/offset views, and two-way non-aliasing. They also count
byte-getter calls so the copy cannot silently regress to an interpreted loop.
In the focused MicroQuickJS run, 32 copies of 64 KiB took about 398 ms before
and 1 ms after. This is a codec measurement, not a whole-editor speedup claim.

Two unprofiled workspace repetitions after the change measured 215–217 ms
median insert/backspace pairs, compared with 219 ms before. Clipboard insertion
remained about 1.3 seconds. These samples do not establish a material improvement
in whole-editor typing latency; most of that work remains elsewhere.

The rebuilt artifacts passed all 68 editor/output regression checks and the
compressed backend execution test. A fresh live-owner browser check also passed
native divider dragging, modern JavaScript editing, and invalid-to-valid font
CSS recovery without reloading: 144 tiles, no stale error, and no page exceptions.
All live project writes, including three attempted autosaves, were intercepted.

Export `9832b74` also passed checks of all four owner projects using its built
assets, including 50 tour slides, keyboard input, SQLite fragment navigation,
theme changes, and mobile/desktop panes. The refreshed deployment archive is
`/root/resources-bunny.tar.gz`; the preceding export is preserved under
`/root/archive/2026/09/10/`. This is local verification, not a Bunny deployment.

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

### September 10 UTF-8 encoding experiment

The first-page 109 KB typing profile spends most time in guest execution, not
browser layout. Disposable bytecode checkpoints attributed 1.26 seconds across
24 edits to snapshot normalization. Its TextEncoder builds an array of byte
values in interpreted JavaScript, even though this runtime already has a native
UTF-8 writer. The native `js_array_every` profile label covers map, filter,
forEach, and some as well as every; it does not identify an every call site.

An experiment reuses the guest-only native writer for TextEncoder and slices
off its wire length prefix. It grants no host capability and adds no C API.
The fallback now handles lone surrogates and omitted input like the browser.
Tests compare both paths with native TextEncoder, including embedded NUL,
surrogate pairs and non-pairs, multibyte lengths, and retained buffers after GC.
The previous built runtime fails those parity checks. Both rebuilt language
variants pass them. MicroQuickJS lacks typed-array slice, so the implementation
uses its existing native subarray/set operations. The temporary buffer reserves
the UTF-8 upper bound (three bytes per UTF-16 unit plus the header); the returned
buffer has the exact byte length and never aliases that scratch storage.

The checkpointed repeat reduced normalization from 1,261 ms to 96 ms across
24 edits. Uninstrumented old/new/old/new first-page edit/backspace medians were
246/175/324/172 ms on the same 109,485-character fixture. This shows a useful
improvement but also substantial timing variability; it does not establish
a fixed latency or solve all bulk native-input costs. Diagnostic bytecode was
served only to the disposable browser, with all real project writes blocked.
Final export `8daa970` passed all 237 regression tests, its 151-file manifest,
and compressed backend execution in Deno. The four exported owner projects
also passed: games, 50 tour slides, embedded keyboard navigation, SQLite
fragments, and theme/mobile transitions. Screenshots were reviewed. The stress
run pasted 109 KB in 1.30 seconds; native insertion still took 41.8 seconds, so
that distinct performance gap remains open. The local server and refreshed
`/root/resources-bunny.tar.gz` use this export, verified again after extraction.
The prior archive is retained under `/root/archive/2026/09/10/`. No live project
data was saved and no Bunny deployment was performed.

### September 10 output scheduling

A live one-burst typing probe and a new browser assertion both found two
output builds for one edit. The bootstrap's snapshot setter scheduled a
500 ms render while the UI independently scheduled its configured debounce.
The setter now updates data only; the UI owns the trailing-edge timer.
Explicit history/import/configuration actions send their current snapshot and
render it directly. Previously that editor-owned output path returned early,
so selecting a version could leave the output showing another version.
The initial output is already mounted by bootstrap and needs no second UI
mount unless UI startup recovers a different draft or chooses another template.
The first rebuilt stress run passed the single-build assertion and verified
switching to a saved version and back with matching output. Further coverage
visits multiple saved versions before returning and reloads a session draft.
Browsing another old version must not replace the retained current snapshot.

The expanded stress test passes: one build per edit, multiple historical
versions and back, session-draft recovery on reload, output-error recovery,
phone pane switching, and large native edits. The full regression run passed
236 other tests; its history fixture initially failed because autosave does
not create a checkpoint for every edit. The corrected test establishes its
second checkpoint through the store in its disposable database, then passes
the complete browser workflow (93 seconds). Large native insertion still
takes about 42 seconds for 110 KB; this is not a claim that bulk input is fast.
The compressed backend artifact also passes its Deno execution test.

The live owner check then exposed readiness written on the surrounding
workspace rather than the editor section. The removed duplicate render had
masked this: the game rendered, but its own loading state stayed `starting`.
Initial mounting now writes to the same section as later guest updates, and
bootstrap preserves an already-mounted output's stage. The updated stress
test checks initial output readiness too. The live Mahjong check passes
divider dragging, modern JavaScript edits, and invalid-to-valid font CSS
recovery: 144 tiles, no page errors or stale warning, and all saves intercepted.

Export `7ed09b6` passes the 151-file manifest, compressed backend execution,
and all four stored owner projects with exported browser assets. Coverage
includes 50 tour slides, embedded keyboard input, SQLite fragment navigation,
and theme switches. `/root/resources-bunny.tar.gz` now contains that export;
the previous archive is under `/root/archive/2026/09/10/`. The local server
uses the rebuilt files. No Bunny deployment was performed.

### September 10 native insertion trace and recovery serialization

On the rebuilt `7ed09b6` workspace, a fresh 109,485-character insertion CPU
profile took 31.7 seconds: 73% of samples were outside JavaScript execution,
and about 26% were inside guest delivery. A separate browser timeline took
35.0 seconds and recorded 4,000 native `input` events, 8,092 layouts (12.0
seconds), and 8,094 style/layout-tree updates (4.3 seconds). These event and
callback totals overlap; they must not be added together as separate costs.
One mutation delivery occupied about seven seconds. This is not evidence
that all remaining insertion time is an interpreter or garbage-collector cost.

A local-only `contain: layout` experiment on the scroller took 39.3 seconds
and did not demonstrate an improvement; it was not added to production. These
diagnostics are under `/root/macchiato-work/`, with no profiler or counters in
the served code, and intercept writes to the real owner's project.

Ordinary first-page typing after clipboard paste is measured separately. Its
baseline ten-pair median was 166 ms for an insert/backspace pair, including
Playwright overhead. The next small change reuses one serialized snapshot for
the form field and immediate session-recovery write. It does not debounce
recovery storage, suppress events, or change CodeMirror history. A browser
assertion compares both values immediately after an edit containing Unicode.
Alternating old/new/old/new runtimes gave pair medians of 166/145/142/138 ms.
Every run checked exact source and no page errors, without a profiler or
concurrent build. The second pair is close enough that this is evidence for
removing duplicate work, not a reliable large responsiveness improvement.
The remaining native-insertion and mutation-batch costs are still open.
The five-case regression run passed, including the full owner editing workflow,
immediate Unicode recovery, undo/redo, saved versions, and bytecode/source
parity. Its 110 KB paste took 0.99 seconds; native insertion took 47 seconds,
again demonstrating that bulk native insertion is not solved by this change.

Export `1b5e535` passes the 151-file manifest verification after extraction,
compressed backend execution, and the four-project exported browser checks
(including 50 tour slides, SQLite navigation, and theme changes). The local
server and `/root/resources-bunny.tar.gz` now use this build. The prior archive
is retained under `/root/archive/2026/09/10/`; nothing was deployed to Bunny.

### September 10 grouped mutation-record reads

An experiment read MutationRecord metadata through the existing multi-operation
wire format. Adjacent `type`/`target`, added/removed counts, and previous/next
sibling reads each shared an exchange. They are fixed native fields, not
arbitrary guest-defined getters. The flush after detached-node callbacks was
preserved before reading siblings; event delivery was not deferred or merged.
No host API, permission, wire encoding, or CodeMirror behavior was added.

The expanded browser probe compares the complete native and guest record
sequences, including identified left/right parents, intermediate siblings,
added/removed nodes, repeated character-data changes, and attribute old values.
It passes before and after grouping, for both stamped and downloaded language
bytecode. An uninstrumented old/new pair took 40.4/41.5 seconds for the same
109,485-character native insertion. Disposable guest-only probes then measured
decoding all 10,067 records at 746/735 ms, out of 32.2/35.1 seconds total.
The metadata reader is only a small part of the roughly seven-second observer
callback; subsequent DOM reading/editor processing needs separate attribution.

The grouping was backed out because it did not demonstrate a meaningful
improvement. The stronger native-record parity tests remain. No probing code
was added to the host or production guests. Timing scripts and disposable
stamped guests are in `/root/macchiato-work/`; live-owner writes were intercepted.
After rebuilding the original implementation, both expanded language tests and
the bytecode/source parity test pass. The editor and output Wasm files are
byte-for-byte identical to the already verified `1b5e535` export. The local
server and existing deployment archive therefore need no replacement for
this test/documentation checkpoint. The experiment remains visible in Git.

### September 10 repeated sibling searches in large mutation batches

A more focused guest-only probe attributed 5.47 seconds of a 5.76-second
record-processing pass to 16,180 `findChild` searches. These repeatedly walk
runs of native-inserted siblings that have no CodeMirror tile yet. The mirror
and the record decoder were not the principal cost in this pass.

The Resources editor build now keeps a fresh path-result cache for a synchronous
record scan containing more than 128 records. It separates results by container
tile and traversal direction, including unsuccessful searches. Smaller scans
use the original search. Nothing survives into a view update or later batch;
there is no new host method, event suppression, or delayed observer delivery.
The build adaptation retains CodeMirror's MIT license and rejects changed
upstream search/call sites rather than silently adapting unknown internals.

In the disposable probe, record processing fell from 5.76 seconds to 0.55
seconds, and sibling searching from 5.47 seconds to 0.33 seconds. These are
instrumented component timings, not a claimed whole-editor speedup. Native
insertion still spends substantial time in browser layout and input processing.
The regression checks identical search results, linear lookup counts across
2,000 siblings, multiple containers/directions, and changed mappings in a new
batch. The shipped-artifact test recompiles both runtime and editor bytecode
and compares them with their actual Wasm sections.

Focused browser tests and the full project editing regression pass. The latter
checks pointer capture, theme changes, syntax/output recovery, saved versions,
and large insertion undo/redo. Its 110 KB paste took 1.02 seconds and native
insertion took 37.4 seconds. Screenshots were inspected in both themes. The
diagnostic runs do not persist edits to the real owner's projects.

An unprofiled old/new/new/old comparison inserted the same 109,485-character
source in 33.0/30.3/25.9/29.7 seconds. Subsequent first-page insert/backspace
pair medians were 171/196/152/178 ms. Each run checked exact document contents
and no page errors, with no overlapping build or browser test. Both adjacent
comparisons favor the large-scan optimization, but ordinary typing varies and
shows no consistent improvement or regression. The large browser-native
insertion cost remains an open performance issue.

Export `b1b9af1` passes the 151-file manifest check, compressed backend execution
in Deno, and the four-project browser check using only exported browser assets.
That includes 50 successive tour slides, SQLite fragment navigation, and theme
switches. After restarting the local server, the live-owner check again dragged
the divider and recovered from invalid font CSS to valid quoted `monospace`,
with 144 Mahjong tiles and no stale warning or page error. All three autosave
attempts were intercepted; no real project data changed.
`/root/resources-bunny.tar.gz` now contains this verified export and was checked
again after extraction. The previous `1b5e535` archive is retained in
`/root/archive/2026/09/10/`. Nothing was deployed to Bunny.

### September 10 full-page appearance and readable first paint

The static appearance regression now visits every built blog article and a
signed-in dashboard rendered by the actual document machine, in addition to
the public home, blog index, and project form. It checks seven preference cases
on desktop and phone. Test storage setup applies only to the top-level site;
sandboxed article examples neither receive that setup nor load external assets.

A read-only live run checked 24 page/mode combinations through real frontend
startup, including delayed controller delivery, public and authenticated home,
blog, an article, and Mahjong. Palette sampling found no theme flash. However,
reviewing the early screenshots revealed a separate fade/slide inherited from
the original site prototype, which made already-rendered content temporarily
faint on every navigation. Resources now disables that content entrance, not
the loading indicators or interactive transitions. Its stylesheet allowlist
adds only the literal `none` to the existing animation rule.

The new opacity/transform assertion failed in all 14 first-paint cases before
the change. All 20 appearance tests pass afterward, including both pane loaders,
iframe scheme inheritance, unavailable storage, and the exact bootstrap CSP
grant. There is no additional client script or host API for this change.

After rebuilding, all 24 live page/mode checks pass with first-frame opacity
and transform checks as well as palette sampling. Early and ready screenshots
were reviewed. Export `bec6585` passes the 151-file integrity check, compressed
backend execution, and all four stored-project browser checks, including the
tour's 50-slide navigation and SQLite fragments. The local server and verified
`/root/resources-bunny.tar.gz` use this export. The preceding `b1b9af1` archive
is retained under `/root/archive/2026/09/10/`. No Bunny deployment or stored
project edit was made. The broader performance and host-containment audit is
not declared complete by this appearance checkpoint.

### Container CSS root-sibling boundary

The raw-guest browser test demonstrated that mapping `body`/`html`/`:root` to
the container class could make a root-level `+` or `~` selector style unrelated
host siblings. Five probes changed the neighboring element's color before the
fix. The host now rejects that first top-level sibling combinator after a
mapped root. It skips quoted attributes and balanced functional predicates when
locating the combinator, preserving ordinary root rules and descendant sibling
selectors. This does not add a raw CSS application path or network authority.

All 195 targeted regressions pass, including raw CSS calls, both project output
integrations, foreign references, scoped observers/input, and inherited markup.
The project loader tests also require rejected replacements to preserve the
existing application. This is a concrete containment fix, not a full CSS audit.

The next selector audit must cover contextual predicates such as `:has`, `:is`,
and `:not`, plus DOM `querySelector`/`matches`: an in-scope matching element does
not imply every ancestor/sibling inspected by a selector was in scope. Replacing
prefixing with `@scope` alone would not prove that property; the
[CSS cascade specification](https://drafts.csswg.org/css-cascade-6/#scoped-rules)
explicitly leaves non-subject selector context unrestricted. This must be
resolved without treating a returned in-scope node as proof of complete query
isolation or quietly moving guest selector parsing into a large host parser.

The rebuilt `cd6acdb` export passed all 151 manifest entries, compressed backend
execution, and browser checks for all four stored owner projects (including 50
tour slides and SQLite fragment navigation). Post-build language/artifact tests
and the large-input workspace test also pass. The local server now serves this
build. A read-only owner Playwright session verified divider dragging and
invalid-to-valid font CSS recovery with 144 Mahjong tiles and no page errors;
all three autosaves were intercepted. Desktop/light and phone screenshots were
reviewed. `/root/resources-bunny.tar.gz` contains the verified export, with its
predecessor archived under `/root/archive/2026/09/10/`. Nothing was deployed to
Bunny. Large native insertion remains slow (about 43 seconds for 110 KB in this
stress run), and the broader containment audit remains open.

### Range intervals and selector-context audit

Raw-guest probes found that ranges with endpoints in two different granted
roots could measure or select intervening private host content. The same gap
existed when extending a selection forward or backward. The host now requires
the range's common ancestor to be granted as well. Selection extension checks
the shared subtree before changing the browser selection, preserving the old
selection on rejection. There is no new reference type, wire operation, DOM
mirror, or guest-specific exception.

Thirty-three browser cases cover separate roots, a root plus a portal, a single
root, and document mode. Four measurement paths, adding a range, and extension
in both directions are exercised. A container's document service reference also
cannot be used as the target of `Selection.collapse`; a document-mode guest can
still do so. The wider regression run has 229 passing
tests, including native/MicroQuickJS text drag, undo/redo, caret blink/repeat,
lazy language loading, and prior reference/markup boundaries.

Four selector-context probes are deliberately marked TODO and are **not**
passing containment coverage. CSS `body:has(+ [data-private="yes"])` can detect
a neighboring host attribute after root remapping. Native `querySelector`,
`matches`, and `closest` can detect a host ancestor's attribute while matching
an owned paragraph. These are confirmed confidentiality gaps, not merely
unexplored syntax. Their tests must eventually pass without TODO. Any remedy
must preserve useful in-scope selectors and keep guest parsing responsibilities
out of a growing host CSS parser; simply checking the returned node or wrapping
the stylesheet in `@scope` does not solve the contextual access.

The final focused run passes 51 tests with those same four unresolved selector
probes (55 total). The local server serves the range checks, and a read-only
owner session verifies modern JavaScript edits, divider dragging, and recovery
from malformed font CSS with all 144 Mahjong tiles and no page errors. Its
autosaves are intercepted; it does not change stored project content.

Export `b82b179` reuses the just-rebuilt, unchanged guest/backend Wasm artifacts
and rebuilds the two browser host bundles after the final selection check. Its
151-file manifest and compressed backend execution pass. Exported-asset browser
checks pass for Mahjong, Cat Memory, 50 tour slides, and SQLite fragments with
theme/viewport changes. `/root/resources-bunny.tar.gz` contains that verified
export; `cd6acdb` was archived under `/root/archive/2026/09/10/`. This is an
updated development artifact, not clearance of the selector release gate or a
Bunny deployment.

The live recovery screenshot also prompted a split-layout measurement. Both
dividers move and retain the same `--source-width` after editing; the toolbar is
not frozen. At a 1170 px workspace width and 56.5812% split, its divider is at
662 px while the workspace divider is at 663.984 px. The workspace's explicit
`calc(var(--source-width, 50%) + 2px)` is absent from the toolbar. Add an alignment
assertion across initial layout, pointer/keyboard resizing, and output refresh,
then use the same column definition rather than another compensating offset.

That alignment regression is now covered and fixed: toolbar and workspace use
one grouped `grid-template-columns` declaration. The new test first failed at
585/587 px, then passed initial layout, mouse resizing in both directions,
keyboard resizing in both directions, output refresh, and expanded-view return.
The whole workspace stress test and all 20 appearance tests pass. Desktop/light
and phone screenshots were reviewed. Read-only live measurements put both
dividers at exactly 660 px after dragging and after subsequent CSS edits, with
all 144 Mahjong tiles recovered and no page errors. The large native insertion
is still slow (49.6 seconds for 110 KB in this run); this layout fix makes no
performance claim about that operation.

### Semantic selector prototype

The new, unconnected `selector-renderer.ts` in the machine's DOM device area
accepts semantic parts instead of parsing selector text. It constrains every
compound and nested predicate, not only the final matched node. Scope guards
are zero-specificity; internal sibling relationships remain native, while roots
cannot inspect host siblings or their own host-relative child position. Mixed
`:has` alternatives retain legal descendant branches. Twenty browser tests
cover the known context probes, valid alternatives, document mode, positional
rules, pseudo-elements, quoting, malformed data, and bounds. The TypeScript
machine build passes.

This renderer is not imported by the live DOM device yet and therefore does
not add production execution overhead or close the four live TODO cases. Next
comes guest-side source parsing/caching, a bounded selector wire format, and
using the same semantic renderer for stylesheet and DOM-query calls. Raw guest
calls must not retain a bypass around those checks. Run the existing selector
corpus and native/guest parity tests before switching the live path; do not
replace accurate browser behavior with cloned trees or a large host-side source
parser just to make the new tests pass.

The `1571583` development export includes the shared split rule and reuses the
unchanged runtime artifacts. All 151 manifest entries, compressed backend
execution, and exported-asset checks for all four owner projects pass. The
verified `/root/resources-bunny.tar.gz` is refreshed; its predecessor is in
`/root/archive/2026/09/11/`. No Bunny deployment was performed. The experimental
selector renderer is not on this export's execution path. Before integrating
it, extend the native parity checks to cascade specificity and root-tag
remapping as well as matching results; correct matching alone does not prove
that competing declarations retain their original precedence.

The follow-up browser comparison reproduced a precedence error in the
prototype: translating a `body` type selector into the scope class let it beat
an ordinary class rule. The renderer now remaps the root with zero-weight
matching plus the original type weight. Native/scoped competing-rule checks
pass in both source orders. This changes the prototype, not the live export.

The guest selector parser and semantic wire writer now exist in
`packages/project-editor/src/constrained-selector.js`; the machine prototype
has the matching bounded reader. No CSS source parser was added to the host.
The parser executes directly in MicroQuickJS without Babel. The focused suite
passes 27 tests, including truncated-message rejection, native matching,
cascade comparisons, and acceptance of 247 selectors from the Cat Memory,
Mahjong, SQLite reader, and initialized native CodeMirror styles. The host
prototype separately passes TypeScript checking. These are preparatory tests,
not proof that the live selector boundary is fixed.

Next, connect the stylesheet and query consumers together, remove the old
scoped raw-string entry points, and rebuild the guest artifacts. Queries on
detached owned nodes need explicit parity coverage: adding only an in-document
scope guard would incorrectly make those queries return no match. Keep the
four raw-Wasm context probes unresolved until they exercise the integrated
protocol and pass, then rerun the full editor/game and deployment checks.

### Integrated selector boundary and iframe cascade

The stylesheet and DOM-query consumers now use the semantic selector reader
and renderer. Stylesheet version 5 replaces raw selector text with the counted
selector format; DOM query methods require bounded selector bytes. Old raw
string queries are rejected. All guest environment builders prepend the same
ES5 parser/writer, and the site runtime artifacts were rebuilt together.

The four former raw-Wasm context probes now pass without TODO markers:
changing private host attributes does not affect the `:has()` style or the
`querySelector`, `matches`, and `closest` results. Additional raw-Wasm tests
cover pre-insertion, attached, and removed-tree queries, plus deliberate raw
string bypass attempts. Wholly granted detached trees use native context,
without temporary attribute mutations. The broader run passes 239 tests,
including native/MicroQuickJS caret and text dragging, lazy language bytecode,
direct and iframe output, markup, references, ranges, and mutations.

The saved presentation exposed a missing `::backdrop` case that the initial
selector corpus lacked. Its actual reset-dialog selector now has coverage and
is allowed for owned dialogs. The rebuilt export then passed all four owner
projects, including 50 successive tour slides, embedded keyboard navigation,
SQLite fragments, desktop/mobile views, and system theme changes.

Screenshot review also exposed a cascade regression in the iframe scaffolding:
the host `.project-output-root` minimum-height rule outranked the newly
type-specific guest `body` rule. Making the default `:where(...)` gives it zero
specificity; application dimensions win. The module fixture now includes the
real frame CSS and uses standards mode. Before the fix, an app asking for
`100vh` had a 22px surface in a 150px viewport; the corrected module tests pass.
The saved Mahjong now measures 798px for both its surface and iframe viewport.
The host hidden-state rule is unchanged.

Read-only live editing also passes modern JavaScript input, pointer-based split
dragging, and malformed-to-valid font CSS recovery with all 144 tiles, aligned
toolbar/workspace dividers, and no page errors. Three autosaves were intercepted;
no saved project content was changed. Large native text insertion remains a
separate performance issue, not resolved by this selector work.

Final development export `2c545b8` includes the iframe cascade fix. All four
owner-project checks pass again, along with the compressed backend in Deno and
all 151 manifest entries. The first-paint/navigation appearance suite passes
15 tests across desktop/phone, explicit and system themes, and missing or
unavailable preferences. `/root/resources-bunny.tar.gz` now contains this
verified export; extraction was verified before replacing the archive. Its
predecessor is preserved at
`/root/archive/2026/09/11/resources-bunny-1571583-before-semantic-selectors.tar.gz`.
The local server is updated. No Bunny deployment was performed.

### September 11 selector simplification and input controls

A fresh DevTools timeline on the integrated selector build inserted 109,485
characters in 67 seconds. It recorded 8,092 layouts (27.8 seconds), 8,094
style/layout-tree updates (9.5 seconds), and 4,000 native input events. These
overlapping event and callback durations must not be added to layout costs.
The trace is outside the repository, with no instrumentation in the shipped
host. A separate, unprofiled native CodeMirror control in the captured workspace
inserted 109,473 characters in 27.3 seconds, verified the exact document, and
retained the 585 by 798 pixel editor. This control has native CodeMirror setup,
not the whole Resources application; it establishes a browser-side cost, not
an exact estimate of Wasm overhead. An earlier control hit its diagnostic
deadline before checking the document and is not accepted as a passing run.

The semantic renderer now places its zero-specificity ownership guard after
each compound and before the optional pseudo-element. A redundant outer
`:is()` is unnecessary when the type selector stays first. This makes the
rendered CSS simpler without dropping any compound or predicate boundary.
All 44 parser, native-cascade, and live guest containment checks pass, including
host ancestor/sibling probes and root type specificity. An unprofiled pair
took 33.6 seconds with this change and 34.9 seconds with the prior host;
first-page insert/backspace pair medians were 238 and 217 ms respectively.
These variable samples do not establish a performance improvement. Keep the
change for simplicity, not as a claimed fix for the large-insertion slowdown.

A separate first-page typing profile after clipboard paste attributed 86% of
its samples to guest delivery, unlike the bulk-input timeline dominated by
native browser work. That is the next profiling distinction to preserve:
optimizing ordinary editing and optimizing a multi-thousand-line native input
operation are not interchangeable. Live-owner diagnostics intercepted saves
and left stored project contents unchanged.

The full editor regression passes with the simplified host: exact edits,
undo/redo, lazy language loading, scrolling, theme changes, output recovery,
and pointer/keyboard pane resizing. Its 110 KB paste took 1.05 seconds and
native insertion took 34.4 seconds. Light/dark screenshots were inspected.
Export `baa22c7` passes all 151 manifest entries, compressed backend execution
in Deno, and the four stored owner-project checks, including 50 tour slides,
SQLite fragment navigation, and the 798-pixel Mahjong iframe surface. The
local server is updated, and `/root/resources-bunny.tar.gz` contains this
export, verified again after extraction. The prior `2c545b8` archive is in
`/root/archive/2026/09/11/`. Nothing was deployed to Bunny. Large native input
and the previously documented pre-observer mirror parity gap remain open.

### September 11 synchronous sibling reads after the scan optimization

The sibling parity test now reads immediately after a native reorder and after
removal from a retained detached subtree, before yielding to MutationObserver.
Both language-loading variants failed with the mirrored getters. Direct native
`nextSibling` and `previousSibling` forwarding passes them, preserving wrapper
identity and excluding the host siblings beside the granted root. The host uses
the same grant check as parent reads; no new wire operation or event scheduler
is needed. The test also covers a native insertion not yet observed by the
guest, so it cannot pass solely by returning wrappers already in its mirror.

The previous direct-read experiment predated the bounded large-mutation scan
in CodeMirror. With that scan in place, an uninstrumented new/old pair using
the same host and 109,485-character input took 20.1/19.6 seconds. Subsequent
first-page insert/backspace medians were 133/133 ms. Both checked exact source
and no page errors, with stored-project writes intercepted. This small sample
supports retrying the fidelity fix, not a speedup claim. No per-read mirror
invalidation, extra observer, or changed event-delivery timing was introduced.
Other mirrored properties still need their own pre-observer parity checks;
this change does not make the entire guest DOM immediately native.

The integrated rebuild passes 43 regression checks covering both language
delivery modes, new-node identity, native mutation records, caret blinking,
text dragging, undo/redo, disposal, iframe output, reference containment, and
bytecode/source parity. The full project editing workflow passes too: its
110 KB paste took 0.89 seconds and native insertion took 29.7 seconds. The
scrolled editor screenshot was inspected. After restarting the local server,
the read-only owner check again passes divider dragging and invalid-to-valid
font CSS recovery, with 144 tiles and three intercepted autosaves.

Export `8dbeaa1` passes the four stored projects, including 50 tour slides,
SQLite fragment navigation, theme changes, compressed backend execution in
Deno, and all 151 manifest entries. `/root/resources-bunny.tar.gz` contains
this export, verified after extraction; the previous `baa22c7` archive is
preserved under `/root/archive/2026/09/11/`. No Bunny deployment was performed.

### September 11 native parent and endpoint relationships

Extending the pre-observer probes exposed stale `firstChild`/`lastChild` values
after native insertion/reordering. The wrapper-based `parentElement` check
also treated a DocumentFragment wrapper as an element. Public parent and
endpoint getters now forward native reads alongside siblings, through one
shared guest getter definition. The host adds only `firstChild` and `lastChild`
to its existing related-node read list; returned references retain the same
grant check. Internal child bookkeeping remains separate from these public
reads, and collection/text caches are not claimed to be immediately native.

The probes cover native moves into a previously unknown owned parent,
removal from detached subtrees, a fragment's distinct parentNode/parentElement
behavior, and root ancestor exclusion. A document-mode probe additionally
failed because the identity table did not contain the existing guest document.
Registering that permanent wrapper makes `documentElement.parentNode` return
the same document instead of constructing another wrapper. All 21 focused
language/reference checks pass, including direct attempts to read children
of ungranted nodes. No observer scheduling or delivery semantics changed.

Before integration, an uninstrumented new/old pair inserted the same 109,485
characters in 20.6/19.9 seconds, with first-page insert/backspace medians of
147/134 ms. This is an accuracy fix, not a demonstrated speedup. Exact source
and error checks passed, and all live-owner writes were intercepted.

The integrated build passes 209 regression checks, including inherited-markup
containment, reference grants, both language delivery modes, document identity,
native mutation records, caret/dragging behavior, disposal, iframe output, and
source/bytecode parity. The full project editing workflow passes with a 0.84
second 110 KB paste and 23.7 second native insertion. The light-mode editor
screenshot was inspected. The 15 first-paint/theme checks pass on the rebuilt
site, and live-owner editing recovers from invalid CSS with 144 Mahjong tiles,
aligned dividers, no page errors, and three intercepted autosaves.

Export `6e52623` passes all four stored projects (including 50 tour slides and
SQLite fragment navigation), compressed backend execution in Deno, and all 151
manifest entries. The local server and `/root/resources-bunny.tar.gz` use this
build, and archive extraction was verified before replacement. The previous
`8dbeaa1` archive remains under `/root/archive/2026/09/11/`. Nothing was deployed
to Bunny. Collection and text-cache fidelity remain separate open work.

### September 11 synchronous text reads

The text probe failed in both language delivery modes: after native mutation
without an observer, the guest kept returning the original text. Text getters
now read through the existing synchronous bridge, flushing pending guest writes
first. There is no extra host permission, observer, or invalidation mechanism;
the obsolete text cache and its observer invalidation are removed. Nullable
text setters also send empty text for null rather than the literal `"null"`.

The focused browser checks cover unobserved mutations, reads before observer
delivery, retained detached text, old mutation values, and pending guest writes
through both properties. They pass for stamped and downloaded language modules.
An uninstrumented new/old pair inserted the same 109,485 characters in
20.1/20.4 seconds, with first-page insert/backspace medians of 149/154 ms.
Exact source and error checks passed; owner writes were intercepted. This pair
shows no obvious added cost, not a statistically established speedup. The large
native-input delay remains. Collection and attribute caches still need
independent fidelity checks.

The rebuilt site passes 209 integrated regression checks and 15 first-paint/
theme cases. Text coercion is compared directly with browser setters, including
Unicode, empty strings, null, undefined, numbers, and booleans. The integrated
workflow preserves exact text and undo/redo after a 110 KB paste (0.88 seconds)
and native insertion (24.3 seconds). Light/dark editor and both game screenshots
were inspected. The restarted local server passes modern JavaScript editing,
aligned divider dragging, and invalid-to-valid CSS recovery with 144 tiles,
no page errors, and three intercepted autosaves; stored owner data is unchanged.

Export `d1d8d45` passes all four stored-project loading checks, 50 consecutive
tour slides, SQLite fragment navigation, and compressed backend execution in
Deno. All 151 manifest entries also pass after archive extraction.
`/root/resources-bunny.tar.gz` contains this build (33,964,779 bytes); the
previous `6e52623` archive is preserved under `/root/archive/2026/09/11/`.
Nothing was deployed to Bunny. This is an integrated accuracy checkpoint,
not a claim that the entire performance and DOM-fidelity goal is complete.

### September 11 complete presentation traversal and disabled controls

A read-only owner traversal reached all 387 stored tour slides at 1440×900,
in the split project workspace. No script errors or measured slide-content
overflow occurred, and the live document peaked at 694 elements rather than
accumulating a copy of each slide. The final assertion failed, however: Next
was not natively disabled on the last slide.

The shared guest environment lacked a `disabled` property. Assigning it made
an ordinary JavaScript property without changing the browser control. This also
affects the workspace Save button and tab-scroll arrows. The new accessor uses
the existing guarded attribute operations: presence means true, truthy writes
set the attribute, and false writes remove it. Native presence is read directly
so externally changed attributes are visible before observer delivery. No new
host API or permission is needed.

Both MicroQuickJS language modes reproduce the missing reflection and pass
with the accessor. QuickJS form checks also reproduce it; their rebuilt-artifact
checks now pass, including native clicks on disabled/re-enabled buttons. All 209
integrated regression checks pass, with new assertions that Save is natively
disabled after loading a saved project and enabled after an edit.

The rebuilt split tour passes all 387 slides, the navigation boundary states,
notes editing, and history. A separate cold-start expanded-view attempt exposes
an open startup gap: output can become ready before project services install
the toolbar listeners, and an early Expand click is lost. The ready-workspace
layout traversal waits for project controls; it does not certify this earlier
interval. Fixing that ownership/readiness handoff remains required.

After readiness, expanded view also passes all 387 slides, boundary buttons,
notes, and history. Phone traversal reaches all slides without script errors,
but **160 slides overflow**. A representative failing slide (4) also overflows
when the exact saved project runs natively at the iframe's 390×688 dimensions.
Its `wide-code` layout retains the more-specific desktop two-column rule:
the portrait override only names ordinary, compact, and dual layouts. Narrow
reading columns then wrap into very tall paragraphs. This is an application
stylesheet problem, not evidence for relaxing the Machine's CSS boundary.
The phone presentation layout still needs correction and a complete recheck.

The updated site passes the 15 appearance/first-paint cases, all four exported
project loading checks, and compressed backend execution in Deno. These green
checks do not erase the two wider interaction/layout failures found by the
new traversal. Read-only diagnostics are in `/root/macchiato-work/` under
`tour-full-audit-*` and `tour-native-layout`; no stored owner project was saved.
The local server and `/root/resources-bunny.tar.gz` use export `1344f49`;
the archive's 151 entries were verified after extraction. The previous
`d1d8d45` archive is under `/root/archive/2026/09/11/`. No Bunny deployment
was performed, and the broader readiness goal remains open.

### Expanded output before editor startup

The cold-start Expand failure has a deterministic regression: hold the editor
Wasm download while allowing the output to become ready, then click Expand.
The previous build loses that click. Page-level expanded-view controls now
belong to the outer frontend guest, installed before it asks the controller to
mount the editor child. Project editing, history, and output management stay in
the editor guest. No UI handler or additional permission was added to the
Machine host.

The regression expands and closes the existing iframe before CodeMirror loads,
then leaves it expanded across editor startup. It verifies frame identity and
full-viewport dimensions, with a screenshot at the held-download checkpoint.
The updated build passes all 209 integrated regression checks, including the
remaining editing, selection, disposal, language, form, and artifact checks.
This fixes Expand's early ownership gap, not every toolbar control's readiness,
and does not address the portrait tour overflow documented above.

The tour's expanded keyboard check exposed a second issue: focusing the iframe
can leave its native body active, outside the guest's granted application div.
Scoped keyboard delivery correctly refuses that target. The iframe controller
now forwards native frame activation to its active output session; the guest
focuses its application surface only when no permitted element is focused.
This preserves focused inputs and their selections, does not activate a staged
replacement, and leaves the Machine's input-scope checks unchanged.

The final build passes the 209-check suite again, the four read-only exported
project checks (including expanded tour keyboard navigation), and compressed
backend execution. Appearance/first-paint checks passed all 15 cases before
the additional focus handoff. The local server and
`/root/resources-bunny.tar.gz` now use export `fddc662`; its 151 files were
verified after extracting the archive. The previous `1344f49` archive is in
`/root/archive/2026/09/11/`. No Bunny deployment or owner project save was made.
After restarting the local server, the editing smoke check also passes modern
JavaScript, divider dragging, and invalid-to-valid CSS recovery with 144 tiles
and no stale warning or page error. Its three autosaves were intercepted.

### Tour portrait layout

The saved tour and its external source repository had identical stylesheets.
The portrait rule omitted `wide-code`, leaving the desktop two-column layout
active. A full-width reading column removes the 160 overflowing slides found
earlier. Compact portrait gutters, directory-card spacing, and chapter headings
also remove internal scrolling; empty range captions no longer consume space.
No slide, narrative, canonical source line, or reading-state key changed.

The tour repository records these changes as `8e8aa7d` and `0f2376a`. Its layout
test now includes visible text bounds and chapter scrolling, at 1440×900,
1168×760, 585×760, and the phone output's 390×688 effective pixels. All four
complete native traversals pass. A separate 387-slide traversal in the Wasm
phone output also passes, including notes, history, navigation boundary states,
and a maximum of 694 DOM elements with no errors or external writes.

The current project was still identical to its published snapshot. A guarded
update changed only `style.css` and the exact embedded copy in
`presentation.html`, creating and publishing version 25. The complete previous
snapshot is archived at
`/root/archive/2026/09/11/dom-use-tour-before-portrait-layout.json`. All other
files and configuration are unchanged. The external repository's modified
`notes.md` was not touched or committed; tests use isolated session state.

The saved version subsequently passes all 387 slides in split, expanded, and
phone output views, with no script errors, overflowing content, scrolling, or
DOM accumulation. Screenshots of the dense readings, directory tree, and code
comparisons were inspected at phone size. The exported standalone presentation
has also been regenerated from the same unchanged source snapshot and updated
stylesheet. This resolves the previously identified 390×688 portrait failure;
it is not a claim that every possible viewport or all broader editor issues
have been verified.

The refreshed Bunny export is `57911ab`. Compared with `fddc662`, only the
standalone tour HTML, manifest, and edge revision marker changed; all runtime
artifacts are byte-identical. Its 151 files pass verification after archive
extraction, and compressed backend execution passes. The generated standalone
HTML, exported copy, and live `blog-examples.localhost` response share SHA-256
`6a5700e4abd79cc1ea3bf81ff03b2594c5c441199d8655126024131434628cef`.
`/root/resources-bunny.tar.gz` has been replaced, with its predecessor archived
under `/root/archive/2026/09/11/`. Nothing was deployed to Bunny.

An additional check found that requesting that large standalone HTML at the
`resources-edge` origin returned 503 (`Edge application unavailable`), while
its configured `blog-examples` origin returned 200. The initial inference that
this was a wrong-origin request was incorrect: the Edge manifest permits the
artifact. The deferred response failure is explained below.

### Deferred document response headers and filename routes

The document response crosses the server machine's header policy even when
its body stays outside the guest. Published example responses include CORS,
and storage responses can include ETag and Last-Modified. Those three headers
were missing from the document policy. They are now explicitly allowed;
arbitrary extra headers still fail closed. Tests exercise GET and HEAD through
the actual MicroQuickJS routing guest, including the validator headers.

A separate 503 came from treating filenames such as `/favicon.ico` as account
names. The application planner now checks the namespace/project name grammar
before querying their stores, leaving filenames to the normal static-manifest
lookup. It preserves valid mixed-case lookup, percent decoding, and embeds.
Both source tests and the rebuilt QuickJS application cover these paths.

After rebuilding and restarting local Resources Edge, GET/HEAD of the tour and
Markdown example return 200 with their CORS header. Missing filename paths
return 404, with no HEAD body. The saved tour project still returns 200. The
new compressed Bunny backend also executes successfully under Deno. Neither
the DOM/network capabilities nor public artifact authority were broadened.

The broader regression run completed with 86 passes and 19 failures. Some
checks still target retired modules, old iframe selectors, or the former
default dark theme; others require investigation. This is not a clean overall
suite or a declaration that staging is ready. In particular, save/close,
account interactions, and the remaining example/UI tests need current-browser
verification instead of blanket expectation changes.

The custom-build, Vue/Svelte, and graphics tests were targeting the outer
document or a retired frame class. They now inspect the active root inside the
output iframe. Custom build output, reactive framework counters, Canvas paint,
WebGL/Three.js pixel checks, and WebGPU readiness all pass. The editor's repeated
theme-switch test also passes with the current shared gutter palette rather
than the old One Dark gutter value.

The close-link check found a real bug: `close.href = ...` only assigned a guest
wrapper property, leaving the native anchor unchanged. The application now uses
its supported `setAttribute` API. Server-rendered project close links also start
at `/`, not `/projects`, before the guest loads. A browser regression first
reproduced the stale link, then verified the saved return path, actual navigation,
and stack removal after the fix. This checks a restored stack; recording every
entry path and command-palette transition still needs separate coverage.

The combined rebuild passes 67 backend tests, five focused browser tests, and
16 editing/first-paint tests. The latter cover desktop and phone, explicit and
system appearance, unavailable/invalid preferences, and document navigation.
Screenshots show matching light loading surfaces and separate centered spinners;
scrolled source remains rendered with aligned gutters. Large-input performance
is still an open issue: this run pasted 108,261 characters in 839 ms, but native
insertion of 108,287 characters took 22,049 ms. Passing the editing stress test
does not make that latency acceptable or close the broader goal.

Export `66294b0` contains these fixes. Its compressed backend executes in Deno,
and all 151 deployment files verify after archive extraction. Read-only owner
checks using that export's browser artifacts pass for Mahjong, Cat Memory, the
tour (50 slides plus embedded/expanded keyboard navigation), and SQLite's
fragment navigation, without missing assets or project writes. The local server
uses the rebuilt artifacts. `/root/resources-bunny.tar.gz` now contains this
export; the previous `57911ab` archive is retained under
`/root/archive/2026/09/11/`. Nothing has been deployed to Bunny, and the remaining
broader-suite failures and performance/fidelity work are not waived.

### Workspace recovery and ordinary account interactions

The account-form browser checks exposed an ownership gap: title-to-name
generation lived only in the project editor guest. Organization forms now
initialize the same small helper in the outer guest, without loading an editor.
The complete organization/invitation/notification/role/username workflow passes
in Chromium. Manually chosen names survive subsequent title edits.

Mobile view switching now moves Details and Close out of the info pane before
hiding it. CodeMirror's standard Find/Replace panel no longer inherits the
retired single-row search layout; real replacements and control bounds pass in
both themes at desktop and phone widths. These are native CodeMirror controls,
not a replacement search implementation.

“Save with title” required `HTMLFormElement.requestSubmit`. The guest now
forwards that method through the host's existing form-navigation guard. Native
validation and submitter values are preserved. Document and element tests also
exercise denied submission, including stopped propagation; `submit()` remains
unavailable because it bypasses validation and submit events.

The recovery test initially appeared to lose edits after reload. Direct checks
proved that both the pending session snapshot and the eventual editor contents
were correct. A browser-only startup observer then reproduced the real problem:
the bootstrap first rendered the superseded server contents. It now defers the
first CodeMirror render to the project UI's selected/recovered snapshot. The
regression verifies that only the recovered contents appear during startup,
alongside titled publication, session recovery, and the constant Save project
label. This check covers the editor, not every output-recovery paint sequence.

Public project cards also exposed a missing guest `childElementCount` getter.
It now reads the already-supported native property synchronously, including
native changes before observer delivery. Card and palette-search destinations
use `setAttribute`, not unsupported guest `href` expandos. Actual click-through
tests pass without loading the editor machine.

Export `da43c0b` passes 209 editing/containment checks, 67 backend checks, five
focused account/workspace browser tests, and 15 appearance checks. Its compressed
backend executes under Deno and all 151 deployment files verify after archive
extraction. Read-only owner checks cover Mahjong, Cat Memory, the tour (50 slides
and expanded/embed keyboard navigation), and SQLite fragment navigation using
the exported assets. Screenshots of the desktop and phone projects were reviewed.

The local server is running these rebuilt artifacts. The handoff archive is
`/root/resources-bunny.tar.gz`; its previous `66294b0` revision is retained in
`/root/archive/2026/09/11/resources-bunny-66294b0-before-workspace-recovery.tar.gz`.
Nothing was deployed to Bunny. Large native insertion remains slow: 106,458
characters took 20,462 ms in this run, while paste took 841 ms for 106,432
characters. This is not a matched performance comparison with the earlier
fixture. The remaining broad-suite failures, full close-stack recording, and
public DOM collection fidelity still require work; the overall goal stays open.

### Dialogs, form ownership, and recoverable output failures

Further ordinary-page checks found two missing native reflections: dialog
`open` and a form control's `form` association. The guest now reads both from
the browser. Associated forms are returned only within the machine's granted
roots; no new navigation permission is implied. Palette Escape handling and
instant language changes now pass the browser interaction check.

RGB colors use the same semantic function/value checks as RGBA. An invalid
project build now reports through the output status channel, not the fatal
editor-runtime channel. The five-second error delay is retained. Browser
coverage verifies that a rejected document leaves the previous output alive,
the status rail follows the visible pane, and a subsequent valid edit recovers
without reloading. Nested asynchronous rejection also has a small independent
MicroQuickJS regression.

The SVG template exposed two separate issues: resource compaction discarded
the entry markup as an image dependency, and guest `createElementNS` lowercased
case-sensitive SVG names. Entry source now reaches the normal compiler, and
namespaced element names retain their casing. This does not bypass either the
compiler or the host's SVG allowlist. Non-entry image bytes still stay out of
the compiler machine.

Checkpoint `72f4598` passes all five template previews, the output rejection and
recovery interaction, and the outer-page keyboard/language/account check. It
also passes 43 focused compiler/DOM/runtime tests and 67 backend tests. Its
compressed backend runs in Deno, and all 151 deployment files verify after
extracting the handoff archive. Read-only exported-asset checks cover the four
owner projects, both themes, 50 tour slides, and SQLite fragment navigation;
no project data was saved. SVG and output-error screenshots were reviewed.

The local server has been restarted with these artifacts. The archive at
`/root/resources-bunny.tar.gz` now contains this checkpoint; the previous one is
`/root/archive/2026/09/11/resources-bunny-da43c0b-before-output-recovery.tar.gz`.
Nothing was deployed to Bunny. These checks do not close the outstanding large
insertion performance, collection fidelity, or broader workspace-flow work.

### Bulk-input performance investigation

The bulk-input comparison runs the same generated editor and HTML language
sources natively and in MicroQuickJS, in one Chromium process with separate
page contexts, a fixed 1440×900 viewport, and native/Wasm/Wasm/native order.
Both get an input warmup and the same 106,432-character inert HTML document.
This is not a comparison of different editor configurations or load times.

In the initial run, native `insertText` took 6.1–6.4 seconds and MicroQuickJS
took 8.1–8.2 seconds. Chromium dispatched one `beforeinput` and 3,874 `input`
events in both. Each editor produced one document change with correct text,
undo, and redo. Paste used a different browser path: approximately 34 ms native
and 700 ms in MicroQuickJS. These measurements concern very large insertion,
not ordinary keypress latency.

The complete workspace still took 21.3 seconds without video capture, so video
overhead did not explain its difference from the isolated editor. An opt-in
DevTools trace recorded about 7.5 seconds of layout and 2.6 seconds of style
recalculation across roughly 7,800 layout passes. Most passed through the whole
document. CPU samples attributed most remaining time to browser work rather
than interpreter execution. These categories can nest and are not additive
end-to-end timings. Profiles and traces are test-only; the production host has
no added observer or profiler. Layout alternatives are being measured before
changing the shipped workspace.

The follow-up first-page typing check enters a phrase, makes a typo, and
corrects it using actual key events, checking the complete document after each
one. With the 106 KB document, key actions took 5–7 ms native and 53–64 ms in
MicroQuickJS. This makes the remaining interpreter cost visible rather than
mistaking the bulk browser insertion cost for normal typing performance.

Experimental `size layout style` containment and pane-relative absolute
positioning did not show a decisive benefit, so neither was applied to the
production stylesheet. A fixed-position diagnostic improved the synthetic
insertion more, but it is not a suitable responsive pane implementation. These
are explicitly opt-in test variants, not alternate production layouts.

The name-generation helper now binds to its title/name controls rather than
delegating every document input event. CodeMirror events still follow their
normal path, but no longer invoke unrelated form validation. A repeated prior
editor-artifact run took 18.7 seconds versus 17.7 seconds in the first scoped
run; earlier baseline runs were 19.8–21.3 seconds. This is a modest improvement,
not evidence that the workspace's bulk-insertion delay has been eliminated.

The scoped run repeated at 17.8 seconds with no other tests or builds running.
The final correctness run also checks automatic project naming explicitly.
Five account/editor workflows, the complete editing stress scenario, 43
compiler/DOM/runtime regressions, and 67 backend checks pass. Export `fdacacc`
passes the Deno compressed-backend test and all 151 deployment-file checks.
Read-only browser checks cover Mahjong, Cat Memory, the tour, and SQLite with
the exported assets. No owner project was saved during these checks.

The local server and `/root/resources-bunny.tar.gz` contain this checkpoint;
the prior archive is retained at
`/root/archive/2026/09/11/resources-bunny-72f4598-before-input-scope.tar.gz`.
Nothing was deployed to Bunny. Remaining bulk-layout latency is still an open
performance item, alongside the previously noted DOM collection fidelity and
broader workspace-flow coverage. The profiler and layout variants remain
opt-in test instrumentation only.

### Live attribute reads

`getAttribute()` now flushes pending guest writes and reads the current native
value. Previously its positive and negative caches survived browser-side
changes. That could disagree with the already-live `hasAttribute()`, and a
later `classList.add()` could overwrite a class the browser had just added.
The fix is in the guest environment; the host's attribute and root checks are
unchanged. It also removes the negative-lookup cache.

The same application fixture runs natively, in MicroQuickJS, and in QuickJS.
All three now agree when attributes are added, removed, and changed natively,
when pending guest writes are read immediately, and when a guest adds a class
after a native class change. Mutations and reads share one browser task, without
depending on an observer callback to repair the values. The old MicroQuickJS
environment fails this test, including overwriting the native class.

Matched 106 KB editor comparisons retain correct paste, bulk input, first-page
typing, typo correction, undo, and redo. Native bulk insertion remains around
6 seconds; MicroQuickJS remains around 8 seconds. Repeating with the previous
environment also shows occasional 94–105 ms key actions, alongside the usual
roughly 55–65 ms actions. These runs do not isolate a new keypress regression,
nor do they establish that the outstanding performance work is complete.
The prior-environment override exists only in the benchmark.

Public `children`, `childNodes`, and attribute enumeration still need their
own live-collection work; fixing individual attribute reads does not establish
full DOM collection equivalence. The internal tree mirror continues to serve
connection/lifetime bookkeeping and must not become the authority for browser
changes that have not yet reached observer delivery.

The rebuilt checkpoint passes 43 focused caret/drag, mutation/reference scope,
callback, and form checks, plus the three-runtime attribute comparison. Five
workspace/account workflows, the full editing stress scenario, and 67 backend
checks pass. Native and MicroQuickJS text-drag screenshots match. Read-only
checks of the exported assets cover the four owner projects, both themes, 50
tour slides, and SQLite fragment navigation, without saving project data.

Export `15880ea` runs its compressed backend in Deno and verifies all 151 files
after extraction from `/root/resources-bunny.tar.gz`. The prior archive is
`/root/archive/2026/09/11/resources-bunny-fdacacc-before-live-attributes.tar.gz`.
No Bunny deployment was performed. This checkpoint fixes an observed stale
attribute bug, not the remaining collection or large-input performance work.

### Current child reads and duplicate leases

Fresh `childNodes` and `children` reads now use the host's existing checked
child-reference operation. They no longer expose the connection/lifetime
bookkeeping array. A shared native/MicroQuickJS/QuickJS fixture checks inherited
children, native insertion and removal, empty replacement, pending guest
appends, and native `normalize()` merging adjacent text. Reads and mutations
remain in one task, without observer delivery. Node identity, order, counts,
and first/last relationships agree in these checks.

The returned arrays are snapshots, not complete live `NodeList` or
`HTMLCollection` implementations. A retained collection and attribute
enumeration still need further work. This distinction remains explicit in the
guest implementation; the private mirror is not made authoritative again to
avoid boundary calls.

The MicroQuickJS bridge now releases duplicate reference leases directly,
matching QuickJS. The previous shim allocated an immediately unreachable
`HostReference` for each duplicate and waited for its finalizer. A test runs
the identical repeated lookups under both strategies: temporary-token
construction falls from 800 to zero while retained wrappers remain valid
through GC. Owning wrappers still use normal finalizers. This is a guest-side
use of the existing zero-length release control, not a host API expansion.

Large-document correctness still passes. Fresh child reads initially measured
about 814 ms for paste versus about 722 ms with the previous environment.
Direct release measured 704 and 896 ms in two subsequent passes; insertion
remains around 8 seconds and ordinary keys mostly 53–68 ms, with occasional
roughly 100 ms actions. These noisy timings do not prove an end-to-end CPU
speedup. The eliminated temporary allocations are verified independently.

The final checkpoint passes 55 focused browser/runtime checks, five
workspace/account workflows, the full editing stress scenario, and 67 backend
checks. Exported-asset checks cover all four owner projects, theme switches,
50 tour slides, and SQLite fragment navigation without saving project data.
Caret/drag and project screenshots were reviewed. Export `6ba99c6` runs the
compressed backend in Deno and verifies all 151 files after archive extraction.
The local server and `/root/resources-bunny.tar.gz` use this checkpoint; the
previous archive is retained at
`/root/archive/2026/09/11/resources-bunny-15880ea-before-live-children.tar.gz`.
Nothing was deployed to Bunny.

### One project output lifecycle

The project UI no longer includes the obsolete alternate DOM/iframe renderer.
Its bootstrap already owns compilation and output lifetime through the machine
devices; the UI now requests that path directly. This removes about 400 authored
lines and reduces the shipped UI bytecode from 209,652 to 164,028 bytes. The
combined editor Wasm shrinks by the same 45,624 bytes. The host is unchanged.

Output errors still go to the bootstrap before request-ID lookup: output IDs
and UI-service request IDs are separate namespaces and can collide. A regression
test delivers an output error while an import with the same ID is pending and
checks that only the real import response settles it. Artifact checks compare
the compiled UI bytecode with `project.bin` inside the shipped Wasm and reject
the obsolete renderer/iframe transport in the generated UI.

The final build passes 29 focused checks, five workspace/account workflows,
11 template/workspace scenarios, 20 first-paint/theme checks, and 67 backend
checks. Read-only exported-asset tests cover all four owner projects, 50 tour
slides, theme switches, and SQLite fragments; tour and SQLite screenshots were
reviewed. Export `b558e93` passes the compressed-backend Deno test and all 151
artifact checks after archive extraction. No Bunny deployment was performed.
Large-input comparisons use the previous 106 KB source explicitly, so removing
source lines cannot make the benchmark input smaller. The byte savings alone
do not establish a typing-latency improvement.

The final fixed-input workspace run passes with a 789 ms paste and a 19,653 ms
native insertion. Large native insertion remains an open performance issue.
The verified archive and local server were refreshed with this smaller UI.

### SVG accessibility survives compilation

The compiler previously discarded SVG `title` elements together with HTML page
metadata, leaving the logo template's `aria-labelledby` without a target. It
now preserves SVG titles and their namespace. HTML page titles stay outside
the output surface; SVG styles still become semantic CSS operations rather
than active style elements. No host permissions were added.

A failing-before/passing-after compiler test checks the title and the retained
rejection of foreign HTML. Browser tests check the accessible image name in
both direct and iframe QuickJS output, and through the actual Resources logo
template using the rebuilt compiler. The template screenshot was reviewed.
Thirteen focused checks and the five-template workflow pass. Read-only checks
again cover all four owner projects, theme changes, 50 tour slides, and SQLite
fragments using export `b280d85`. Its compressed backend runs in Deno; all 151
files verify. Nothing was deployed to Bunny.

### Output recovery before the first render

A startup observer in the output iframe reproduced a stale-output flash:
reloading with pending edits rendered the saved heading before the recovered
one. The outer guest now checks whether applicable recovery data exists and
asks the editor device to defer initial output in that case. The editor guest
still owns validation and snapshot selection; the host does not gain a second
recovery parser. The UI renders once it has selected the actual snapshot, even
if the recovery candidate was malformed or identical to the saved snapshot.

Ordinary opens keep the earlier output-first path. The full editing stress
test still proves that output works while the editor download is held, and
that expanded view does not need the editor to have finished loading. The
fixed 106 KB input passes paste, insertion, undo/redo, and subsequent editing:
paste took 769 ms and native insertion 18,710 ms in this run. This is not a
claim that the outstanding bulk-input latency has been fixed.

The saved-project reload test now observes only the recovered heading and
also covers malformed and unchanged candidates. A unit matrix covers stored,
session, memory-only, read-only, fresh navigation, reload, and unavailable
storage without duplicating the editor's validation policy.

An additional recovery defect remains: resource handles are currently
page-local numeric IDs, but pending session snapshots can contain them. A
small device-level reproduction stores an old tile reference, creates a new
resource device with a different tile at the same ID, and recovers the wrong
tile. Persistence must retain the referenced bytes or a durable identity, not
interpret an old reference through a new page's table. The probe uses synthetic
data only; no owner data was modified. Text-only recovery checks do not prove
resource-bearing snapshot recovery.

Checkpoint `be3cb8f` passes the recovery workflow, seven focused unit/artifact
checks, the complete editing stress scenario, and 20 first-paint/theme checks.
The recovered-output screenshot was reviewed. Read-only exported-asset checks
cover all four owner projects, 50 tour slides, theme changes, and SQLite
navigation. Its compressed backend executes in Deno and all 151 files verify
after archive extraction. The local server and `/root/resources-bunny.tar.gz`
use this checkpoint; the previous archive is retained at
`/root/archive/2026/09/11/resources-bunny-b280d85-before-output-recovery.tar.gz`.
No Bunny deployment was performed. Resource-bearing recovery and the broader
remaining goal requirements are still open.

### Durable project resource recovery

The page-local numeric-handle defect above is fixed. Resource handles are now
UUIDs, and pending snapshots and unsaved-project histories are stored in one
atomic session-storage record containing the unchanged guest JSON plus the
referenced resource bytes. Restoring the same handles preserves history splice
positions. Validation finishes before modifying the live resource table;
unknown old handles are never guessed from a new page's allocation order.
Ordinary storage keys and resource-free snapshots keep their existing format.

ZIP decoding must finish before resource compaction. Current `/api/projects/`
requests, as well as the older routes, materialize handles before saving and
compact returned snapshots. Native Create/Save form submission is another
explicit materialization boundary. Selecting a large file resolves that file
for display without copying all unopened assets into the editor application.
The guest fetch payload remains bounded at 2 MiB; after resolving resources,
a project request uses the server's 70 MiB serialized-project budget.

The outer page asks only whether recovery data exists. The editor requests the
record and receives either its value or an error as data: a host exception can
unwind Wasm and cannot be recovered by an ordinary guest JavaScript catch.
An unavailable recovery record stays in storage, the saved project still
renders, and an editor error explains the failure. The controller also passes
the actual navigation type. Guessing that every visit is fresh when the guest
lacks `performance.getEntriesByType` was deleting unsaved drafts on reload.

Browser coverage now imports a ZIP with a 70 KiB script and SVG, creates a
project, interrupts autosave, reloads its pending edits, checks server bytes,
exports the ZIP, opens the large source file, and publishes through the native
form. It also checks expired-handle preservation and an unsaved project's
resource-bearing history across reload. Every stored/exported file is compared
with the original bytes. These are disposable account fixtures; owner project
data is not changed. Unit coverage additionally checks atomic quota failures,
malformed/conflicting resource records, history patch replay, and requests with
resources larger than the guest transport budget.

This is not a general storage-error bridge or a new Machine Host feature.
Quota failures in ordinary guest storage writes still need browser-level
recovery coverage; the atomic host write test alone does not prove that UI
path. Resource-table lifetime and retained live DOM collections also remain
separate work, along with the broader performance/deployment goal.

Checkpoint `0351f98` is built and verified: fourteen focused unit/artifact
checks, both persistence browser workflows, twenty appearance checks, and the
four read-only owner-project checks (including fifty tour slides and SQLite
fragments). The compressed backend executes in Deno and all 151 exported files
verify again after tar extraction. The local server returns the same controller
bytes as this export. `/root/resources-bunny.tar.gz` contains this checkpoint;
the previous archive is retained under
`/root/archive/2026/09/11/resources-bunny-be3cb8f-before-durable-recovery.tar.gz`.
No Bunny deployment was performed.

The fixed 106,432-character editing stress case passes twice. Paste takes
785/795 ms; native insertion takes 22,989/24,316 ms. Those native-insertion
results are slower than the earlier roughly 19-second checkpoint, so this is
not a performance-win claim. A standalone 4,000-write probe of recovery
packing takes about 587 ms; checking for the required escaped NUL prefix first
takes about 300 ms. That overhead alone does not explain the bulk-input
difference. No speculative parser fast path was shipped; browser layout and
the complete native input sequence need another controlled profile.

### Grid-positioned CodeMirror surface

A controlled full-workspace trace with the fixed 106,432-character input shows
7,840 layout passes taking 8.55 seconds inside a 22.26-second native insertion.
The CPU profile attributes most time to browser work, not the Wasm bridge.
Adding layout containment alone leaves those document-level passes in place.

Positioning the editor mount absolutely within its first grid cell reduces the
trace's layout time to 4.77 seconds and the native insertion to 15.37 seconds,
without intercepting input or changing CodeMirror's execution model. The
mount's offsets are relative to its assigned grid cell, not hardcoded viewport
coordinates. An explicit ending grid line is necessary: leaving it automatic
would extend the mount over the separate error row. That error row stays in
normal grid layout, and image views still use the first row when selected.

The site stylesheet now expresses this placement. Only numeric `grid-column`
and `grid-row-end` declarations were added to the site's existing CSS schema;
there is no Machine Host or guest-runtime change. Browser coverage checks
Find/Replace in both themes at desktop/phone widths and verifies that a wrapped
error shrinks the editor, remains below it, and releases its space on removal.
The full editing stress case remains the behavioral check for native insertion,
paste, history, drag, undo/redo, responsive splits, and machine identity.

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

# `@macchiato-dev/project-editor`

`project-editor` is the project workspace shell. It coordinates project-level
navigation, reading and editing files, Output View, details, versions, drafts,
and the independently disposable editor and project runtimes.

This package owns the constrained editor guest as well as the project workspace
that decides which material is open, whether it is being read or edited, and
how that work participates in project history. The retired `code-editor-use`
prototype is not part of the runtime path.

Browser input goes to CodeMirror's own handlers inside the guest. Do not
intercept `beforeinput` and rebuild edits from `view.state.selection`: the
browser selection may already have changed before CodeMirror receives its
selection-change notification. That shortcut inserted replacement text beside
the old document instead of replacing it. The browser regression keeps the
full-document replacement, native undo/redo, and ordinary typing paths under
test; selecting a version must not implicitly clear undo history on first edit.

## Compilation limits and embedded images

The playground's short-source limits are an authoring policy, not limits on
saved Resources projects. The Resources build guest explicitly selects a
2 Mi-code-point source budget, including long lines, while playground calls
retain their smaller default budget. Neither changes the machine's DOM or
network authority.

Inline `style` attributes on compiled elements use the same semantic CSS encoding
as stylesheets.
The compiled element tuple is `[1, tag, svg, attributes, children, inline?]`;
the optional final field contains declaration-operation bytes, not CSS source.
The output guest applies them to the element's style capability. This preserves
inline specificity instead of converting attributes into ordinary class rules.
Empty declarations clear a previous inline style. Stylesheets establish scoped
keyframe names before inline animations are applied, and content updates keep
the machine-owned stylesheet nodes intact.

The compiler rejects external CSS URLs and attempts to insert extra rules in
an attribute. Embedded SVG is converted into semantic image data. The host
still checks the bytes independently and formats the CSS; compiler success
does not grant additional authority. Multiple inline declarations use native
cascade handling so a later normal value cannot erase an earlier `!important`.

Border shorthands remain single semantic declarations, including omitted colors,
reordered components, `var()` and `calc()`. The browser supplies their defaults
and resets; the compiler does not guess longhands. A replacement declaration
block follows the cascade, while guest `setProperty` calls remain explicit
assignments. The host checks rendered values with `CSS.supports`, since valid
shorthands can have empty CSSOM shorthand readbacks. Images remain restricted to
background declarations, and arithmetic operators have their own wire tag.

The inert HTML parser scans quoted attributes before finding a tag's closing
`>`. Duplicate attributes keep the first value, as in the browser. A slash in
an unquoted value is data, not a self-closing marker; self-closing syntax closes
SVG elements but does not implicitly close ordinary non-void HTML elements.
Browser comparisons check these boundaries, and the built Wasm compiler must
return the same complete result or error as the source compiler.

Source-limit accounting walks CodeMirror's immutable text tree and weakly
caches each subtree's code-point count and longest line. Edits reuse unchanged
subtrees; discarded history does not remain pinned by this cache. DOM,
selection, and event state are not cached by this mechanism. Unicode pairs,
unpaired surrogates, edits, restores, and paste rejection have regression tests.
The MicroQuickJS source-accounting benchmark runs the old and new counters on
identical 1,000-line documents, alternating their order and checking results
after garbage collection. Its timings describe accounting, not total editor
latency; the project-page browser test separately exercises the full editor.

JavaScript syntax validation belongs to the debounced QuickJS output load, not
the MicroQuickJS editor's `Function` constructor. Recompiling on every edit
both wastes work and rejects valid modern project syntax. Invalid replacements
leave the last successful output visible; the output error is delayed while
the user types. HTML and CSS likewise use the output compiler and renderer.
The editor's recovery tree is only for editor features, not a project-wide
validation gate: an incomplete data/source file may not be used by the app at
all. Other languages therefore also reach the real build/output validator
without an extra tree walk on each edit. The workspace separately validates
configuration JSON before requesting compilation.
For optional large-file keyboard timings, run the language browser test with
`MACCHIATO_EDITOR_TIMINGS=1`. It edits the actual workspace form source at the
beginning, middle, and end, checks the resulting document, and reports keyboard
round-trip timings (including Playwright overhead) without a fixed CI threshold.
Set `MACCHIATO_EDITOR_PROFILE` to a diagnostics directory alongside the
repository to also collect a DevTools CPU profile for each typing position.
Those profiled timings are not interchangeable with unprofiled runs. Keep
builds and other browser tests out of the measurement window, and retain the
document/selection assertions when changing the benchmark.

Editor mounting asks `forceParsing(view)` to prioritize the visible region
using CodeMirror's default budget, rather than asking for the whole document
with a 250 ms synchronous allowance. Its normal background parser continues
as the editor idles and the user scrolls. The language browser test mounts
real JavaScript and Rust source, edits the first viewport, then reaches the
last viewport and requires its syntax tree to be available without remounting.
`MACCHIATO_EDITOR_MOUNT_TIMINGS=1` repeats those mounts four times, reporting
guest construction and DOM-flush time without counting source transport or
the subsequent correctness checks. Run it separately from typing/profile
measurements. In the September 10 development run, a 109 KB JavaScript file
went from 360–384 ms to 111–132 ms; a 26 KB Rust file went from 342–370 ms to
89–124 ms. These are mount measurements, not total page-load or typing times.

`MACCHIATO_EDITOR_ENCODER_COMPARE=1` with timings enabled instead compares
JavaScript/native text writers in A–B–B–A order in the same built editor. It
also measures text encoding separately. On a September 2026 development VM,
20 writes of the 109 KB workspace source took about 1.9–2.0 seconds in the
JavaScript fallback and 3 ms in the native writer. Whole-editor key-pair
medians in that run were 481–628 ms versus 230–277 ms, respectively. Other
runs varied substantially: this is evidence for avoiding interpreted encoding,
not a promised end-to-end latency or a completed performance target.
`MACCHIATO_EDITOR_NOTIFICATION_COMPARE=1` instead compares serialized and
same-guest notification delivery in A–B–B–A order. It retains only the latest
local notification and verifies its full document outside the timed interval.
This isolates notification transport, not the surrounding Resources workspace's
snapshot/history work. Do not combine it with encoding comparisons or profiling.

When the workspace lives in the editor's own guest, it installs
`__codeEditorNotify(message)` and receives freshly constructed notification
objects directly. This avoids serializing and immediately parsing the entire
document on every edit. Without that callback the editor keeps using its
serialized boundary notifier. Limits in notifications are copies, not mutable
references to the editor's limit settings; CodeMirror transactions and history
are unchanged.

Project snapshot normalization weakly caches serialized byte counts for its
own file records. It compares the current path and content before reuse,
because MicroQuickJS's `Object.freeze` fallback does not enforce immutability.
Records are still copied; nested configuration is always revalidated. Snapshot
size is the exact JSON envelope, file sizes, and comma separators, including
escaped characters and UTF-8. Editing one file no longer re-encodes every
unchanged image or bundled resource just to check the budget.

The `snapshot-usage` browser test compares cached records with deliberately
fresh records in alternating order and checks the results after guest GC.
On the September 2026 development VM, 20 edits with eight unchanged assets took
929–948 ms uncached versus 2.3–2.4 ms cached. These are accounting-only timings,
not full workspace typing timings; native tests also check the exact 70 MiB
serialized boundary and invalidation when records or configuration change.

Inline SVG keeps its namespace and drawing attributes. An embedded SVG in a
CSS background becomes a semantic SVG tree in the stylesheet wire message.
The host validates and renders that tree before producing a base64 image URL;
it never applies the guest's raw URL or SVG string. Remote CSS URLs remain
blocked. The supported image input currently uses a percent-encoded SVG data
URL, as used by Cat Memory Match's paw-print card backs.

## Project Home tab

Every project has a Home tab identified by a home icon. It is a stable project
overview rather than an editable file and cannot be closed like an ordinary
file tab.

Home composes useful project material instead of duplicating the Details pane.
Depending on what the project contains, it can include:

- rendered README excerpts;
- a concise file and directory overview;
- previews of important or recently used files;
- the project title, description, and primary entry point;
- links into documentation, source files, versions, and Output View;
- container-provided status or getting-started material.

The exact composition is declarative and container-aware. A project without a
README still receives a useful Home view. Large files appear as bounded
previews, not as an attempt to render their full contents. Home must not create
a draft merely because it computes previews or records navigation.

The home icon needs an accessible `Project home` label and the same delayed
custom tooltip used by other file-tab controls. Its source belongs in the icon
credit inventory when it is not a platform-owned glyph.

## Opening files

Selecting a new file from the tab picker opens it in a reading view first. This
keeps navigation quiet, avoids eagerly constructing expensive editor runtimes,
and makes opening an unfamiliar or generated file safe and fast. Text is
selectable and searchable; images and other supported assets use an appropriate
bounded viewer.

While a file-picker result is focused, pressing `E` opens that file directly in
editing mode. The shortcut is an accelerator for an explicit selection, not a
global command that guesses which file should be edited. The picker exposes the
shortcut in its keyboard help and accessible description.

From an open reading view, `E` switches the active editable text file into its
editor when the viewer has permission and the file is within editable size and
type limits. Otherwise it explains why editing is unavailable and leaves the
reading view intact. Inputs, textareas, dialogs, and guest applications retain
their own `E` keystrokes.

Opening a reading view does not mark the project dirty. Constructing an editor
does not mark it dirty either; the first actual content or configuration change
does. Returning to reading mode does not discard an editor session unless the
user closes the tab or the host disposes it under an explicit lifecycle policy.

## Tabs and session state

The Home tab precedes ordinary tabs. Ordinary tabs retain the existing model:
they can be selected, reordered, and—when active—closed. The file picker omits
already open files from its available-file results and lists open files in its
separate group.

Reading versus editing is part of tab session state. It is not project content
until a future explicit preference chooses to persist it. Saved tab
configuration records project-relevant choices deliberately and participates
in normal dirty checking; incidental tab navigation does not.

When another project is opened, its project-editor runtime is independent and
disposable. Future project tabs may preserve several runtimes, but the Home and
read-first contracts remain per project.

## Two tabbed halves

The focused desktop workspace is composed of two independently tabbed halves,
not an editor pane permanently paired with a special-purpose Output View pane.
Either half can select a project surface appropriate to that position. Output
View is one such surface; files, Home, reading views, editors, and compatible
inspectors can also participate in this model. Opening a split creates another
tab location rather than creating an intrinsically different kind of pane.

Each half's toolbar describes only its selected tab. It contains the active
tab's local actions and the control for selecting or opening another tab in
that half. It must not accumulate project-wide actions, workspace layout
controls, settings, history, or details controls. A tab that does not support a
local action does not inherit one merely because another tab did.

Tab order, the selected tab in each half, and the split position are session
state. Closing the second half must not destroy its project state unless the
normal tab/runtime disposal policy says to do so. Reopening it can therefore
restore the previous right-half selection when that state remains available.

## Project controls

Controls affecting the whole project or workspace move to a dedicated group on
the far right. When the settings/details area is open, this group belongs to
that area. When it is closed, the group sits immediately to the right of the
rightmost visible half. A divider separates project controls from the selected
tab's local controls so scope remains visually unambiguous.

This group includes workspace layout and project-level destinations such as
settings/details. It is not part of either half and does not move when a tab is
selected on the left or right. Responsive layouts may present the same group
more compactly, but must preserve the distinction between active-tab actions
and whole-project actions.

## Output errors in full screen

Full screen is a layout change around the existing Output View runtime, not a
new run. Output errors therefore follow that runtime into full screen. An error
that would normally appear below or beside Output View is rendered there as a
dismissible overlay above the project surface; it must not remain visible only
in workspace chrome that full screen has hidden.

Dismissing the overlay hides that occurrence without restarting the project,
discarding state, or claiming that the underlying error was repaired. A later,
distinct error opens the overlay again. The message remains available after
leaving full screen through the normal Output View status/error interface.
The overlay is keyboard accessible, does not trap focus, and does not prevent
the full-screen close control from being reached.

## Relationship to other modules

- `project-details-use` owns the modular, read-first Details pane.
- `project-editor` owns the constrained CodeMirror guest and editing surface.
- container and preview runtimes own execution of the project itself.
- the host application owns authorization, persistence, drafts, and routing.
- `project-editor` coordinates those pieces without merging their authority.

The project editor should receive narrow capabilities for each responsibility.
In particular, reading a file, editing a file, rendering a project, and changing
project metadata are separate operations even when the interface presents them
in one focused workspace.

## Editor and output lifetimes

Each open code editor should be able to run in its own JavaScript context with
its own DOM device. This is the next architecture to test, rather than placing
every tab's CodeMirror instance and references in one long-lived context. It
makes an editor independently disposable, keeps its document and undo state
local, and gives inactive tabs a clear suspension boundary. Multiple contexts
may share a runtime machine where doing so reduces memory without coupling
their globals or devices.

Output runs in a separate project machine and is displayed in an iframe by
default. The iframe is configurable: it is a presentation and browser-isolation
boundary, while the machine and its granted devices remain the security
boundary. The project editor owns the output lifecycle and can replace or
refresh its context without disposing an editor context. A future non-iframe
surface must be an explicit configuration, not an accidental fallback. A
project may request it with `config.output.iframe: false`; omission means the
iframe-backed surface.

## Guest-owned language loading

CodeMirror language support belongs to the editor guest, not to the frontend
controller. When a language is first needed, the guest should ask its runtime
environment for an opaque resource, read the corresponding bytecode through a
`Blob`- or `File`-like capability, and load it into its own JavaScript context.
The controller only decides whether that resource capability is granted and
passes it along; it does not select languages or interpret editor modules.

The same environment lookup can return opaque references to sibling machines
that the guest did not create. Those references convey only explicitly granted
operations. They are preferable to ambient globals and keep machine ownership,
resource access, and editor policy independently auditable. An environment hash
can identify the exact resource/capability set used by a context without
exposing its implementation.

The current editor requests a language module when opening a file, or when a
Markdown fence needs its parser. Switching files may request additional modules
after bootstrap; each installed module executes at most once. JavaScript, JSX,
TypeScript, and TSX share a package, with distinct parser configurations.
HTML, CSS, JSON, Vue, Svelte, Markdown, Python, Rust, SQL, YAML, and C/C++ are
also supported. File detection and fence descriptions share one registry.

Language bytecode is downloaded separately on guest request. The controller
grants only the named, build-produced language artifacts; it neither chooses
the active language nor evaluates JavaScript. Concurrent requests for a shared
package use one download, failed downloads can retry, and an editor disposed
while downloading cannot receive the result. CodeMirror adds an arriving parser
with a compartment reconfiguration, preserving text, selection, and undo.

MicroQuickJS normally registers ROM atoms before guest execution. The build
therefore includes a small shared atom catalog, not all language programs, in
the initial stamp. Late relocation must resolve every compiled atom to an
already registered ROM atom. The runtime rejects missing atoms, duplicate
program names, exhausted storage, and installations after `closeGuest()`.
Downloaded bytes stay outside the moving heap for the context's lifetime.
Tag 3 carries a name, NUL, and trusted compiler-produced bytecode; installation
is acknowledged before the guest calls `load(name)` to execute it. This is not
a validator for arbitrary third-party bytecode or a host-code execution grant.

The browser regression switches between files and Markdown fences in the real
MicroQuickJS Wasm runtime, with both stamped and downloaded modules. It holds a
download while typing and verifies selection and undo after the parser arrives.
The project-page test verifies that an HTML project initially requests only
the HTML language module. A smaller regression also checks that dynamically
interned bytecode-string property keys survive collection: ROM strings are not
GC-marked, but their canonical entries must remain valid for the context's
lifetime. The patch retains those entries without retaining unused atom-table
slots or unreachable heap strings.

## Runtime build transformations

The Resources editor build adapts CodeMirror view 6.43.9's mutation scan with
[`codemirror-mutation-scan.js`](codemirror-mutation-scan.js). For batches over 128 records,
it caches the nearest rendered child along each traversed path. This avoids
repeatedly walking long runs of native-inserted nodes that do not yet have
CodeMirror tiles. Smaller batches keep the original search.

The cache is local to one synchronous `processRecords` call, separated by
container tile and direction. It is never retained across a DOM/view update;
no observer records, events, or callbacks are suppressed or deferred. The host
is unchanged. The build transformation checks the upstream search and call
sites and fails if they no longer match, requiring review when upgrading
CodeMirror. The helper retains CodeMirror's MIT attribution. It is currently
enabled for the Resources editor, not the independent demo builds.

The Resources guest build also adapts CodeMirror language 6.12.4's two
foreground parsing allowances from 20 ms to 5 ms. This bounds work during
state creation and edits; CodeMirror's normal background worker finishes the
same syntax tree. Explicit caller budgets, idle slices, tree publication,
input handling, and the host are unchanged. The build fails if those two
upstream call sites change. Faster typing can mean highlighting catches up
later; visual recordings and parse-ready timings cover both sides of that
tradeoff rather than treating an incomplete tree as a completed render.
When native idle callbacks are available, their preliminary pause is 25 ms
instead of 100 ms. The combined maximum pause stays 500 ms, as does the
timer-only fallback. Idle slice sizes, cancellation, and input-pending checks
are unchanged; queued-input tests run before waiting for parser catch-up.

On an edit, the build also moves the snapshot of reusable parser fragments
after `takeTree()`. In the installed version the snapshot precedes finalizing
the pending parse, so it loses work completed between keystrokes. Change-range
invalidation remains upstream's own. Deterministic tests compare partial-parse
edits with fresh JavaScript, JSON, and HTML parses, including malformed input,
deletion, full replacement, and no-op transactions. The build fails if this
upstream snapshot changes; this is not a second parser or a host-side cache.

Multi-memory WebAssembly is worth testing for runtime builds: interpreter state,
guest resources or bytecode, and shared device buffers need not compete in one
linear memory. A post-link transformation tool such as Walrus may be useful for
adding or rewriting memories, imports, exports, data segments, and the custom
sections used for stamped resources. This belongs in reproducible runtime build
tooling and must not add corresponding logic to the browser controller.

A same-origin iframe can receive the parent's ordinary `WebAssembly.Memory`
object directly and observe the same backing buffer without copying. That is a
useful shared-buffer arrangement on the browser's single main thread, but it is
not concurrent shared memory and needs no atomics. Actual concurrent access
uses a shared memory backed by `SharedArrayBuffer`; on the web that requires a
cross-origin-isolated deployment and atomic coordination. The controller may
grant either memory as an opaque environment capability, while buffer layout
and synchronization remain runtime concerns.

Wasm GC is separate again. GC-managed structs and arrays can reduce runtime
bookkeeping within one machine, but they do not replace a shared linear-memory
protocol between page and iframe. Build experiments should measure multiple
linear memories, shared memory, and Wasm GC independently before combining
them.

# `@macchiato-dev/project-editor`

`project-editor` is the project workspace shell. It coordinates project-level
navigation, reading and editing files, Output View, details, versions, drafts,
and the independently disposable editor and project runtimes.

This package is at the design stage. It is distinct from
`@macchiato-dev/code-editor-use`: `code-editor-use` provides a constrained code
editing surface, while `project-editor` decides which project material is open,
whether it is being read or edited, and how that work participates in project
history.

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
- `code-editor-use` owns the constrained CodeMirror editing surface.
- container and preview runtimes own execution of the project itself.
- the host application owns authorization, persistence, drafts, and routing.
- `project-editor` coordinates those pieces without merging their authority.

The project editor should receive narrow capabilities for each responsibility.
In particular, reading a file, editing a file, rendering a project, and changing
project metadata are separate operations even when the interface presents them
in one focused workspace.

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

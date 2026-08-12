# Platform interface style guide

The shared platform establishes quiet interaction primitives that Resources.co,
Macchiato, and other hubs may theme without changing their behavior.

## Workspace bars

A focused workspace has one continuous top bar divided on the same boundaries
as its editor, output, and details panes. Controls belong to the pane they act
on and disappear with that pane. A hidden editor therefore does not leave a
file picker behind, and an editor-only view does not advertise output metadata.

Call rendered results **Output View**, not preview. Preview implies a temporary
deployment rather than the live result of a constrained project.

Pane boundaries use a restrained two-pixel inset groove made from a darker and
lighter value of the surrounding color. The draggable editor/output seam uses
the same treatment without a center grip, so it remains discoverable by its
resize cursor without competing with pane content.

## Icon controls

Use compact platform-owned line icons for mode changes such as Editor, Split
view, and Output View. Keep the SVG inline so constrained, offline, and
self-hosted surfaces do not acquire an icon-font dependency. Treat them as a
small coherent set with shared stroke weight and optical bounds.
The three workspace modes are always-visible icon buttons in one shallow,
beveled segmented control, like paragraph-alignment controls. Raised buttons
use a light top/left and dark bottom/right edge; the selected mode reverses the
depth and appears inset. Do not hide these three choices in a dropdown.
Every icon button has an accessible name and an instant custom tooltip; native
delayed `title` tooltips are not the primary explanation. Standalone toolbar
icons, including Full Screen and Details, use the same compact hover background
as the segmented view controls; the hit area does not change size on hover.
Tooltips stay on one line and are clamped to the viewport. Near an edge they
grow inward rather than crossing the window boundary. File tabs show only the
basename. A tab only shows a tooltip when its basename is truncated or its file
is in a subdirectory; in either case, the tooltip carries the complete
project-relative path.

Pointer-triggered tooltips use a 600 ms delay, close to native desktop tooltip
timing, and disappear when the pointer leaves. Keyboard focus reveals them
immediately. Tooltip boxes size to their labels rather than enforcing a minimum
width.

The project file picker separates unopened results from an `Open files` group
at the bottom. One filter searches both groups. Each group scrolls independently;
the open group exposes about five rows before it scrolls, and an open file is
never duplicated in the unopened results.

## Split actions and menus

A primary action may have a divided arrow segment. The arrow opens a compact
menu, even when it initially contains one item, so later actions do not change
the control's shape. Destructive draft actions belong in menus and still require
a custom confirmation dialog. Optional version titles use a custom modal.

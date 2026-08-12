# Platform interface style guide

The shared platform establishes quiet interaction primitives that Resources.co,
Macchiato, and other hubs may theme without changing their behavior.

## Workspace bars

A focused workspace has two independently tabbed halves and an optional
project settings area. The right half is not a permanently designated Output
View: either half may contain files, reading or editing surfaces, Output View,
Home, or another compatible project surface.

Each half's segment of the continuous top bar contains only controls for its
selected tab, followed by the control for selecting or opening another tab in
that half. Those controls disappear or change with the selected tab. They do
not include layout modes, project settings, history, or other actions whose
scope is the whole project.

Project-wide icons form a separate group at the far right. When project
settings are open, the group is placed with that area. When settings are
closed, it follows the rightmost visible half. A divider always separates this
group from active-tab controls. The group stays spatially stable as tabs change
so its broader scope is visible rather than inferred from a tooltip.

When Output View enters full screen, its current error status enters with it.
Show an active error as a dismissible overlay over the output rather than
leaving it behind in a hidden status rail. The overlay belongs to Output View,
not to the full-screen close control, and uses the standard error colors and
message typography. Dismissal hides the occurrence but does not restart the
runtime or clear its recorded status; a new error may show it again.

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
Workspace layout modes are project-wide icons in one shallow, beveled
segmented control, like paragraph-alignment controls. Raised buttons
use a light top/left and dark bottom/right edge; the selected mode reverses the
depth and appears inset. Do not hide these choices in a dropdown, and do not
place them inside either half's active-tab controls.
Every icon button has an accessible name and a custom tooltip; native
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

Use Lucide's recognizable `history` glyph for version history. Lucide SVG paths
remain inline for offline and constrained surfaces, and every adopted glyph is
recorded in the website README's icon inventory.

The history trigger is icon-only and pairs the glyph with a compact disclosure
arrow. Relative history labels retain useful precision: seconds, minutes plus
seconds, and hours plus minutes before switching to calendar labels. File tabs
use a quiet whole-tab hover; only the active tab exposes a close control, whose
small hover target uses the same subtle border as other interactive icons.
Focused-project toolbar controls share a 30-pixel hover height. Controls without
disclosures use square hit areas; Browse Files and History are wider while using
the same generous disclosure arrow. Their subtle hover border and fill follow
the app bar without changing the segmented view toggle's distinct treatment.

In the app bar, account hover remains pill-shaped. Create and Notifications use
the compact rounded-square shape, but share the account control's restrained
background and subtle border. These hover regions stop at the app bar and do
not extend into a focused project's toolbar.

The project file picker separates unopened results from an `Open files` group
at the bottom. One filter searches both groups. Each group scrolls independently;
the open group exposes about five rows before it scrolls, and an open file is
never duplicated in the unopened results.

## Split actions and menus

A primary action may have a divided arrow segment. The arrow opens a compact
menu, even when it initially contains one item, so later actions do not change
the control's shape. Destructive draft actions belong in menus and still require
a custom confirmation dialog. Optional version titles use a custom modal.

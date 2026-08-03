# Composable use surfaces

A `*-use` module grants a guest a capability over a bounded host resource. For
DOM-backed modules, its **surface** is the allowed live DOM shape and the
bookkeeping attached to it: element and per-tag counts, depth, text, permitted
attributes and events, and operation gas. It is a property of the capability,
not a parallel object model or a second editor.

## Component ownership

An app need not have one guest or one shared budget. A useful decomposition is:

```text
application
└─ layout surface (aggregate ceiling)
   ├─ header surface
   ├─ sidebar surface
   ├─ content surface
   │  └─ editor surface
   └─ footer surface
```

The editor's document, DOM, memory, and operation budgets can be independent
from ordinary article content. The content component can likewise be
independent from the layout. A layout may render its simple chrome itself, or
outsource its header, sidebar, and footer to separately owned guests and
surfaces. Outsourcing should narrow authority: a footer does not inherit the
editor's event types merely because both appear in one app.

Each child has a local ceiling and owner. A parent may additionally impose an
aggregate ceiling so ten individually valid children cannot exhaust the page.
A local violation should normally omit output from that surface, preserve the
user's document/history where possible, and leave sibling components running.
Cross-component communication uses declared messages, not shared DOM handles.

Budgets should distinguish at least:

- logical data, such as editor lines and characters;
- live surface shape, including counts by element type;
- guest memory and CPU execution;
- renewable host-operation gas; and
- rates or totals for external capabilities such as storage and HTTP.

Network effects are orthogonal to shape. An allowed element does not acquire
URL access merely by fitting its surface; use the [browser network-capability
inventory](network-capability-inventory.md) when assigning load, navigation,
submission, hint, and response-header capabilities.

Renewal belongs to the host. A user event or explicit command may receive a new
operation allocation; guest code cannot mint gas for itself. Periodic renewal
may keep an interactive editor responsive, but remains bounded in size and
time. Totals stay observable for auditing and later tuning.

## Editor guidance

`code-editor-use` defaults to 5,000 lines and supports tested 100-, 1,000-, and
5,000-line configurations. Its guest helps bound the line-number surface even
when virtual DOM geometry is conservative. A production-quality editor should
also install a CodeMirror extension that displays remaining capacity before a
host rejection, especially when documents approach the configured limit.
Large-file containers may choose a higher-authority iframe or edit a file in
bounded parts instead.

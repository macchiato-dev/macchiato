# Composable use surfaces

A `*-use` module grants a guest a capability over a bounded host resource. For
DOM-backed modules, its **surface** is the allowed live DOM shape and the
bookkeeping attached to it: element and per-tag counts, depth, text, permitted
attributes and events, and operation gas. It is a property of the capability,
not a parallel object model or a second editor.

## Component ownership

The planned default is complete ownership beneath each granted container, with
an exact guest mirror and revisioned positional addressing. Indexed child access
makes bounded-depth paths an efficient common primitive, while disposable guest
DOM wrappers provide library compatibility. The design, stale-path rules,
detached arena, future explicit exclusions, and migration phases are specified
in [Container-owned DOM and positional
mirrors](dom-use-container-ownership.md).

The execution and capability boundaries reinforce each other. Guest code may
run in a WebAssembly-hosted VM, but its practical isolation is the set of host
resources it can access. Each DOM-backed component receives one host-owned root
rather than the browser document. Any host bridge operation
that resolves or returns a native node must verify that it is the granted root
or a descendant, that its ownership record matches the component, and that the
operation remains within the surface schema. Detached nodes created for the
guest are tracked by owner and cannot be inserted outside an owned root.

Page-governed and component-governed surfaces are both first-class. A
sandboxed application may put its complete UI beneath one page root and apply a
single aggregate schema to the shell and content. An application embedded in a
larger page may instead receive one component container with no access to the
surrounding page. Complex apps can combine them: a page surface supplies the
aggregate ceiling while editors, sidebars, previews, and other components keep
their own roots, identities, and budgets. Parent governance does not make child
DOM handles interchangeable.

Most components need exactly one root. For example, a comment composer can own
one container whose schema admits a bounded editor, formatting controls, and a
submit button. It cannot discover the page header, sibling comments, or a
credential-bearing form elsewhere in the document. This makes the component
root a rendering and access boundary.

A component that needs menus, dialogs, tooltips, or lightboxes may receive one
additional portal-like root. The host creates it—often directly under `body`—
and gives it its own allowed shape, node budget, focus/dismissal policy, and
lifecycle. The portal may be temporary or hidden between uses, but it never
turns `body` into a traversable guest root and must disappear when its owner is
destroyed.

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

Exfiltration control classifies the DOM and CSS constructs that can contact a
server. Some combinations load automatically, some issue speculative hints,
some submit data, and others navigate after interaction. An allowed element
does not acquire URL access merely by fitting its surface; its request-bearing
attribute and destination need an explicit grant. Use the [browser
network-capability inventory](network-capability-inventory.md) when assigning
load, navigation, submission, hint, and response-header capabilities.

The same separation applies to script APIs. Guest code does not call ambient
`fetch`; an HTTP grant is an indirect, named capability such as `http-use` that
validates a structured request, performs it on the host or another isolated
component, filters the response, and returns only the declared result.

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

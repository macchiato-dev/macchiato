# terminal-use

`terminal-use` is a proposed constrained terminal surface for JavaScript guests
running in QuickJS/WebAssembly. The first reference surface will use xterm.js,
following the same broad architecture as `code-editor-use`: terminal state and
setup code belong to the guest, while a small host adapter owns browser layout,
input, selection, accessibility, and an explicitly accounted DOM subtree.

This package is currently a blank starting point. It does not yet initialize
xterm.js, create a sandbox, emulate a shell, or grant access to a process.

## Intended boundary

A terminal display is not automatically a shell or PTY capability. The initial
example should accept bounded input and output entirely in memory. Connecting
it to a local process, remote process, WebSocket, HTTP endpoint, filesystem, or
clipboard requires a separate capability and should remain denied by default.

The xterm surface will be audited against `browser-use` and the repository's
browser network-capability inventory. Its DOM policy should enumerate xterm's
expected elements, generated classes, attributes, styles, event subscriptions,
and accessibility nodes. It should not grant URL-bearing elements or browser
network APIs.

Likely independent budgets include:

- rows, columns, scrollback lines, and total retained characters;
- live elements and per-tag counts in the xterm viewport;
- input/output bytes per write and per event;
- renewable host-operation gas and guest CPU time;
- QuickJS memory and stack limits; and
- output rate, so a runaway producer cannot monopolize rendering.

Input events should cross one filtered bridge. Text input, composition, paste,
selection, focus, resize, and terminal key sequences need browser tests rather
than editor-specific shortcuts in the host. A future PTY adapter should consume
the terminal's declared byte-stream interface without gaining DOM authority.

## First milestones

1. Record the minimal DOM shape produced by a fixed xterm.js configuration.
2. Run that configuration inside a dedicated QuickJS instance and project its
   DOM operations through a specialized `browser-use` policy.
3. Provide an in-memory example with a prompt, echo, clear, and bounded output.
4. Exercise typing, paste, selection, resize, scrollback, accessibility, and
   output churn in Playwright while measuring peak surface and gas use.
5. Add optional, separately declared process or remote-stream adapters only
   after the display/input contract is stable.

The example should eventually live under `packages/terminal-use/examples/`, be
self-contained, and also be installable as a declarative app for a local
subdomain. xterm.js and bundling tools belong to that example or to development
dependencies: an application remains responsible for choosing and building the
guest code it executes.

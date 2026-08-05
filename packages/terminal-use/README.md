# terminal-use

`terminal-use` is a proposed constrained terminal surface for JavaScript guests
running in QuickJS/WebAssembly. The first reference surface will use xterm.js,
following the same broad architecture as `code-editor-use`: terminal state and
setup code belong to the guest, while a small host adapter owns browser layout,
input, selection, accessibility, and an explicitly accounted DOM subtree.

The first rough implementation embeds xterm.js 6 in a dedicated QuickJS/WASM
guest and projects its browser operations through `browser-use`. The basic app
is an in-memory Pong game that exercises ANSI cursor movement, color, screen
clearing, animation, and xterm keyboard sequences. It deliberately does not
emulate a shell or grant access to a process.

## Run the rough example

```bash
cd packages/terminal-use/examples/basic
npm install
npm start
```

The command prints the randomly selected local URL. In the full Macchiato
development app set, the same declarative app is mapped to
`http://terminal-use.localhost:<port>` by the `terminal-use` plugin entry.

The example is intentionally split at the trust boundary:

- `src/guest.js` imports xterm.js and runs inside QuickJS;
- `src/controller.js` creates and disposes the VM and moves bounded JSON across
  the boundary;
- `src/policy.js` declares the DOM shape, events, dimensions, scrollback,
  output size, and renewable operation budget; and
- `examples/basic/client.js` supplies the unprivileged in-memory echo behavior.

This is an alpha compatibility pass. Typing, composition, selection, resize,
scrollback, accessibility, sustained output, and tighter gas measurements still
need broader Playwright coverage before the package is suitable for publishing.

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

1. Finish recording the minimal DOM shape produced by the fixed xterm.js 6
   configuration and reduce the provisional limits.
2. Exercise typing, paste, selection, resize, scrollback, accessibility, and
   output churn in Playwright while measuring peak surface and gas use.
3. Add optional, separately declared process or remote-stream adapters only
   after the display/input contract is stable.

The example should eventually live under `packages/terminal-use/examples/`, be
self-contained, and also be installable as a declarative app for a local
subdomain. xterm.js and bundling tools belong to that example or to development
dependencies: an application remains responsible for choosing and building the
guest code it executes.

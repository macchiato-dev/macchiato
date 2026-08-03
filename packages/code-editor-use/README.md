# code-editor-use

`code-editor-use` grants a QuickJS guest a tightly described CodeMirror 6
surface. A surface is not another editor instance or package: it is the live
shape of host DOM that the guest may use, plus the host's accounting for that
shape. The policy counts total elements, individual tag families, text, depth,
event subscriptions, and bridged operations.

This specialized adapter avoids the general `dom-use` runtime on its hot path,
but its tag/attribute policy is audited against the [browser network-capability
inventory](../../docs/network-capability-inventory.md). It grants no
URL-bearing element or attribute merely because CodeMirror asks for one.

The guest owns CodeMirror and its state. Browser layout, selection geometry,
focus, composition, and rendering remain behind `browser-use` handles in one
granted subtree. Unexpected shape fails closed.

## Three budgets

- The **document budget** caps logical content. The default is 5,000 lines and
  1,000,000 characters. Supported line-limit presets are 100, 1,000, and
  5,000; applications may choose any positive value up to 5,000.
- The **surface budget** caps the current DOM shape, including per-tag counts.
  Present virtual geometry can make CodeMirror retain roughly one content
  element per line, while the guest-assisted line-number gutter is capped at
  100 live rows. These implementation facts are tested rather than hidden.
- **Operation gas** caps JSON DOM operations per allocation. The editor gets a
  fresh allocation for a host command or native event and periodically while
  active; cumulative usage remains available for auditing. This is bridge gas,
  not a QuickJS CPU-instruction limit.

```js
mountQuickJsCodeEditor({
  root,
  guestSource,
  limits: {
    maxLines: 1_000,
    maxCharacters: 250_000,
    maxSurfaceOperations: 100_000,
    surfaceRefillMs: 1_000,
  },
});
```

`controller.inspect()` reports document usage and the live surface's limits,
remaining capacity, tag counts, and operation totals.

The host always enforces the hard boundary. For a good experience, the guest
should also supply a CodeMirror extension that shows remaining lines or
characters, warns before the boundary, and explains an omitted paste. If users
are likely to exceed the limit, offer splitting or an explicit larger container
instead of making host rejection the first feedback.

## Entry points

- `@macchiato-dev/code-editor-use` exports policies and limit helpers without
  creating an editor or sandbox.
- `@macchiato-dev/code-editor-use/controller` exports
  `mountQuickJsCodeEditor` and requires its declared peers.

The CodeMirror setup in `src/guest.js` is application-owned build input.
CodeMirror packages and the bundler remain development dependencies because an
application chooses the guest code it executes. See [Composable use
surfaces](../../docs/use-surfaces.md) for the larger ownership model.

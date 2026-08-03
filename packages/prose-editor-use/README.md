# prose-editor-use

`prose-editor-use` is a specialized `browser-use` capability for a small
comment/message editor. Its audited host bundle can create either ProseMirror
or Wordgard. The selected editor owns the native contenteditable subtree while
a QuickJS guest can inspect it only through scoped JSON DOM handles.

The package fixes the schema to paragraphs, hard breaks, text, strong,
emphasis, and inline code. It also fixes the history and keyboard commands,
limits text to 20,000 characters, and continuously validates the live subtree.
Unexpected elements, attributes, classes, depth, or text size destroy and clear
the editor.

`createMessageEditor({engine})` accepts only `prosemirror` or `wordgard`. The
example uses separate QuickJS controller modules to select between them while
keeping the page, browser client, host bundle, operations, and submission
contract unchanged.

Both engines now build their policies from one message-editor surface schema:
paragraphs and marks, common contenteditable attributes, text/shape limits,
per-tag bookkeeping, and operation gas are shared. Engine variants only add
their wrapper vocabulary and generated attributes. Wordgard's extra
`wordgard-editor`/`wg-*` wrappers are therefore inexpensive schema data rather
than a second browser bridge.

Like other specialized adapters, this hot path does not instantiate general
`dom-use` for every operation. Its schema must nevertheless be audited against
the [browser network-capability
inventory](../../docs/network-capability-inventory.md); neither engine policy
contains a URL-bearing element or attribute.

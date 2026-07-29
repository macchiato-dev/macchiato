# Constrained ProseMirror example

Run the development app plugin and open:

`http://prose-editor-use.localhost:8765`

`http://wordgard-editor-use.localhost:8765`

The page is a small rich-text message composer. ProseMirror runs natively for
contenteditable, selection, composition, and browser input. The application
controller runs inside QuickJS/WASM and sees the editor only through scoped
JSON DOM handles supplied by `browser-use`.

The `prose-editor-use` capability fixes the document schema, commands, plugins,
size limits, and allowed live DOM shape. It accepts paragraphs, hard breaks,
strong, emphasis, and inline code. A shape mismatch destroys and clears the
editor. The example does not accept arbitrary ProseMirror plugins, schemas,
HTML, CSS, or JavaScript.

Both URLs use the same page, browser client, native host bundle, toolbar
contract, and submission path. Their only application-code difference is the
controller module evaluated inside QuickJS: one requests the allowlisted
ProseMirror engine and the other requests Wordgard. This demonstrates runtime
swapping without granting the guest package loading or direct browser DOM.

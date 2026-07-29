# code-editor-use

`code-editor-use` is a specialized `browser-use` adapter for CodeMirror 6. It
does not grant a QuickJS guest CodeMirror's native nodes. The guest controls the
editor through JSON operations while the audited adapter owns one subtree.

The adapter fixes the extension set to `basicSetup`, JavaScript syntax, and
CodeMirror's maintained One Dark theme,
caps documents at 100,000 characters, and continuously checks the resulting
subtree against `CODE_EDITOR_DOM_POLICY`. The policy declares CodeMirror's
expected tags, attributes, generated class-name families, depth, element count,
and text budget. Unexpected shape clears the editor and reports a violation.

This split is necessary because selection, range geometry, focus, composition,
and incremental rendering are browser layout capabilities. Pretending those
are plain serialized DOM would make `dom-use` less predictable. `browser-use`
instead supplies scoped live handles to QuickJS and keeps native layout inside
an explicit specialized adapter.

# MicroESNext

MicroESNext is an experimental small JavaScript engine derived from
[MicroQuickJS](https://github.com/bellard/mquickjs). It keeps MicroQuickJS's
compact arena, stack-based bytecode, and bounded native-stack use while adding
a deliberately measured subset of newer ECMAScript behavior.

The first milestone implements `Set`, `Map`, `WeakSet`, `WeakMap`, and
`Promise` in C. The supported surface is driven by real uses in CodeMirror,
ProseMirror, and WordGard, then specified by direct conformance tests. It is
not a general ES6 compatibility claim.

This is a new codebase. Existing MicroQuickJS runtimes elsewhere in the
Macchiato repository are consumers and comparison points, not source
dependencies. Integration happens only after the new runtime passes its own
tests.

## Development

```sh
npm test
```

The build uses the local C compiler and writes generated executables under
`build/`. Generated files are not committed.

The precise implemented surface and its intentional boundaries are described
in [Supported ES6 subset](docs/supported-es6.md).
The [bytecode study](docs/bytecode.md) records how newer syntax maps onto the
engine and why `await` is the one requested feature that needs an instruction.

## Source provenance

`src/` began as an unmodified copy of MicroQuickJS commit
`203d5bb79789bc47b74855d9207415dab71661a0`. Its MIT license is retained in
`src/LICENSE`. Subsequent changes belong to the MicroESNext history and are
kept readable and independently testable here.

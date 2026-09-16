# Document-driven Rust workflows

Three small, dependency-free Rust programs, authored in Markdown documents:

- [Markdown](markdown.md) renders a deliberately small Markdown subset.
- [Rust highlighting](rust.md) lexes and highlights Rust without a compiler.
- [Layout](layout.md) composes the rendered fragments into a complete page.

[The workflow document](workflow.md) contains the Cargo manifest, shared output
type, executable composition, integration tests, and SHA-256 input references.
Each renderer document contains its own implementation, tests, customization
description, and limitations. [The Deno server](server.md) is also authored as a
document. Nothing executable is hidden in HTML comments.

## Run

From this directory:

```sh
deno task test
deno task build
deno task browser-test
```

The build verifies external input hashes, extracts source, builds only for
`wasm32-unknown-unknown`, then runs tests and the composed program in Deno's
WebAssembly engine. There is no native Rust executable, WASI, or Wasm import.
Install that Rust target with `rustup target add wasm32-unknown-unknown` if needed.
Open `dist/index.html` for the all-inclusive, self-rendered reading demo, or run
the server described in its document. `dist/sample.html` shows composition;
`dist/dark.html` shows dark customization. `build/` contains the disposable Cargo
project, extracted Deno server, and small target directory;
`dist/` contains disposable output. No downloaded crate or external rendering
library is needed. Deno orchestrates extraction; rendering is implemented in Rust.

## Visible document syntax

A line containing only an inline-code filename marks the **next fenced code
block** as that file's exact contents. A generic Markdown renderer shows both the
filename and its source. For example:

`example.rs`

```rust
fn example() { /* ordinary Rust */ }
```

Only the five documents explicitly named in `workflow.ts` are build inputs; this
README example is not extracted. Every file is declared once. Rust code fences
inside a source block cannot become additional files. A longer outer fence may
be used when its contents include shorter fences.

An external input is declared on its own visible inline-code line:

`input: inputs/article.md sha256:<64 lowercase hexadecimal digits>`

The actual reference, with its actual digest, is in the workflow document. Paths
are local, relative to this directory, not URLs. The digest covers the exact file
bytes; a mismatch stops the build before Rust runs. Inputs are copied into the
generated project only after verification. There is no implicit network fetch.
Hashes pin content; they do not make untrusted Rust source safe to execute.

## Composition and safety boundary

Markdown calls the Rust highlighter for `rust` code fences. The workflow also
highlights a standalone source file, and passes both results to layout. This is
ordinary Rust function composition in one small Wasm crate, not a framework or a
mandatory subprocess per stage. Each stage is independently callable and tested.
The two content renderers also have separate ABI operations for reuse; layout
accepts typed fragments inside Rust. Later transformations can add their own
operations or artifacts without changing the authoring format.

The public `Fragment` type has no public unchecked constructor. Renderers escape
text before emitting fixed HTML elements and class names. Layout accepts these
fragments and a small typed set of options, not arbitrary HTML or CSS. Rendered
links are text, images are text, and there are no scripts, event attributes,
resource URLs, forms, embeds, or navigation targets. Comments and strings in
source code are highlighted text, never executable markup.

Layout supplies fixed, local CSS and a restrictive CSP as defense in depth. The
construction rules, not CSP alone, prevent output-driven loading and navigation.
The browser test also runs with the CSP removed to check that boundary. This does
not block a user from copying text, browser extensions, a surrounding page's code,
or a host that subsequently modifies the DOM. Nor is it a sandbox for executing
arbitrary Rust documents: review code before building it. This is an unreleased
prototype intended to safely render untrusted *content*, with tests rather than a
claim of a completed security audit.

## Deliberate first-step limits

There is no general CommonMark parser, semantic Rust analysis, plugin system,
remote dependency resolver, or arbitrary template language. Unsupported Markdown
is displayed as escaped text rather than partly interpreted HTML. Customization
expands through explicit options and examples. See each document for its exact
subset and tests. Keep generated files out of version control; change and review
the documents instead.

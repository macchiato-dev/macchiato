# TypeScript build and runtime shapes for the DOM-use cluster

The first TypeScript cluster is `style-use` → `html-use` → `dom-use`.
`dom-use` keeps maintained TypeScript in `src/` and emits standard ESM
JavaScript, declarations, declaration maps, and source maps into an ignored
`lib/` directory. `style-use` and `html-use` retain the earlier `source/` →
`src/` layout until they are migrated separately. `npm run build:use-cluster`
builds all three in dependency order. The one guest bootstrap is an
explicit modern ES2022 script target built by esbuild: it must not acquire an
ES-module wrapper because QuickJS evaluates it as a classic bootstrap script. Published packages
contain both forms: `dom-use` JavaScript consumers use `lib/`, while Deno and
TypeScript readers can inspect or import its TypeScript sources directly.

There are no runtime build helpers. TypeScript, and esbuild for the one classic
guest script, are package development dependencies. Each package supports
`build`, `lint`, `typecheck`, `test`, and
`check`; the root `check:use-cluster` runs them in dependency order.

## QuickJS compatibility

There are two distinct QuickJS boundaries:

- `guest-runtime.ts` runs inside the project's embedded QuickJS VM. Its build
  target is an ES2022 classic IIFE, and browser tests execute that artifact in
  the real VM.
- Deno 2.9 added an experimental QuickJS-ng backend for compiled Deno programs.
  Deno preserves its application API through a Rust-side V8-compatible facade;
  it does not require application TypeScript to use a special reduced dialect.
  `test/deno-quickjs-smoke.ts` is a small cluster consumer intended for
  `deno compile --engine quickjs` compatibility checks as that backend matures.

The Deno backend is a useful portability check, not the security boundary for
untrusted guest code. Deno currently describes it as experimental and warns
that it does not receive the same security updates as V8. Keep capability
enforcement in the `*-use` host layer regardless of the selected host engine.

Do not make current host TypeScript artificially resemble older JavaScript.
When older semantics matter, test the emitted artifact in QuickJS. MicroQuickJS
is a separate, deliberately narrow guest target: code selected for it should
have an explicit language-feature, byte-size, memory, and gas budget. That
constraint must not silently spread to host modules or more capable guests.
The exception is a real source boundary, such as importing an older module that
cannot consume the normal output. Put that compatibility work in a small
adapter or dedicated entrypoint, compile it to the required target, and test it
in that runtime. Do not turn the package's main source configuration into a
catch-all compatibility mode.

## Runtime shape policy

Class syntax is not automatically faster than an object literal. V8 can give
plain objects the same optimized hidden class when fields are created in the
same order. These packages use classes where they make the intended stable
shape explicit, keep methods on a shared prototype, or preallocate a known
group of fields. Optional groups belong in a consistently present state object
instead of being added piecemeal to a long-lived instance.

- `DomUseState` holds the schema, `StyleUse`, merged gas policy, and precomputed
  `DomUseLimits`.
- `DomUseGasState` gives every gas tank the same four numeric/lifecycle fields.
- `StyleUseState` holds its schema, precomputed limits, and the effective
  property table. Validation no longer reconstructs that table per call.
- `HtmlFragment` replaces the parser's one-off method-bearing root literal.

Operations that naturally work on explicit state are also exported as
functions (`sanitizeDomHtml`, `createDomDocument`, `validateInlineStyle`, and
others). Existing methods are compatibility adapters for the repository's
current callers. Migrate those callers separately, with their own performance
and browser checks; do not force a repository-wide API migration into a state
layout change.

Measure before introducing more wrappers. A class that merely moves five
fields from a consistently shaped literal does not promise an improvement, and
an extra accessor or allocation can make a hot path worse. Benchmarks should
cover construction, repeated validation, sanitization, and retained heap—not
only a synthetic property read.

## Publishing

[`publish-use-cluster.yml`](../.github/workflows/publish-use-cluster.yml) runs
on `use-cluster-vX.Y.Z` tags. It verifies that all three package versions equal
the tag, checks and packs the cluster, then publishes in dependency order with
npm provenance. Configure each npm package's trusted publisher for the
`macchiato-dev/macchiato` repository and that exact workflow filename. The
workflow uses OIDC and intentionally has no long-lived npm token.

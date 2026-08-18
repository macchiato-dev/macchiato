# Wasm Web Runtimes

This development area adapts JavaScript runtimes to `WasmWebMachine`. It is
kept outside the machine because choosing a language runtime is application
composition, not part of the constrained browser ABI.

## Hybrid loading

One machine ABI supports several execution strategies:

- A small resident interpreter, especially MicroQuickJS, can run control code
  and accept additional programs without replacing the machine.
- Full QuickJS can load source now and compiled bytecode later through opaque
  `onmsg(bytes)` messages. The runtime owns the message tags and decoding;
  `WasmWebMachine` does not know that the payload is JavaScript.
- A demanding component can instead receive a fresh Wasm machine. This keeps
  its memory and execution lifetime independent and avoids interrupting the
  resident interpreter.
- Ordinary serialized state is the default handoff between machines because
  it is inspectable and versionable. Shared or transferred memory is an
  optimization for large, latency-sensitive state with explicit lifetimes.

The composition layer outside `WasmWebMachine` decides when to fetch code,
create another VM, dispose one, or transfer state. Fetch is supplied as a
constrained service; it is never ambient authority inside the machine.

QuickJS runtime message tag `1` means UTF-8 JavaScript source. Tag `2` invokes
a named global with a UTF-8 string argument and reports its string result. A
bytecode tag can be added without changing the machine or its two-function
`msg`/`onmsg` ABI.

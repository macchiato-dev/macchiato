import createWasmWebMachine from
  "../../../dev/wasm-web-container/examples/web/wasm-web-machine.js";

/**
 * Mount one validated, bounded WebAssembly application into a web surface.
 * The compatibility import is replaced layer by layer during reconstruction.
 */
export default function mountWebContainer(source, target = document, options = {}) {
  return createWasmWebMachine(source, target, options);
}

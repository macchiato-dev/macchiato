import runWasm from "../../../dev/wasm-web-container/examples/web/wasm-runner.js";

/**
 * Mount one validated, bounded WebAssembly application into a web surface.
 * The compatibility import is replaced layer by layer during reconstruction.
 */
export default function mountWebContainer(source, target = document, options = {}) {
  return runWasm(source, target, options);
}

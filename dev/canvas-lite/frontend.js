const { instance } = await WebAssembly.instantiateStreaming(
  fetch("./frontend.wasm"),
);
const wasm = instance.exports;
const text = new Uint8Array(wasm.memory.buffer, wasm.text_ptr(), wasm.text_len());
document.querySelector("main").textContent = new TextDecoder().decode(text);

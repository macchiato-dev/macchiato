const decoder = new TextDecoder("utf-8", { fatal: true });
let host, guest;
function text(memory, ptr, len) {
  return decoder.decode(new Uint8Array(memory.buffer, ptr, len));
}

({ instance: { exports: host } } = await WebAssembly.instantiateStreaming(
  fetch("./frontend-host.wasm"),
  {
    runner: {
      exec(code, codeLen, data, dataLen) {
        // Only the trusted host VM gets this capability, never the guest VM.
        const run = new Function("data", text(host.memory, code, codeLen));
        run(text(host.memory, data, dataLen));
      },
    },
    guest: { run: () => guest.run() },
  },
));
({ instance: { exports: guest } } = await WebAssembly.instantiateStreaming(
  fetch("./frontend-guest.wasm"),
  {
    host: {
      msg(ptr, len) {
        if ((len >>> 0) > host.inbox_capacity()) throw Error("Host inbox full");
        const bytes = new Uint8Array(guest.memory.buffer, ptr >>> 0, len >>> 0);
        new Uint8Array(host.memory.buffer, host.inbox_ptr(), bytes.length).set(bytes);
        host.onmsg(bytes.length);
      },
    },
  },
));
host.start();

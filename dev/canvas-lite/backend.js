// The runner loads only the trusted host. The host decides what else to load.
const refs = new WebAssembly.Table({ element: "externref", initial: 1 });
const decoder = new TextDecoder("utf-8", { fatal: true });
const env = { root: new URL("./", import.meta.url) };
const keep = (value) => value === undefined ? 0 : refs.grow(1, value);
const { instance } = await WebAssembly.instantiate(
  await Deno.readFile(new URL("dist/backend-host.wasm", env.root)),
  {
    runner: {
      compile(ptr, len) {
        const source = decoder.decode(
          new Uint8Array(env.wasm.memory.buffer, ptr >>> 0, len >>> 0),
        );
        // Compile a trusted function expression once; calls use its reference.
        const fn = new Function(`return (${source}\n);`)();
        if (typeof fn !== "function") throw Error("Expected function source");
        return keep(fn);
      },
      call(ref, ptr, len) {
        return keep(refs.get(ref >>> 0)(env, ptr >>> 0, len >>> 0));
      },
    },
  },
);
env.wasm = instance.exports;
const startup = env.wasm.start();
try {
  await refs.get(startup);
} finally {
  refs.set(startup, null);
}

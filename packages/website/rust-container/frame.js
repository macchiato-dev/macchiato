// Privileged glue for the trusted host, not an API given to its guests.
const refs = [undefined, globalThis], free = [], decoder = new TextDecoder();
let host, port;
const keep = value => {
  const id = free.length ? free.pop() : refs.length;
  refs[id] = value; return id;
};
const release = id => { if (id) { refs[id] = undefined; free.push(id); } };
const bytes = (p, n) => new Uint8Array(host.memory.buffer, p >>> 0, n >>> 0);
const text = (p, n) => decoder.decode(bytes(p, n));
const args = (p, n) => Array.from(
  new Uint32Array(host.memory.buffer, p >>> 0, n >>> 0), i => refs[i]);
const bridge = {
  string: (p, n) => keep(text(p, n)),
  bytes: (p, n) => keep(bytes(p, n)),
  number: n => keep(n), value: id => refs[id], release,
  get: (id, key) => keep(Reflect.get(refs[id], refs[key])),
  set: (id, key, v) => { Reflect.set(refs[id], refs[key], refs[v]); },
  call: (id, self, p, n) =>
    keep(Reflect.apply(refs[id], refs[self], args(p, n))),
  new: (id, p, n) => keep(Reflect.construct(refs[id], args(p, n))),
  callback: token => keep((...args) => {
    const input = keep(args); let result = 0;
    try { result = host.dispatch(token, input); return refs[result]; }
    finally { release(input); release(result); }
  }),
};
addEventListener("error", e => port?.postMessage({ error: e.message }));
addEventListener("message", async e => {
  if (e.source !== parent || port || !e.ports[0]) return;
  port = e.ports[0];
  try {
    const loaded = await WebAssembly.instantiate(e.data.host, { bridge });
    host = loaded.instance.exports;
    const input = keep(e.data.input);
    try { host.start(input); } finally { release(input); }
    port.postMessage({ ready: true });
  } catch (error) { port.postMessage({ error: String(error) }); }
});

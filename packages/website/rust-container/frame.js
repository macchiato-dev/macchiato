// Only the parent supplies modules. All guest DOM calls pass through Rust.
const refs = [document.body], decoder = new TextDecoder(), W = WebAssembly;
let sandbox, guest, port;
const text = (p, n) => decoder.decode(
  new Uint8Array(sandbox.memory.buffer, p >>> 0, n >>> 0));
const event = id => { const n = sandbox.event(id); if (n) guest.event(n); };
function emit(op, id, arg, p, n, q, m) {
  if (op === 0) {
    refs[id] = document.createElement(text(p, n));
    refs[id].onclick = () => event(id); refs[arg].append(refs[id]);
  }
  if (op === 1) refs[id].textContent = text(p, n);
  if (op === 2) refs[id].style.setProperty(text(p, n), text(q, m));
  if (op === 3) refs[id].setAttribute(text(p, n), text(q, m));
  if (op === 4) refs[id].hidden = !!arg;
  if (op === 5) { refs[id].onclick = null; refs[id].remove(); }
  if (op === 5 || op === 8) refs[id] = null;
  if (op === 6) refs[id] = text(p, n);
  if (op === 7) refs[id].src = refs[arg];
}
addEventListener("error", e => port?.postMessage({ error: e.message }));
addEventListener("message", async e => {
  if (e.source !== parent || port || !e.ports[0]) return;
  port = e.ports[0];
  try {
    const s = await W.instantiate(e.data.sandbox, { browser: { emit } });
    sandbox = s.instance.exports;
    const call = (op, id, a, b, p, n) => {
      n >>>= 0; if (n > sandbox.capacity()) return -1;
      const bytes = new Uint8Array(guest.memory.buffer, p >>> 0, n);
      new Uint8Array(sandbox.memory.buffer, sandbox.inbox(), n).set(bytes);
      return sandbox.call(op, id, a, b, n);
    };
    const g = await W.instantiate(e.data.guest, { sandbox: { call } });
    guest = g.instance.exports;
    guest.start(crypto.getRandomValues(new Uint32Array(1))[0]);
    setInterval(() => guest.event(0), 1000);
    port.postMessage({ ready: true });
  } catch (error) { port.postMessage({ error: String(error) }); }
});

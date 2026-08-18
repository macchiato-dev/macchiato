import MapPonyfill from "../vendor/ungap/map.js";
import SetPonyfill from "../vendor/ungap/set.js";
import WeakMapPonyfill from "../vendor/ungap/weakmap.js";
import WeakSetPonyfill from "../vendor/ungap/weakset.js";
import PromisePonyfill from "promise-polyfill";
import "./microquickjs-platform.js";

globalThis.Map = MapPonyfill;
globalThis.Set = SetPonyfill;
// MicroQuickJS builds provide GC-integrated weak collections in C. Keep the
// ES5 fallback useful when this ponyfill bundle is evaluated elsewhere.
if (typeof globalThis.WeakMap !== "function") globalThis.WeakMap = WeakMapPonyfill;
if (typeof globalThis.WeakSet !== "function") globalThis.WeakSet = WeakSetPonyfill;
globalThis.Promise = PromisePonyfill;

// Exercise the native weak-key path during bootstrap before CodeMirror relies
// on it for caches and node bookkeeping.
if (globalThis.__microQuickJS) {
  const key = {};
  const value = {};
  const map = new WeakMap();
  const set = new WeakSet();
  if (map.set(key, value) !== map || map.get(key) !== value || !map.has(key)) {
    throw new Error("native WeakMap failed its bootstrap check");
  }
  if (set.add(key) !== set || !set.has(key)) {
    throw new Error("native WeakSet failed its bootstrap check");
  }
  gc();
  if (!map.has(key)) throw new Error("native WeakMap key moved incorrectly");
  if (map.get(key) !== value) throw new Error("native WeakMap value moved incorrectly");
  if (!map.delete(key) || map.has(key)) throw new Error("native WeakMap delete failed");
  if (!set.delete(key) || set.has(key)) throw new Error("native WeakSet delete failed");

  const deadMap = new WeakMap();
  for (let cycle = 0; cycle < 8; cycle++) {
    (function addTemporaryKey() {
      deadMap.set({}, cycle);
    }());
    gc();
    // A stale, unthreaded key can alias the next object allocated into its
    // compacted heap slot. Native weak tables must prune before that happens.
    if (deadMap.has({})) throw new Error("native WeakMap retained a dead key");
  }
}

import MapPonyfill from "../vendor/ungap/map.js";
import SetPonyfill from "../vendor/ungap/set.js";
import WeakMapPonyfill from "../vendor/ungap/weakmap.js";
import WeakSetPonyfill from "../vendor/ungap/weakset.js";
import PromisePonyfill from "promise-polyfill";
import "./microquickjs-platform.js";

// The customized MicroQuickJS build provides all four collections in C. Keep
// ungap-derived implementations as fallbacks when this bundle runs in another
// deliberately small ES5 host.
if (typeof globalThis.Map !== "function") globalThis.Map = MapPonyfill;
if (typeof globalThis.Set !== "function") globalThis.Set = SetPonyfill;
if (typeof globalThis.WeakMap !== "function") globalThis.WeakMap = WeakMapPonyfill;
if (typeof globalThis.WeakSet !== "function") globalThis.WeakSet = WeakSetPonyfill;
globalThis.Promise = PromisePonyfill;

// Babel lowers syntax, not standard-library calls. These small string methods
// are used by ordinary application code and keep the authored source shared
// with full QuickJS and the browser.
if (!String.prototype.includes) {
  String.prototype.includes = function(value, start) {
    return String(this).indexOf(String(value), start || 0) !== -1;
  };
}
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(value, start) {
    const at = start || 0;
    return String(this).slice(at, at + String(value).length) === String(value);
  };
}
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(value, end) {
    const text = String(this);
    const stop = end === undefined ? text.length : Math.min(Number(end), text.length);
    return text.slice(stop - String(value).length, stop) === String(value);
  };
}

// Exercise the native weak-key path during bootstrap before CodeMirror relies
// on it for caches and node bookkeeping.
if (globalThis.__microQuickJS) {
  const orderedMap = new Map([["first", 1], [NaN, 2]]);
  const orderedSet = new Set(["first", NaN]);
  if (orderedMap.size !== 2 || orderedMap.get(NaN) !== 2 ||
      orderedMap.keys().join(",") !== "first,NaN") {
    throw new Error("native Map failed its bootstrap check");
  }
  if (orderedSet.size !== 2 || !orderedSet.has(NaN) ||
      orderedSet.values().join(",") !== "first,NaN") {
    throw new Error("native Set failed its bootstrap check");
  }
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

import MapPonyfill from "../vendor/ungap/map.js";
import SetPonyfill from "../vendor/ungap/set.js";
import WeakMapPonyfill from "../vendor/ungap/weakmap.js";
import WeakSetPonyfill from "../vendor/ungap/weakset.js";
import "./microquickjs-platform.js";
import "./microquickjs-dom.js";

globalThis.Map = MapPonyfill;
globalThis.Set = SetPonyfill;
globalThis.WeakMap = WeakMapPonyfill;
globalThis.WeakSet = WeakSetPonyfill;

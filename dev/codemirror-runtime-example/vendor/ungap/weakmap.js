/*! Derived from @ungap/weakmap; (c) Andrea Giammarchi - ISC */

var nextWeakMap = 0;
var hasOwn = Object.prototype.hasOwnProperty;

export default function WeakMapPonyfill(iterable) {
  this._name = "__ungap_weakmap_" + nextWeakMap++;
  if (iterable) iterable.forEach(function (pair) {
    this.set(pair[0], pair[1]);
  }, this);
}

WeakMapPonyfill.prototype.delete = function (key) {
  return this.has(key) && delete key[this._name];
};
WeakMapPonyfill.prototype.get = function (key) {
  return this.has(key) ? key[this._name] : undefined;
};
WeakMapPonyfill.prototype.has = function (key) {
  return key != null && (typeof key === "object" || typeof key === "function") &&
    hasOwn.call(key, this._name);
};
WeakMapPonyfill.prototype.set = function (key, value) {
  if (key == null || typeof key !== "object" && typeof key !== "function") {
    throw new TypeError("Invalid value used as weak map key");
  }
  Object.defineProperty(key, this._name, {
    configurable: true,
    value: value
  });
  return this;
};

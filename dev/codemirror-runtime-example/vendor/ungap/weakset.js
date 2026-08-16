/*! Derived from @ungap/weakset; (c) Andrea Giammarchi - ISC */

import WeakMapPonyfill from "./weakmap.js";

var members = new WeakMapPonyfill();

export default function WeakSetPonyfill(iterable) {
  members.set(this, new WeakMapPonyfill());
  if (iterable) iterable.forEach(this.add, this);
}

WeakSetPonyfill.prototype.add = function (value) {
  members.get(this).set(value, true);
  return this;
};
WeakSetPonyfill.prototype.delete = function (value) {
  return members.get(this).delete(value);
};
WeakSetPonyfill.prototype.has = function (value) {
  return members.get(this).has(value);
};

/*! Derived from @ungap/set; (c) Andrea Giammarchi - ISC */

function sameValueZero(left, right) {
  return left === right || left !== left && right !== right;
}

function indexOf(values, value) {
  for (var index = 0; index < values.length; index++) {
    if (sameValueZero(values[index], value)) return index;
  }
  return -1;
}

function iterator(values) {
  var index = 0;
  return { next: function () {
    return index < values.length ?
      { done: false, value: values[index++] } : { done: true };
  } };
}

export default function SetPonyfill(iterable) {
  this._values = [];
  if (iterable) iterable.forEach(this.add, this);
}

Object.defineProperty(SetPonyfill.prototype, "size", {
  configurable: true,
  get: function () { return this._values.length; }
});

SetPonyfill.prototype.add = function (value) {
  if (indexOf(this._values, value) < 0) this._values.push(value);
  return this;
};
SetPonyfill.prototype.clear = function () { this._values.length = 0; };
SetPonyfill.prototype.delete = function (value) {
  var index = indexOf(this._values, value);
  if (index < 0) return false;
  this._values.splice(index, 1);
  return true;
};
SetPonyfill.prototype.entries = function () {
  return this._values.map(function (value) { return [value, value]; });
};
SetPonyfill.prototype.forEach = function (callback, receiver) {
  this._values.forEach(function (value) {
    callback.call(receiver, value, value, this);
  }, this);
};
SetPonyfill.prototype.has = function (value) {
  return indexOf(this._values, value) >= 0;
};
SetPonyfill.prototype.keys = SetPonyfill.prototype.values = function () {
  return this._values.slice();
};
SetPonyfill.prototype["@@iterator"] = function () {
  return iterator(this.values());
};

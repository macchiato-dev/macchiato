/*! Derived from @ungap/map; (c) Andrea Giammarchi - ISC */

function sameValueZero(left, right) {
  return left === right || left !== left && right !== right;
}

function indexOf(keys, key) {
  for (var index = 0; index < keys.length; index++) {
    if (sameValueZero(keys[index], key)) return index;
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

export default function MapPonyfill(iterable) {
  this._keys = [];
  this._values = [];
  if (iterable) iterable.forEach(function (pair) {
    this.set(pair[0], pair[1]);
  }, this);
}

Object.defineProperty(MapPonyfill.prototype, "size", {
  configurable: true,
  get: function () { return this._keys.length; }
});

MapPonyfill.prototype.clear = function () {
  this._keys.length = this._values.length = 0;
};
MapPonyfill.prototype.delete = function (key) {
  var index = indexOf(this._keys, key);
  if (index < 0) return false;
  this._keys.splice(index, 1);
  this._values.splice(index, 1);
  return true;
};
MapPonyfill.prototype.entries = function () {
  return this._keys.map(function (key, index) {
    return [key, this._values[index]];
  }, this);
};
MapPonyfill.prototype.forEach = function (callback, receiver) {
  this._keys.forEach(function (key, index) {
    callback.call(receiver, this._values[index], key, this);
  }, this);
};
MapPonyfill.prototype.get = function (key) {
  var index = indexOf(this._keys, key);
  return index < 0 ? undefined : this._values[index];
};
MapPonyfill.prototype.has = function (key) {
  return indexOf(this._keys, key) >= 0;
};
MapPonyfill.prototype.keys = function () { return this._keys.slice(); };
MapPonyfill.prototype.set = function (key, value) {
  var index = indexOf(this._keys, key);
  if (index < 0) index = this._keys.push(key) - 1;
  this._values[index] = value;
  return this;
};
MapPonyfill.prototype.values = function () { return this._values.slice(); };
MapPonyfill.prototype["@@iterator"] = function () {
  return iterator(this.entries());
};

function MicroMap(entries) {
  this._keys = [];
  this._values = [];
  if (entries) {
    for (var index = 0; index < entries.length; index++) {
      this.set(entries[index][0], entries[index][1]);
    }
  }
}

MicroMap.prototype.set = function (key, value) {
  var index = this._keys.indexOf(key);
  if (index < 0) {
    this._keys.push(key);
    this._values.push(value);
  } else {
    this._values[index] = value;
  }
  return this;
};

MicroMap.prototype.get = function (key) {
  var index = this._keys.indexOf(key);
  return index < 0 ? undefined : this._values[index];
};

MicroMap.prototype.has = function (key) {
  return this._keys.indexOf(key) >= 0;
};

MicroMap.prototype.delete = function (key) {
  var index = this._keys.indexOf(key);
  if (index < 0) return false;
  this._keys.splice(index, 1);
  this._values.splice(index, 1);
  return true;
};

MicroMap.prototype.clear = function () {
  this._keys.length = 0;
  this._values.length = 0;
};

function MicroSet(values) {
  this._map = new MicroMap();
  if (values) for (var index = 0; index < values.length; index++) this.add(values[index]);
}

MicroSet.prototype.add = function (value) {
  this._map.set(value, true);
  return this;
};
MicroSet.prototype.has = function (value) { return this._map.has(value); };
MicroSet.prototype.delete = function (value) { return this._map.delete(value); };
MicroSet.prototype.clear = function () { this._map.clear(); };

var Map = MicroMap;
var WeakMap = MicroMap;
var Set = MicroSet;
var WeakSet = MicroSet;

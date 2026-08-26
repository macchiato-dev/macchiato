var microArrayPrototype = {};

microArrayPrototype.forEach = function (callback) {
  for (var index = 0; index < this.length; index++) callback(this[index], index, this);
};
microArrayPrototype.push = function (...values) {
  for (var index = 0; index < values.length; index++) this[this.length] = values[index];
  return this.length;
};
microArrayPrototype.pop = function () {
  if (!this.length) return undefined;
  var value = this[this.length - 1];
  this.length = this.length - 1;
  return value;
};
microArrayPrototype.map = function (callback) {
  var result = [];
  for (var index = 0; index < this.length; index++) result.push(callback(this[index], index, this));
  return result;
};
microArrayPrototype.filter = function (callback) {
  var result = [];
  for (var index = 0; index < this.length; index++) {
    if (callback(this[index], index, this)) result.push(this[index]);
  }
  return result;
};
microArrayPrototype.some = function (callback) {
  for (var index = 0; index < this.length; index++) {
    if (callback(this[index], index, this)) return true;
  }
  return false;
};
microArrayPrototype.every = function (callback) {
  for (var index = 0; index < this.length; index++) {
    if (!callback(this[index], index, this)) return false;
  }
  return true;
};
microArrayPrototype.indexOf = function (value) {
  for (var index = 0; index < this.length; index++) if (this[index] === value) return index;
  return -1;
};
microArrayPrototype.slice = function (start, end) {
  var length = this.length;
  start = start === undefined ? 0 : start < 0 ? length + start : start;
  end = end === undefined ? length : end < 0 ? length + end : end;
  var result = [];
  for (var index = start; index < end && index < length; index++) result.push(this[index]);
  return result;
};
microArrayPrototype.join = function (separator) {
  separator = separator === undefined ? "," : String(separator);
  var result = "";
  for (var index = 0; index < this.length; index++) {
    if (index) result += separator;
    if (this[index] !== null && this[index] !== undefined) result += String(this[index]);
  }
  return result;
};

installArrayPrototype(microArrayPrototype);

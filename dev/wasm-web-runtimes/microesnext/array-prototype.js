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
microArrayPrototype.reduce = function (callback, initialValue) {
  var index = 0;
  var result = undefined;
  if (initialValue !== undefined) {
    result = initialValue;
  } else {
    if (!this.length) throw new TypeError("Reduce of empty array with no initial value");
    result = this[0];
    index = 1;
  }
  for (; index < this.length; index++) {
    result = callback(result, this[index], index, this);
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
microArrayPrototype.find = function (callback) {
  for (var index = 0; index < this.length; index++) {
    if (callback(this[index], index, this)) return this[index];
  }
  return undefined;
};
microArrayPrototype.findIndex = function (callback) {
  for (var index = 0; index < this.length; index++) {
    if (callback(this[index], index, this)) return index;
  }
  return -1;
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
microArrayPrototype.splice = function (start, deleteCount, ...items) {
  var length = this.length;
  start = start < 0 ? Math.max(length + start, 0) : Math.min(start, length);
  deleteCount = deleteCount === undefined ? length - start : Math.max(0, Math.min(deleteCount, length - start));
  var removed = this.slice(start, start + deleteCount);
  var difference = items.length - deleteCount;
  var index;
  if (difference > 0) {
    for (index = length - 1; index >= start + deleteCount; index--) {
      this[index + difference] = this[index];
    }
  } else if (difference < 0) {
    for (index = start + deleteCount; index < length; index++) {
      this[index + difference] = this[index];
    }
    this.length = length + difference;
  }
  for (index = 0; index < items.length; index++) this[start + index] = items[index];
  return removed;
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
microArrayPrototype.concat = function (...values) {
  var result = this.slice();
  for (var index = 0; index < values.length; index++) {
    var value = values[index];
    if (value !== null && typeof value === "object" && typeof value.length === "number") {
      for (var item = 0; item < value.length; item++) result.push(value[item]);
    } else {
      result.push(value);
    }
  }
  return result;
};
microArrayPrototype.sort = function (compare) {
  compare = compare || function (left, right) {
    left = String(left);
    right = String(right);
    return left < right ? -1 : left > right ? 1 : 0;
  };
  for (var index = 1; index < this.length; index++) {
    var value = this[index];
    var position = index;
    while (position > 0 && compare(this[position - 1], value) > 0) {
      this[position] = this[position - 1];
      position--;
    }
    this[position] = value;
  }
  return this;
};
microArrayPrototype.reverse = function () {
  for (var left = 0, right = this.length - 1; left < right; left++, right--) {
    var value = this[left];
    this[left] = this[right];
    this[right] = value;
  }
  return this;
};

installArrayPrototype(microArrayPrototype);

// Minimal canonical bridge for guests that need messages but no host DOM.
// The host gives this guest one opaque capability whose only methods are
// postMessage and serviceCall. All values still use the ordinary wire codec.
var wireBuffer = new Uint8Array(2 * 1024 * 1024);
var wireStrings = [];
var wireIndexes = Object.create(null);
var pendingStrings = [];

function stringIndex(text) {
  var known = wireIndexes[text];
  if (known !== undefined) return known;
  var index = wireStrings.length;
  wireStrings.push(text);
  wireIndexes[text] = index;
  pendingStrings.push(text);
  return index;
}

function Writer(bytes) {
  this.bytes = bytes;
  this.at = 4;
}
Writer.prototype.byte = function (value) {
  if (this.at >= this.bytes.length) throw new RangeError("wire message too large");
  this.bytes[this.at++] = value;
};
Writer.prototype.uint = function (value) {
  do {
    var next = value % 128;
    value = Math.floor(value / 128);
    this.byte(next | (value ? 128 : 0));
  } while (value);
};
Writer.prototype.text = function (text) {
  var encoded = unescape(encodeURIComponent(text));
  this.uint(encoded.length);
  for (var index = 0; index < encoded.length; index++) {
    this.byte(encoded.charCodeAt(index));
  }
};
Writer.prototype.value = function (value) {
  if (value === null) return this.byte(0);
  if (typeof value === "string") {
    this.byte(5);
    return this.uint(stringIndex(value));
  }
  throw new TypeError("message guest supports only null and string values");
};

function Reader(bytes, length) {
  this.bytes = bytes;
  this.at = 4;
  this.length = length;
}
Reader.prototype.byte = function () {
  if (this.at >= this.length) throw new RangeError("truncated wire response");
  return this.bytes[this.at++];
};
Reader.prototype.uint = function () {
  var value = 0, scale = 1, byte;
  do {
    byte = this.byte();
    value += (byte & 127) * scale;
    scale *= 128;
  } while (byte & 128);
  return value;
};
Reader.prototype.value = function () {
  var tag = this.byte();
  if (tag === 0) return null;
  if (tag === 4) return ["r", this.uint()];
  throw new TypeError("unexpected message guest response");
};

function exchange(operation) {
  var writer = new Writer(wireBuffer);
  writer.uint(pendingStrings.length);
  pendingStrings.forEach(function (text) { writer.text(text); });
  pendingStrings = [];
  writer.uint(1);
  writer.byte(operation[0]);
  if (operation[0] !== 0) {
    writer.uint(operation[1]);
    writer.uint(operation[2]);
    writer.uint(operation[3].length);
    operation[3].forEach(function (value) { writer.value(value); });
  }
  var payloadLength = writer.at - 4;
  wireBuffer[0] = payloadLength;
  wireBuffer[1] = payloadLength >> 8;
  wireBuffer[2] = payloadLength >> 16;
  wireBuffer[3] = payloadLength >> 24;
  var responseLength = bridge(wireBuffer, writer.at);
  var reader = new Reader(wireBuffer, responseLength);
  if (reader.uint() !== 1) throw new TypeError("unexpected response count");
  return reader.value();
}

var messageRoot = exchange([0, null, null])[1];
function postMessageToHost(message) {
  var name = stringIndex("postMessage");
  var text = String(message);
  stringIndex(text);
  exchange([3, messageRoot, name, [text]]);
}
globalThis.__wwcPostMessage = postMessageToHost;
globalThis.__wwcReportError = function (message) {
  postMessageToHost("__wwcError:" + String(message));
};
globalThis.flush = function () {};

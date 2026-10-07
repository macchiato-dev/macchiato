(function () {
  "use strict";
  var pending = new Map();
  var nextCall = 1;

  // Native conversion is also useful to guest applications enforcing byte
  // limits. It grants no host access and keeps large resources byte-sized.
  globalThis.TextEncoder = class TextEncoder {
    encode(value = "") {
      return new Uint8Array(__utf8Encode(String(value).toWellFormed()));
    }
  };
  const encoder = new TextEncoder();

  // Byte storage must stay byte-sized even when a project contains megabytes
  // of text or images. A JS number array multiplies that memory cost.
  function Writer() { this.bytes = new Uint8Array(1024); this.at = 0; }
  Writer.prototype.reserve = function (length) {
    if (length <= this.bytes.length - this.at) return;
    var next = new Uint8Array(Math.max(this.at + length, this.bytes.length * 2));
    next.set(this.bytes.subarray(0, this.at));
    this.bytes = next;
  };
  Writer.prototype.byte = function (value) {
    this.reserve(1);
    this.bytes[this.at++] = value;
  };
  Writer.prototype.uint = function (value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("invalid integer");
    do {
      var byte = value % 128;
      value = Math.floor(value / 128);
      this.byte(byte | (value ? 128 : 0));
    } while (value);
  };
  Writer.prototype.text = function (value) {
    var bytes = encoder.encode(value);
    this.uint(bytes.length);
    this.reserve(bytes.length);
    this.bytes.set(bytes, this.at);
    this.at += bytes.length;
  };
  Writer.prototype.value = function (value, depth) {
    depth = depth || 0;
    if (depth > 32) throw new TypeError("value is too deep");
    if (value === null) return this.byte(0);
    if (value === false) return this.byte(1);
    if (value === true) return this.byte(2);
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) throw new TypeError("only integers are supported");
      this.byte(value >= 0 ? 3 : 4);
      return this.uint(value >= 0 ? value : -value - 1);
    }
    if (typeof value === "string") { this.byte(5); return this.text(value); }
    if (value instanceof Uint8Array) {
      this.byte(6); this.uint(value.length);
      this.reserve(value.length);
      this.bytes.set(value, this.at);
      this.at += value.length;
      return;
    }
    if (Array.isArray(value)) {
      this.byte(7); this.uint(value.length);
      for (var item of value) this.value(item, depth + 1);
      return;
    }
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
      var entries = Object.entries(value);
      this.byte(8); this.uint(entries.length);
      for (var entry of entries) { this.text(entry[0]); this.value(entry[1], depth + 1); }
      return;
    }
    throw new TypeError("unsupported value");
  };

  function Reader(bytes) { this.bytes = bytes; this.at = 0; }
  Reader.prototype.byte = function () {
    if (this.at >= this.bytes.length) throw new TypeError("truncated value");
    return this.bytes[this.at++];
  };
  Reader.prototype.uint = function () {
    var value = 0, scale = 1;
    for (var index = 0; index < 8; index++) {
      var byte = this.byte();
      value += (byte & 127) * scale;
      if (!(byte & 128)) return value;
      scale *= 128;
    }
    throw new TypeError("integer is too long");
  };
  Reader.prototype.take = function (length) {
    if (length > this.bytes.length - this.at) throw new TypeError("truncated bytes");
    var value = this.bytes.slice(this.at, this.at + length);
    this.at += length;
    return value;
  };
  Reader.prototype.text = function () {
    var length = this.uint();
    if (length > this.bytes.length - this.at) throw new TypeError("truncated bytes");
    var text = __utf8Decode(this.bytes.subarray(this.at, this.at + length));
    this.at += length;
    return text;
  };
  Reader.prototype.value = function (depth) {
    depth = depth || 0;
    if (depth > 32) throw new TypeError("value is too deep");
    var type = this.byte(), length, result, index;
    if (type === 0) return null;
    if (type === 1) return false;
    if (type === 2) return true;
    if (type === 3) return this.uint();
    if (type === 4) return -this.uint() - 1;
    if (type === 5) return this.text();
    if (type === 6) return this.take(this.uint());
    if (type === 7) {
      result = []; length = this.uint();
      for (index = 0; index < length; index++) result.push(this.value(depth + 1));
      return result;
    }
    if (type === 8) {
      result = {}; length = this.uint();
      for (index = 0; index < length; index++) {
        var key = this.text();
        if (key === "__proto__" || Object.prototype.hasOwnProperty.call(result, key)) {
          throw new TypeError("unsafe or duplicate object key");
        }
        result[key] = this.value(depth + 1);
      }
      return result;
    }
    throw new TypeError("unknown value type " + type);
  };

  function send(value) {
    var writer = new Writer();
    writer.value(value);
    __hostSend(writer.bytes.subarray(0, writer.at));
  }
  globalThis.hostCall = function (device, operation, input) {
    var id = nextCall++;
    return new Promise(function (resolve, reject) {
      pending.set(id, [resolve, reject]);
      send([2, id, device, operation, input]);
    });
  };
  globalThis.__serverReceive = function (bytes) {
    var reader = new Reader(new Uint8Array(bytes));
    var message = reader.value();
    if (reader.at !== reader.bytes.length || !Array.isArray(message)) {
      throw new TypeError("invalid server message");
    }
    if (message[0] === 3) {
      var continuation = pending.get(message[1]);
      if (!continuation) throw new TypeError("unknown device response");
      pending.delete(message[1]);
      return (message[2] ? continuation[0] : continuation[1])(message[3]);
    }
    if (message[0] !== 0 || typeof serverHandle !== "function") {
      throw new TypeError("invalid server request");
    }
    return Promise.resolve(serverHandle(message[2])).then(
      function (result) { send([1, message[1], result]); },
      function (error) { send([1, message[1], [500, [], String(error && error.message || error)]]); }
    );
  };
}());

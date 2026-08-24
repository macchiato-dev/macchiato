function encodeURIComponent(value) {
  var input = String(value);
  var output = "";
  var hex = "0123456789ABCDEF";
  for (var index = 0; index < input.length; index++) {
    var code = input.charCodeAt(index);
    var safe = code >= 65 && code <= 90 || code >= 97 && code <= 122 ||
      code >= 48 && code <= 57 || "-_.!~*'()".indexOf(input.charAt(index)) >= 0;
    if (safe) { output += input.charAt(index); continue; }
    if (code >= 55296 && code <= 56319) {
      if (++index >= input.length) throw new Error("URI contains an invalid surrogate");
      var low = input.charCodeAt(index);
      if (low < 56320 || low > 57343) throw new Error("URI contains an invalid surrogate");
      code = 65536 + ((code - 55296) << 10) + low - 56320;
    } else if (code >= 56320 && code <= 57343) {
      throw new Error("URI contains an invalid surrogate");
    }
    var bytes = code < 128 ? [code] : code < 2048 ? [192 | code >> 6, 128 | code & 63] :
      code < 65536 ? [224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63] :
        [240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63];
    for (var byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
      output += "%" + hex.charAt(bytes[byteIndex] >> 4) + hex.charAt(bytes[byteIndex] & 15);
    }
  }
  return output;
}

function serverHandle(input) {
  if (!(input instanceof Array) || input.length !== 2 || typeof input[1] !== "string") {
    throw new Error("resources document: request is invalid");
  }
  var args = JSON.parse(input[1]);
  if (!(args instanceof Array)) throw new Error("resources document: arguments are invalid");
  return renderResourcesDocument(input[0], args);
  throw new Error("resources document: operation is not available");
}

function serverResume() {
  throw new Error("resources document: no host device is available");
}

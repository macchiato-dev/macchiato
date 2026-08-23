// Response construction lives in the guest. The host only validates and
// materializes the returned status, header entries, and body.
function response(status, contentType, body) {
  return [status, [["cache-control", "no-store"], ["content-type", contentType]], body];
}

function text(status, body) {
  return response(status, "text/plain; charset=utf-8", body);
}

function json(status, body) {
  return response(status, "application/json; charset=utf-8", body);
}

function redirect(location) {
  return [303, [["cache-control", "no-store"], ["location", location]], ""];
}

function redirectWithCookie(location, cookie) {
  return [303, [["cache-control", "no-store"], ["location", location],
    ["set-cookie", cookie]], ""];
}

function jsonString(value) {
  var input = String(value);
  var output = '"';
  for (var index = 0; index < input.length; index++) {
    var character = input.charAt(index);
    var code = input.charCodeAt(index);
    if (character === '"' || character === "\\") output += "\\" + character;
    else if (character === "\b") output += "\\b";
    else if (character === "\f") output += "\\f";
    else if (character === "\n") output += "\\n";
    else if (character === "\r") output += "\\r";
    else if (character === "\t") output += "\\t";
    else if (code < 32) output += "\\u" + ("000" + code.toString(16)).slice(-4);
    else output += character;
  }
  return output + '"';
}

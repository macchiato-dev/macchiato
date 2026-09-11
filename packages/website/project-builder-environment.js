// The compiler has no DOM or Node globals. Its dependencies may still use
// pure browser utilities; supply those locally without a host round trip.
export function atob(input) {
  let source = String(input).replace(/[\t\n\f\r ]/g, "");
  if (source.length % 4 === 0) source = source.replace(/==?$/, "");
  if (source.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(source)) {
    const error = new Error("Invalid base64 input");
    error.name = "InvalidCharacterError";
    throw error;
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bits = 0, count = 0, result = "";
  for (let index = 0; index < source.length; index++) {
    bits = (bits << 6) | alphabet.indexOf(source[index]);
    count += 6;
    if (count >= 8) {
      count -= 8;
      result += String.fromCharCode((bits >>> count) & 255);
    }
  }
  return result;
}

if (typeof globalThis.atob !== "function") globalThis.atob = atob;

async function serverHandle(input) {
  if (input[0] === "echo") return input[1];
  if (input[0] === "utf8") {
    // Exercise guest-created lone surrogates, not just host-normalized input.
    const encoder = new TextEncoder();
    return input[1].map(units => encoder.encode(String.fromCharCode(...units)));
  }
  if (input[0] === "health") return [200, [], "QuickJS ready"];
  if (input[0] === "title") {
    var rows = await hostCall("sql", "site.title", [input[1]]);
    return [200, [], rows[0][0]];
  }
  return [404, [], "Not found"];
}

var pendingOperation = "";

function serverHandle(input) {
  if (input[0] === "error") throw new Error("deliberate test failure");
  if (input[0] === "health") {
    return [200, [["content-type", "text/plain; charset=utf-8"]],
      "MicroQuickJS received " + input[1] + " " + input[2]];
  }
  if (input[0] === "title") {
    pendingOperation = "title";
    return [2, "sql", "site.title", [input[4]]];
  }
  if (input[0] === "body") {
    pendingOperation = "body";
    return [2, "body", "read", [4]];
  }
  return [404, [["content-type", "text/plain; charset=utf-8"]], "Not found"];
}

function serverResume(ok, result) {
  if (!ok) return [500, [["content-type", "text/plain; charset=utf-8"]], result];
  if (pendingOperation === "body") {
    pendingOperation = "";
    return [200, [["content-type", "text/plain; charset=utf-8"]],
      result.length + ":" + result[0] + "," + result[1] + "," + result[2] + "," + result[3]];
  }
  pendingOperation = "";
  return [200, [["content-type", "text/plain; charset=utf-8"]], result[0][0]];
}

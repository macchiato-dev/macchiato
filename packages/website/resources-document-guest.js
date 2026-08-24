function serverHandle(input) {
  if (!(input instanceof Array) || input.length !== 2 || typeof input[1] !== "string") {
    throw new Error("resources document: request is invalid");
  }
  var args = JSON.parse(input[1]);
  if (!(args instanceof Array)) throw new Error("resources document: arguments are invalid");
  if (input[0] === "session") return renderSessionHtml.apply(null, args);
  throw new Error("resources document: operation is not available");
}

function serverResume() {
  throw new Error("resources document: no host device is available");
}

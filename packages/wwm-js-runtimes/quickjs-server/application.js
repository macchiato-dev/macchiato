async function serverHandle(input) {
  if (input[0] === "health") return [200, [], "QuickJS ready"];
  if (input[0] === "title") {
    var rows = await hostCall("sql", "site.title", [input[1]]);
    return [200, [], rows[0][0]];
  }
  return [404, [], "Not found"];
}

var nextNodeId = 1;

globalThis.__macchiatoHost = function (message) {
  var request = JSON.parse(message);
  if (request.op === "createElement" || request.op === "createTextNode") {
    return JSON.stringify({ id: String(nextNodeId++) });
  }
  return JSON.stringify({});
};

var scripts = JSON.parse(globalThis.__macchiatoBoot('<main id="app"><p>MicroQuickJS guest</p></main>'));
if (!scripts || scripts.error || scripts.length !== 0) {
  throw new Error("MicroQuickJS guest did not boot the constrained document: " + JSON.stringify(scripts));
}

// Timers with no extra arguments must work in MicroQuickJS too: unlike
// QuickJS, its Function.apply does not accept null as an argument array.
var results = [];
function record(value) {
  results.push(value);
  if (results.length === 4) __wwcPostMessage(JSON.stringify(results.sort()));
}
function unexpected() { record("cancelled callback ran"); }
for (var index = 0; index < 4200; index++) {
  clearInterval(setTimeout(unexpected, 60000));
  clearTimeout(setInterval(unexpected, 60000));
  clearImmediate(setImmediate(unexpected));
  addEventListener("resize", unexpected);
  removeEventListener("resize", unexpected);
}
setTimeout(function () {
  record(this === globalThis ? "timeout" : "wrong receiver");
}, 1);
setImmediate(function () { record("immediate"); });
setTimeout(function (value) { record(value); }, 1, "argument");
var interval = setInterval(function () {
  clearTimeout(interval);
  record("interval");
}, 1);

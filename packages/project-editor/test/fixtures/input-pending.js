// The same program runs natively and in each guest. Input is queued by Chromium,
// not fabricated with dispatchEvent or a replacement scheduling implementation.
function inputReport(value) { __wwcPostMessage(JSON.stringify(value)); }
function inputCommand(command) {
  var scheduling = navigator.scheduling;
  if (command === "supported") {
    inputReport({ supported: !!scheduling && typeof scheduling.isInputPending === "function" });
  } else if (command === "options") {
    var reads = 0, coerced = 0, invalid = 0;
    var options = {};
    Object.defineProperty(options, "includeContinuous", { get: function () {
      reads++;
      return { valueOf: function () { coerced++; return false; } };
    } });
    scheduling.isInputPending(options);
    scheduling.isInputPending(null);
    scheduling.isInputPending(undefined);
    [true, 1, "bad"].forEach(function (value) {
      try { scheduling.isInputPending(value); }
      catch (error) { if (error.name === "TypeError") invalid++; else throw error; }
    });
    inputReport({ reads: reads, coerced: coerced, invalid: invalid });
  } else if (command === "wait") {
    inputReport({ waiting: true });
    var start = performance.now(), pending = false;
    while (performance.now() - start < 1500) {
      if (scheduling.isInputPending()) { pending = true; break; }
    }
    inputReport({ pending: pending });
  }
}
document.addEventListener("keydown", function (event) {
  inputReport({ key: event.key });
});

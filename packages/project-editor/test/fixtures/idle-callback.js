var heldDeadline;
function idleReport(value) { __wwcPostMessage(JSON.stringify(value)); flush(); }
function idleCommand(json) {
  var command = JSON.parse(json);
  if (typeof command === "object") {
    hostCall(document.reference, "idleCallback", command);
  } else if (command === "supported") {
    idleReport({ supported: typeof requestIdleCallback === "function",
      cancel: typeof cancelIdleCallback === "function" });
  } else if (command === "request" || command === "timeout") {
    requestIdleCallback(function (deadline) {
      heldDeadline = deadline;
      idleReport({ delivered: true, timeout: deadline.didTimeout,
        remaining: deadline.timeRemaining() });
    }, command === "timeout" ? { timeout: 1 } : undefined);
  } else if (command === "retained") {
    idleReport({ retained: heldDeadline.timeRemaining(), timeout: heldDeadline.didTimeout });
    heldDeadline = null;
  } else if (command === "cancel") {
    for (var i = 0; i < 5000; i++) {
      var handle = requestIdleCallback(function () { idleReport({ canceledButDelivered: true }); });
      cancelIdleCallback(handle);
      cancelIdleCallback(handle);
    }
    idleReport({ canceled: 5000 });
  } else if (command === "invalid") {
    var invalid = false;
    try { requestIdleCallback(null); } catch (error) { invalid = error instanceof TypeError; }
    var invalidOptions = false;
    try { requestIdleCallback(function () {}, 1); } catch (error) { invalidOptions = error instanceof TypeError; }
    var reads = 0;
    var options = {};
    Object.defineProperty(options, "timeout", { get: function () { reads++; return 20; } });
    cancelIdleCallback(requestIdleCallback(function () {}, options));
    idleReport({ invalid: invalid, invalidOptions: invalidOptions, optionReads: reads });
  } else if (command === "foreign-cancel") {
    // Raw operation: bypass the guest's local callback map, as a malicious
    // guest could. Handle 1 may belong to another machine, never this one now.
    hostCall(document.reference, "cancelIdleCallback", [1]);
  }
  return "ok";
}

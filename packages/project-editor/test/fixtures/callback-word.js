// Browser callbacks use a 12-bit slot and 20-bit event field. Exercise the
// signed i32 boundary through real host timers, not a direct JS dispatch call.
var deliveredSlots = [];
function slotCallback(slot) {
  return function () {
    deliveredSlots.push(slot);
    if (deliveredSlots.length === 3) {
      __wwcPostMessage(JSON.stringify(deliveredSlots));
    }
  };
}
while (callbacks.length < 4096) {
  var slot = callbacks.length;
  allocateCallback(slotCallback(slot), false);
}
[2047, 2048, 4095].forEach(function (slot) {
  hostCall(document.reference, "timerOnce", [0, slot]);
});

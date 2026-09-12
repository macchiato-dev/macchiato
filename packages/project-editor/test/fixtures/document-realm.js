// Use the normal guest facade, plus raw reads for the window values it exposes.
function documentRealmProbe(json) {
  var request = JSON.parse(json);
  if (request.timers) {
    var cancelled = setTimeout(function () { __wwcPostMessage("timer:cancelled"); }, 0);
    clearTimeout(cancelled);
    var interval = setInterval(function () {
      clearInterval(interval);
      __wwcPostMessage("timer:interval");
    }, 0);
    setTimeout(function () { __wwcPostMessage("timer:timeout"); }, 0);
    requestAnimationFrame(function () { __wwcPostMessage("timer:frame"); });
    return;
  }
  if (request.href) {
    var link = document.createElement("a");
    link.setAttribute("href", request.href);
    document.body.appendChild(link);
    flush();
    return;
  }
  if (request.font) {
    var bytes = decodeBase64(request.font);
    var writer = new Writer(new Uint8Array(bytes.length + 128));
    writer.uint(5); writer.uint(1); writer.byte(2);
    writer.text("RealmFont"); writer.text("normal");
    writer.text("400"); writer.text("swap"); writer.uint(bytes.length);
    for (var index = 0; index < bytes.length; index++) writer.byte(bytes[index]);
    immediate([3, document.reference, stringIndex("installStylesheet"),
      [encode(writer.bytes.subarray(4, writer.at))]]);
  }
  if (request.scroll) hostCall(document.reference, "scrollBy", [0, 120]);
  if (request.custom) {
    document.body.appendChild(document.createElement("realm-widget"));
    flush();
    return;
  }
  var sample = document.getElementById("sample");
  var computed = hostCall(document.reference, "getComputedStyle", [sample]);
  var selection = hostCall(document.reference, "getSelection", []);
  __wwcPostMessage(JSON.stringify({
    width: hostGet(document.reference, "innerWidth"),
    now: hostCall(document.reference, "performanceNow", []),
    height: hostGet(document.reference, "innerHeight"),
    scroll: hostGet(document.reference, "pageYOffset"),
    globals: [innerWidth, innerHeight, pageXOffset, pageYOffset, scrollX, scrollY],
    fontSize: hostCall(computed[1], "getPropertyValue", ["font-size"]),
    selectionOffset: hostGet(selection[1], "anchorOffset"),
    privateVisible: Boolean(document.getElementById("controller-private"))
  }));
  flush();
}
document.addEventListener("mousedown", function () {
  __wwcPostMessage("pointer");
  flush();
});

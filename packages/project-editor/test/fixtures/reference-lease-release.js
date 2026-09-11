var element = document.createElement("div");
element.setAttribute("id", "retained");
element.textContent = "still owned";
document.body.appendChild(element);
flush();
// Count token construction only in this test, not in the production runtime.
// Both lookups below return an already-owned wrapper, so no new token is due.
var NativeReference = HostReference, tokens = 0;
HostReference = function (reference) { tokens++; return new NativeReference(reference); };
var same = true;
function repeatLookups() {
  for (var i = 0; i < 400; i++) {
    same = same && document.getElementById("retained") === element;
    same = same && document.body.childNodes[0] === element;
    if (i % 20 === 0) gc();
  }
  gc();
}
var release = releaseHostReferenceLease;
// The previous shim allocated a finalizer token for each duplicate lease.
releaseHostReferenceLease = function (reference) { new HostReference(reference); };
repeatLookups();
var previousTokens = tokens;
releaseHostReferenceLease = release;
tokens = 0;
repeatLookups();
HostReference = NativeReference;
var denied = 0;
[0, -1, 1048577, 1.5, "1", null, {}, new Uint8Array(4)].forEach(function (value) {
  try { bridge(value, 0); } catch (error) { denied++; }
});
__wwcPostMessage(JSON.stringify({ same: same, text: element.textContent,
  parent: element.parentNode === document.body, denied: denied,
  tokens: tokens, previousTokens: previousTokens }));
flush();

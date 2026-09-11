var element = document.createElement("div");
element.setAttribute("id", "retained");
element.textContent = "still owned";
document.body.appendChild(element);
var same = true;
for (var i = 0; i < 400; i++) {
  same = same && document.getElementById("retained") === element;
  same = same && document.body.childNodes[0] === element;
  if (i % 20 === 0) gc();
}
gc();
var denied = 0;
[0, -1, 1048577, 1.5, "1", null, {}, new Uint8Array(4)].forEach(function (value) {
  try { bridge(value, 0); } catch (error) { denied++; }
});
__wwcPostMessage(JSON.stringify({ same: same, text: element.textContent,
  parent: element.parentNode === document.body, denied: denied }));
flush();

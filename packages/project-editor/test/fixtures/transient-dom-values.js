var input = document.createElement("input"), text = document.createTextNode("");
document.body.appendChild(input);
document.body.appendChild(text);
input.value = "warm up";
text.textContent = "warm up";
flush();
var baseline = wireStrings.length;
for (var index = 0; index < 24; index++) {
  var value = "snapshot " + index + ": café 😀";
  input.value = value;
  text.textContent = value;
  flush();
  if (input.value !== value || text.textContent !== value)
    throw new Error("DOM text changed in transit");
}
input.value = "";
text.textContent = "";
flush();
gc();
if (wireStrings.length !== baseline)
  throw new Error("DOM values were retained by the string table");
__wwcPostMessage(JSON.stringify({ updates: 24, retained: 0 }));

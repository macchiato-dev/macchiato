var attributeProbe = document.getElementById("attribute-probe");
function readAttributes() {
  var result = {
    value: attributeProbe.getAttribute("data-value"),
    present: attributeProbe.hasAttribute("data-value"),
    className: attributeProbe.className,
    editable: attributeProbe.contentEditable
  };
  __wwcPostMessage(JSON.stringify(result));
  flush();
}
function writeAttributes() {
  attributeProbe.setAttribute("data-value", "guest");
  attributeProbe.className = "guest-class";
  attributeProbe.contentEditable = "true";
  readAttributes();
}
function addGuestClass() {
  attributeProbe.classList.add("guest-added");
  readAttributes();
}

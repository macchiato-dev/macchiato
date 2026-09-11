var childProbe = document.getElementById("child-probe");
var rememberedChild = null;
function readChildren() {
  var nodes = childProbe.childNodes, elements = childProbe.children;
  var text = [], tags = [];
  for (var i = 0; i < nodes.length; i++) text.push(nodes[i].nodeName + ":" + nodes[i].textContent);
  for (var j = 0; j < elements.length; j++) tags.push(elements[j].nodeName);
  __wwcPostMessage(JSON.stringify({ nodes: text, elements: tags,
    count: childProbe.childElementCount,
    first: childProbe.firstChild === (nodes[0] || null),
    last: childProbe.lastChild === (nodes[nodes.length - 1] || null),
    same: !rememberedChild || nodes[0] === rememberedChild
  }));
  rememberedChild = nodes[0] || null;
  flush();
}
function writeChildren() {
  childProbe.appendChild(document.createTextNode("guest"));
  childProbe.appendChild(document.createTextNode(" text"));
  var span = document.createElement("span");
  span.textContent = "added";
  childProbe.appendChild(span);
  readChildren();
}

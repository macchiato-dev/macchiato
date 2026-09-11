var namespace = "http://www.w3.org/2000/svg";
var svg = document.createElementNS(namespace, "svg");
var gradient = document.createElementNS(namespace, "linearGradient");
gradient.setAttribute("id", "gradient");
svg.appendChild(gradient);
document.body.appendChild(svg);
var found = document.getElementById("gradient");
__wwcPostMessage(JSON.stringify([found.localName, found.nodeName, found.namespaceURI]));

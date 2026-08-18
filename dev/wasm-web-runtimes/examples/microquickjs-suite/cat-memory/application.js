(function () {
  var cats = [
    ["#f2a559", "#c97b3d"], ["#3d3d3d", "#1f1f1f"],
    ["#f5ede2", "#d9c7bd"], ["#e0a899", "#b97a68"],
    ["#8d8d92", "#5f5f66"], ["#d9b382", "#a97c50"],
    ["#7a5644", "#4a3423"], ["#f0c94e", "#c99a26"]
  ];

  function shape(tag, attributes) {
    return [tag, attributes, []];
  }

  function append(parent, children) {
    children.forEach(function (child) { parent[2].push(child); });
    return parent;
  }

  function image(tree, className) {
    var node = document.createElement("img");
    if (className) node.className = className;
    if (typeof document.renderSvg === "function") node.src = document.renderSvg(tree);
    else {
      function native(value) {
        var element = document.createElementNS("http://www.w3.org/2000/svg", value[0]);
        for (var name in value[1]) element.setAttribute(name, value[1][name]);
        value[2].forEach(function (child) { element.append(native(child)); });
        return element;
      }
      var source = new XMLSerializer().serializeToString(native(tree));
      node.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(source)));
    }
    return node;
  }

  function catNode(cat) {
    var fur = cat[0], accent = cat[1];
    return image(append(shape("svg", { viewBox: "0 0 100 100" }), [
      shape("ellipse", { cx: "50", cy: "60", rx: "38", ry: "32", fill: fur }),
      shape("path", { d: "M16 45 L28 12 L40 38 Z", fill: fur }),
      shape("path", { d: "M84 45 L72 12 L60 38 Z", fill: fur }),
      shape("path", { d: "M20 42 L28 22 L36 38 Z", fill: accent, opacity: ".7" }),
      shape("path", { d: "M80 42 L72 22 L64 38 Z", fill: accent, opacity: ".7" }),
      shape("ellipse", { cx: "50", cy: "66", rx: "30", ry: "24", fill: fur }),
      shape("circle", { cx: "34", cy: "58", r: "7", fill: "white" }),
      shape("circle", { cx: "66", cy: "58", r: "7", fill: "white" }),
      shape("circle", { cx: "35", cy: "59", r: "3.5", fill: "#2b2b2b" }),
      shape("circle", { cx: "65", cy: "59", r: "3.5", fill: "#2b2b2b" }),
      shape("path", { d: "M46 68 Q50 72 54 68 Q50 74 46 68 Z", fill: "#e08a8a" }),
      shape("path", { d: "M50 70 Q46 78 40 76", fill: "none", stroke: "#5a4634",
        "stroke-width": "2", "stroke-linecap": "round" }),
      shape("path", { d: "M50 70 Q54 78 60 76", fill: "none", stroke: "#5a4634",
        "stroke-width": "2", "stroke-linecap": "round" }),
      shape("line", { x1: "8", y1: "60", x2: "28", y2: "62", stroke: "#5a4634",
        "stroke-width": "1.5" }),
      shape("line", { x1: "8", y1: "68", x2: "28", y2: "67", stroke: "#5a4634",
        "stroke-width": "1.5" }),
      shape("line", { x1: "92", y1: "60", x2: "72", y2: "62", stroke: "#5a4634",
        "stroke-width": "1.5" }),
      shape("line", { x1: "92", y1: "68", x2: "72", y2: "67", stroke: "#5a4634",
        "stroke-width": "1.5" })]), "card-front-cat");
  }

  function pawNode() {
    var svg = shape("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
    var children = [shape("ellipse", { cx: "12", cy: "15", rx: "5", ry: "4" }),
      shape("circle", { cx: "5.5", cy: "9", r: "2" }),
      shape("circle", { cx: "10", cy: "6.5", r: "2" }),
      shape("circle", { cx: "14", cy: "6.5", r: "2" }),
      shape("circle", { cx: "18.5", cy: "9", r: "2" })];
    children.forEach(function (node) {
      node[1].fill = "#f0a93a"; node[1].opacity = ".55";
    });
    return image(append(svg, children), "card-back-paw");
  }

  var board = document.getElementById("board");
  var movesElement = document.getElementById("moves");
  var matchesElement = document.getElementById("matches");
  var winElement = document.getElementById("win");
  var resetButton = document.getElementById("reset");
  var cards = [], open = [], matched = 0, moves = 0, locked = false;

  function shuffle(values) {
    for (var index = values.length - 1; index > 0; index--) {
      var other = Math.floor(Math.random() * (index + 1));
      var value = values[index]; values[index] = values[other]; values[other] = value;
    }
    return values;
  }

  function paint(index) {
    var card = cards[index];
    card.element.className = "card" + (card.matched ? " matched" : card.open ? " flipped" : "");
  }

  function choose(index) {
    var card = cards[index];
    if (locked || card.open || card.matched || open.length === 2) return;
    card.open = true; open.push(index); paint(index);
    if (open.length !== 2) return;
    moves++; movesElement.textContent = String(moves);
    var first = cards[open[0]], second = cards[open[1]];
    locked = true;
    setTimeout(function () {
      if (first.id === second.id) {
        first.matched = second.matched = true;
        matched++;
        matchesElement.textContent = matched + "/8";
        if (matched === 8) winElement.textContent = "All pairs found in " + moves + " moves.";
      } else {
        first.open = second.open = false;
      }
      paint(open[0]); paint(open[1]); open = []; locked = false;
    }, first.id === second.id ? 400 : 900);
  }

  function render() {
    var deck = shuffle([0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7]);
    cards = []; open = []; matched = 0; moves = 0; locked = false;
    movesElement.textContent = "0"; matchesElement.textContent = "0/8"; winElement.textContent = "";
    var elements = [];
    deck.forEach(function (id, index) {
      var button = document.createElement("button");
      var inner = document.createElement("div");
      var back = document.createElement("div");
      var front = document.createElement("div");
      var glow = document.createElement("span");
      button.className = "card"; button.setAttribute("type", "button");
      button.setAttribute("aria-label", "Hidden card");
      inner.className = "card-inner"; back.className = "card-face card-back";
      glow.className = "card-back-glow"; back.append(glow, pawNode());
      front.className = "card-face card-front"; front.append(catNode(cats[id]));
      inner.append(back, front); button.append(inner);
      cards.push({ id: id, element: button, open: false, matched: false });
      button.addEventListener("click", function () { choose(index); });
      elements.push(button);
    });
    board.replaceChildren.apply(board, elements);
  }

  resetButton.addEventListener("click", render);
  render();
}());

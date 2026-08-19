var boardGeometry = {
  width: 760, height: 590,
  columnStep: 52, rowStep: 68, leftInset: 15, topInset: 24,
  layerStepX: 1, layerStepY: 3
};
var sprite = {
  source: "", width: 2048, height: 654,
  tileWidth: 50, tileHeight: 66,
  cellWidth: 204.8, cellHeight: 163.5, leftInset: 47, topInset: 7,
  scale: .435
};
var bonusArt = [];
var resourceUrls = Object.create(null);

function resourceUrl(path) {
  var value = resourceUrls[path];
  if (!value) throw new RangeError("resource is not available: " + path);
  return value;
}
var names = {
  E: "East wind", S: "South wind", W: "West wind", N: "North wind",
  R: "Red dragon", G: "Green dragon", H: "White dragon"
};
var regular = [];
["m", "p", "s"].forEach(function (suit) {
  for (var number = 1; number <= 9; number++) regular.push(suit + number);
});
regular = regular.concat(["E", "S", "W", "N", "R", "H", "G"]);

var solution = [
  [131,57],[126,92],[135,11],[58,99],[143,74],[12,44],[117,10],
  [139,91],[86,141],[134,67],[110,125],[111,56],[0,59],[93,105],
  [85,124],[9,127],[84,140],[122,109],[138,1],[30,2],[29,116],
  [106,73],[3,137],[98,31],[83,20],[115,123],[97,118],[90,132],
  [89,96],[19,136],[104,121],[18,120],[68,130],[114,129],[8,94],
  [72,112],[17,71],[103,45],[46,82],[88,113],[32,119],[128,81],
  [102,4],[47,7],[100,6],[28,55],[80,60],[27,5],[48,95],[61,101],
  [26,54],[69,79],[21,43],[107,87],[49,22],[62,16],[15,33],
  [78,13],[142,14],[63,133],[53,70],[108,25],[50,34],[64,77],
  [24,51],[65,35],[36,76],[66,52],[23,75],[42,37],[38,41],[39,40]
];

var tiles = [];
var buttons = [];
var selected = -1;
var elapsed = 0;
var moves = 0;
var undos = 0;
var history = [];
var showNames = false;
var showStats = false;
var undoEnabled = false;
var noMovesEnabled = false;
var hintEnabled = false;
var settingsOpen = false;
var nameDisplay;
var statsDisplay;
var undoButton;
var hintButton;
var gameStatus;
var winMessage;
var gameGeneration = 0;
var namesSetting;
var statsSetting;
var undoSetting;
var noMovesSetting;
var hintSetting;

function saveConfiguration() {
  sessionStorage.setItem("configuration", [
    showNames, showStats, undoEnabled, noMovesEnabled, hintEnabled
  ].map(function (value) { return value ? "1" : "0"; }).join(""));
}

function saveSetting(name, value) {
  localStorage.setItem(name, value ? "1" : "0");
  saveConfiguration();
}

function storedSetting(name, fallback) {
  var source = localStorage.getItem(name);
  return source === "1" ? true : source === "0" ? false : fallback;
}

function listenSetting(name, apply) {
  function synchronize() {
    apply(storedSetting(name, false));
    saveConfiguration();
  }
  if (typeof localStorage.listen === "function") localStorage.listen(name, synchronize);
  else if (typeof addEventListener === "function") {
    addEventListener("storage", function (event) {
      if (event.storageArea === localStorage && event.key === name) synchronize();
    });
  }
}

function loadConfiguration() {
  var source = sessionStorage.getItem("configuration");
  if (/^[01]{5}$/.test(source || "")) {
    showNames = source[0] === "1";
    showStats = source[1] === "1";
    undoEnabled = source[2] === "1";
    noMovesEnabled = source[3] === "1";
    hintEnabled = source[4] === "1";
  } else {
    showNames = storedSetting("showNames", showNames);
    showStats = storedSetting("showStats", showStats);
    undoEnabled = storedSetting("undoEnabled", undoEnabled);
    noMovesEnabled = storedSetting("noMovesEnabled", noMovesEnabled);
    hintEnabled = storedSetting("hintEnabled", hintEnabled);
  }
}

function positions() {
  var result = [];
  function layer(z, width, height, x, y) {
    for (var row = 0; row < height; row++) {
      for (var column = 0; column < width; column++) {
        result.push({ x: x + column, y: y + row, z: z });
      }
    }
  }
  var rows = [[12,1],[8,3],[10,2],[14,0],[13,.5],[10,2],[8,3],[12,1]];
  rows.forEach(function (row, y) { layer(0, row[0], 1, row[1], y); });
  layer(1, 6, 6, 4, 1);
  layer(2, 4, 4, 5, 2);
  layer(3, 2, 2, 6, 3);
  result.push({ x: 6.5, y: 3.5, z: 4 });
  return result;
}

function shuffle(values) {
  for (var index = values.length - 1; index > 0; index--) {
    var other = Math.floor(Math.random() * (index + 1));
    var value = values[index]; values[index] = values[other]; values[other] = value;
  }
  return values;
}

function assignTiles() {
  var places = positions();
  var types = [];
  regular.forEach(function (type) { types.push(type, type); });
  for (var bonus = 0; bonus < 8; bonus++) types.push("f" + bonus);
  shuffle(types);
  var assigned = new Array(places.length);
  solution.forEach(function (pair) {
    var type = types.pop();
    var match = type[0] === "f" ? (+type.slice(1) < 4 ? "flowers" : "seasons") : type;
    pair.forEach(function (index) {
      assigned[index] = {
        x: places[index].x, y: places[index].y, z: places[index].z,
        type: type, match: match, removed: false
      };
    });
  });
  return assigned;
}

function overlaps(first, second) {
  return Math.abs(first.x - second.x) < 1 && Math.abs(first.y - second.y) < 1;
}

function free(index) {
  var tile = tiles[index], left = false, right = false;
  if (tile.removed) return false;
  for (var other = 0; other < tiles.length; other++) {
    var candidate = tiles[other];
    if (candidate.removed || other === index) continue;
    if (candidate.z > tile.z && overlaps(tile, candidate)) return false;
    if (candidate.z === tile.z && Math.abs(candidate.y - tile.y) < .5) {
      if (candidate.x < tile.x && tile.x - candidate.x <= 1) left = true;
      if (candidate.x > tile.x && candidate.x - tile.x <= 1) right = true;
    }
  }
  return !left || !right;
}

function tileName(type) {
  if (type[0] === "f") return +type.slice(1) < 4 ? "Flower" : "Season";
  return names[type] || type[1] + " " + ({ m: "characters", p: "dots", s: "bamboo" })[type[0]];
}

function spriteCell(type) {
  if (type[0] === "m") return [+type[1] - 1, 0];
  if (type[0] === "p") return [+type[1] - 1, 1];
  if (type[0] === "s") return [+type[1] - 1, 2];
  return [{ E: 0, S: 1, W: 2, N: 3, R: 4, H: 5, G: 6 }[type], 3];
}

function boardUnit(pixels) {
  return pixels / boardGeometry.width * 100 + "cqw";
}

function paint(index) {
  var tile = tiles[index], button = buttons[index], image = button.image;
  var bonus = tile.type[0] === "f";
  button.node.className = "tile" + (bonus ? " bonus" : "") +
    (selected === index ? " selected" : "");
  button.node.hidden = tile.removed;
  button.node.setAttribute("aria-label", tileName(tile.type));
  button.node.style.left = boardUnit(boardGeometry.leftInset +
    tile.x * boardGeometry.columnStep + tile.z * boardGeometry.layerStepX);
  button.node.style.top = boardUnit(boardGeometry.topInset +
    tile.y * boardGeometry.rowStep - tile.z * boardGeometry.layerStepY);
  button.node.style.zIndex = String(10 + tile.z * 100 + Math.round(tile.y * 2));
  image.src = bonus ? bonusArt[+tile.type.slice(1)] : sprite.source;
  if (bonus) {
    image.style.inset = "0"; image.style.left = "0"; image.style.top = "0";
    image.style.width = "100%"; image.style.height = "100%";
    image.style.objectFit = "contain";
  } else {
    var cell = spriteCell(tile.type);
    image.style.inset = "auto"; image.style.objectFit = "fill";
    image.style.width = boardUnit(sprite.width * sprite.scale);
    image.style.height = boardUnit(sprite.height * sprite.scale);
    image.style.left = boardUnit(-(
      cell[0] * sprite.cellWidth + sprite.leftInset
    ) * sprite.scale);
    image.style.top = boardUnit(-(
      cell[1] * sprite.cellHeight + sprite.topInset
    ) * sprite.scale);
  }
}

function render() {
  for (var index = 0; index < tiles.length; index++) paint(index);
}

function updateStats() {
  statsDisplay.textContent = Math.floor(elapsed / 60) + ":" +
    (elapsed % 60 < 10 ? "0" : "") + elapsed % 60 + " · " + moves +
    (moves === 1 ? " move" : " moves") +
    (undoEnabled ? " · " + undos + " undos" : "");
}

function setPressed(button, value) {
  button.setAttribute("aria-pressed", value ? "true" : "false");
}

function availablePair() {
  for (var first = 0; first < tiles.length; first++) {
    if (!free(first)) continue;
    for (var second = first + 1; second < tiles.length; second++) {
      if (free(second) && tiles[first].match === tiles[second].match) return [first, second];
    }
  }
  return null;
}

function tilesRemaining() {
  var count = 0;
  for (var index = 0; index < tiles.length; index++) if (!tiles[index].removed) count++;
  return count;
}

function updateNoMoves() {
  var remaining = tilesRemaining();
  gameStatus.textContent = noMovesEnabled && remaining > 0 && !availablePair() ?
    "No moves remain." : "";
  if (remaining !== 0) return;
  var generation = gameGeneration;
  setTimeout(function () {
    if (generation !== gameGeneration || tilesRemaining() !== 0) return;
    winMessage.hidden = false;
    winMessage.className = "win-message visible";
  }, 1500);
}

function showTileName(index) {
  if (showNames && !tiles[index].removed) nameDisplay.textContent = tileName(tiles[index].type);
}

function hideTileName() {
  nameDisplay.textContent = "";
}

function choose(index) {
  if (!free(index)) return;
  if (selected < 0) selected = index;
  else if (selected === index) selected = -1;
  else {
    if (tiles[selected].match === tiles[index].match) {
      moves++;
      history.push([selected, index]);
      tiles[selected].removed = true;
      tiles[index].removed = true;
    }
    selected = -1;
  }
  updateStats();
  render();
  updateNoMoves();
}

function undo() {
  var pair = history.pop();
  if (!pair) return;
  tiles[pair[0]].removed = false;
  tiles[pair[1]].removed = false;
  selected = -1;
  gameGeneration++;
  winMessage.hidden = true;
  winMessage.className = "win-message";
  undos++;
  updateStats();
  render();
  updateNoMoves();
}

function hint() {
  var pair = availablePair();
  if (!pair) { updateNoMoves(); return; }
  selected = pair[0];
  render();
}

function newGame() {
  gameGeneration++;
  tiles = assignTiles();
  selected = -1;
  elapsed = 0;
  moves = 0;
  undos = 0;
  history = [];
  if (winMessage) {
    winMessage.hidden = true;
    winMessage.className = "win-message";
  }
  hideTileName();
  updateStats();
  render();
  updateNoMoves();
}

function start(resources) {
resourceUrls = resources;
sprite.source = resourceUrl("tiles/ExampleRegular.png");
for (var bonusNumber = 1; bonusNumber <= 4; bonusNumber++) {
  bonusArt.push(resourceUrl("tiles/Flower" + bonusNumber + ".svg"));
}
for (var seasonNumber = 1; seasonNumber <= 4; seasonNumber++) {
  bonusArt.push(resourceUrl("tiles/Season" + seasonNumber + ".svg"));
}

var main = document.getElementById("app");
var header = document.createElement("header");
var title = document.createElement("h1");
title.textContent = "Classic Mahjong Solitaire";
var controls = document.createElement("div");
controls.className = "controls";
loadConfiguration();
statsDisplay = document.createElement("span");
statsDisplay.className = "stats";
statsDisplay.hidden = true;
undoButton = document.createElement("button");
undoButton.className = "action";
undoButton.hidden = true;
undoButton.setAttribute("type", "button");
undoButton.setAttribute("aria-label", "Undo last match");
var undoIcon = document.createElement("img");
undoIcon.className = "control-icon";
undoIcon.src = resourceUrl("icons/undo-2.svg");
var undoText = document.createElement("span");
undoText.textContent = "Undo";
undoButton.append(undoIcon, undoText);
undoButton.addEventListener("click", undo);
hintButton = document.createElement("button");
hintButton.className = "action";
hintButton.hidden = !hintEnabled;
hintButton.setAttribute("type", "button");
hintButton.textContent = "Hint";
hintButton.addEventListener("click", hint);
var newButton = document.createElement("button");
newButton.className = "action";
newButton.setAttribute("type", "button");
newButton.textContent = "New game";
newButton.addEventListener("click", newGame);
var settings = document.createElement("div");
settings.className = "settings";
var settingsButton = document.createElement("button");
settingsButton.className = "action";
settingsButton.setAttribute("type", "button");
settingsButton.setAttribute("aria-label", "Game options");
settingsButton.setAttribute("aria-expanded", "false");
var settingsIcon = document.createElement("img");
settingsIcon.className = "control-icon";
settingsIcon.src = resourceUrl("icons/settings.svg");
settingsButton.append(settingsIcon);
var settingsMenu = document.createElement("div");
settingsMenu.className = "settings-menu";
settingsMenu.hidden = true;
var settingsDismiss = document.createElement("div");
settingsDismiss.className = "settings-dismiss";
settingsDismiss.hidden = true;
function closeSettings() {
  settingsOpen = false;
  settingsMenu.hidden = true;
  settingsDismiss.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}
settingsDismiss.addEventListener("click", closeSettings);
function settingButton(label, callback) {
  var button = document.createElement("button");
  button.className = "setting";
  button.setAttribute("type", "button");
  button.setAttribute("aria-pressed", "false");
  button.textContent = label;
  button.addEventListener("click", function () {
    callback();
    closeSettings();
  });
  return button;
}
namesSetting = settingButton("Show tile names", function () {
  showNames = !showNames;
  setPressed(namesSetting, showNames);
  if (!showNames) hideTileName();
  saveSetting("showNames", showNames);
});
undoSetting = settingButton("Enable undo", function () {
  undoEnabled = !undoEnabled;
  setPressed(undoSetting, undoEnabled);
  undoButton.hidden = !undoEnabled;
  updateStats();
  saveSetting("undoEnabled", undoEnabled);
});
statsSetting = settingButton("Show time / moves", function () {
  showStats = !showStats;
  setPressed(statsSetting, showStats);
  statsDisplay.hidden = !showStats;
  updateStats();
  saveSetting("showStats", showStats);
});
noMovesSetting = settingButton("Inform when no move exists", function () {
  noMovesEnabled = !noMovesEnabled;
  setPressed(noMovesSetting, noMovesEnabled);
  updateNoMoves();
  saveSetting("noMovesEnabled", noMovesEnabled);
});
hintSetting = settingButton("Show hint button", function () {
  hintEnabled = !hintEnabled;
  setPressed(hintSetting, hintEnabled);
  hintButton.hidden = !hintEnabled;
  saveSetting("hintEnabled", hintEnabled);
});
setPressed(namesSetting, showNames);
setPressed(undoSetting, undoEnabled);
setPressed(statsSetting, showStats);
setPressed(noMovesSetting, noMovesEnabled);
setPressed(hintSetting, hintEnabled);
undoButton.hidden = !undoEnabled;
statsDisplay.hidden = !showStats;
settingsMenu.append(namesSetting, undoSetting, statsSetting, noMovesSetting, hintSetting);
listenSetting("showNames", function (value) {
  showNames = value; setPressed(namesSetting, value); if (!value) hideTileName();
});
listenSetting("undoEnabled", function (value) {
  undoEnabled = value; setPressed(undoSetting, value); undoButton.hidden = !value; updateStats();
});
listenSetting("showStats", function (value) {
  showStats = value; setPressed(statsSetting, value); statsDisplay.hidden = !value; updateStats();
});
listenSetting("noMovesEnabled", function (value) {
  noMovesEnabled = value; setPressed(noMovesSetting, value); updateNoMoves();
});
listenSetting("hintEnabled", function (value) {
  hintEnabled = value; setPressed(hintSetting, value); hintButton.hidden = !value;
});
settingsButton.addEventListener("click", function () {
  settingsOpen = !settingsOpen;
  settingsMenu.hidden = !settingsOpen;
  settingsDismiss.hidden = !settingsOpen;
  settingsButton.setAttribute("aria-expanded", settingsOpen ? "true" : "false");
});
settings.append(settingsButton, settingsDismiss, settingsMenu);
controls.append(statsDisplay, undoButton, hintButton, newButton, settings);
header.append(title, controls);

var game = document.createElement("section");
game.className = "game";
var scroll = document.createElement("div");
scroll.className = "board-scroll";
var board = document.createElement("div");
board.className = "board";
board.setAttribute("role", "grid");
board.setAttribute("aria-label", "Mahjong solitaire turtle layout");
for (var index = 0; index < 144; index++) {
  (function (tileIndex) {
    var button = document.createElement("button");
    var image = document.createElement("img");
    button.setAttribute("type", "button");
    button.setAttribute("role", "gridcell");
    button.addEventListener("click", function () { choose(tileIndex); });
    button.addEventListener("pointerenter", function () { showTileName(tileIndex); });
    button.addEventListener("pointerleave", hideTileName);
    button.addEventListener("focus", function () { showTileName(tileIndex); });
    button.addEventListener("blur", hideTileName);
    button.append(image);
    board.append(button);
    buttons.push({ node: button, image: image });
  })(index);
}
winMessage = document.createElement("div");
winMessage.className = "win-message";
winMessage.hidden = true;
winMessage.textContent = "You Win!";
board.append(winMessage);
nameDisplay = document.createElement("div");
nameDisplay.className = "tile-name-display";
gameStatus = document.createElement("div");
gameStatus.className = "game-status";
scroll.append(board, nameDisplay); game.append(scroll, gameStatus);

var footer = document.createElement("footer");
var modal = document.createElement("div");
modal.className = "modal";
modal.hidden = true;
var modalCard = document.createElement("div");
modalCard.className = "modal-card";
var modalHeader = document.createElement("header");
var modalTitle = document.createElement("span");
var modalClose = document.createElement("button");
modalClose.className = "action";
modalClose.setAttribute("type", "button");
modalClose.textContent = "Close";
modalClose.addEventListener("click", function () { modal.hidden = true; });
modalHeader.append(modalTitle, modalClose);
var modalUrl = document.createElement("input");
modalUrl.setAttribute("type", "text");
modalUrl.setAttribute("readonly", "");
modalCard.append(modalHeader, modalUrl);
modal.append(modalCard);
function openCredit(label, url) {
  modalTitle.textContent = label;
  modalUrl.value = url;
  modal.hidden = false;
}
function creditButton(label, url) {
  var button = document.createElement("button");
  button.setAttribute("type", "button");
  button.setAttribute("data-href", url);
  button.textContent = label;
  button.addEventListener("click", function () { openCredit(label, url); });
  return button;
}
footer.append(
  creditButton("Tile art: FluffyStuff/xhokir, CC BY 4.0", "https://github.com/xhokir/riichi-mahjong-tiles"),
  creditButton("Icons: Lucide, ISC", "https://lucide.dev")
);
main.append(header, game, footer, modal);
newGame();
setInterval(function () {
  elapsed++;
  if (showStats) updateStats();
}, 1000);
}

var resourcePaths = [
  "tiles/ExampleRegular.png",
  "tiles/Flower1.svg", "tiles/Flower2.svg",
  "tiles/Flower3.svg", "tiles/Flower4.svg",
  "tiles/Season1.svg", "tiles/Season2.svg",
  "tiles/Season3.svg", "tiles/Season4.svg",
  "icons/settings.svg", "icons/undo-2.svg"
];
Promise.all(resourcePaths.map(function (path) {
  return fetch("./" + path).then(function (response) {
    if (!response.ok) throw new Error(path + " was not found");
    return response.resourceUrl();
  }).then(function (url) { return [path, url]; });
})).then(function (entries) {
  var resources = Object.create(null);
  entries.forEach(function (entry) { resources[entry[0]] = entry[1]; });
  start(resources);
});

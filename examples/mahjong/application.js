import { assignTiles, isFree, positions, spriteCell, tileName } from "./game-model.js";
const boardGeometry = {
  width: 760,
  height: 590,
  columnStep: 52,
  rowStep: 68,
  leftInset: 15,
  topInset: 24,
  layerStepX: 1,
  layerStepY: 3
};
const sprite = {
  source: "",
  width: 2048,
  height: 654,
  tileWidth: 50,
  tileHeight: 66,
  cellWidth: 204.8,
  cellHeight: 163.5,
  leftInset: 47,
  topInset: 7,
  scale: .435
};
const bonusArt = [];
const imageSources = new Map();
const tileImages = new Map();
let resourceUrls = Object.create(null);
function resourceUrl(path) {
  const value = resourceUrls[path];
  if (!value) throw new RangeError("resource is not available: " + path);
  return value;
}
let tiles = [];
const buttons = [];
let selected = -1;
let elapsed = 0;
let moves = 0;
let undos = 0;
let history = [];
let showNames = false;
let showStats = false;
let undoEnabled = false;
let noMovesEnabled = false;
let hintEnabled = false;
let settingsOpen = false;
let nameDisplay;
let statsDisplay;
let undoButton;
let hintButton;
let gameStatus;
let winMessage;
let gameGeneration = 0;
let namesSetting;
let statsSetting;
let undoSetting;
let noMovesSetting;
let hintSetting;
const free = index => isFree(tiles, index);
function saveConfiguration() {
  sessionStorage.setItem("configuration", [showNames, showStats, undoEnabled, noMovesEnabled, hintEnabled].map(value => {
    return value ? "1" : "0";
  }).join(""));
}
function saveSetting(name, value) {
  localStorage.setItem(name, value ? "1" : "0");
  saveConfiguration();
}
function storedSetting(name, fallback) {
  const source = localStorage.getItem(name);
  return source === "1" ? true : source === "0" ? false : fallback;
}
function listenSetting(name, apply) {
  function synchronize() {
    apply(storedSetting(name, false));
    saveConfiguration();
  }
  if (typeof localStorage.listen === "function") localStorage.listen(name, synchronize);else if (typeof addEventListener === "function") {
    addEventListener("storage", event => {
      if (event.storageArea === localStorage && event.key === name) synchronize();
    });
  }
}
function loadConfiguration() {
  const source = sessionStorage.getItem("configuration");
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
function boardUnit(pixels) {
  return pixels / boardGeometry.width * 100 + "cqw";
}
function paint(index, layout) {
  const tile = tiles[index], button = buttons[index];
  const bonus = tile.type[0] === "f";
  const state = `${tile.removed}/${selected === index}/${bonus}`;
  if (button.state !== state) {
    button.node.className = "tile" + (bonus ? " bonus" : "") + (selected === index ? " selected" : "");
    button.node.hidden = tile.removed;
    button.state = state;
  }
  // Selection and removal do not change tile artwork or placement. Avoid
  // resending the large sprite URL through the bridge on every click.
  if (!layout) return;
  button.node.setAttribute("aria-label", tileName(tile.type));
  if (!button.positioned) {
    button.node.style.left = boardUnit(boardGeometry.leftInset + tile.x * boardGeometry.columnStep + tile.z * boardGeometry.layerStepX);
    button.node.style.top = boardUnit(boardGeometry.topInset + tile.y * boardGeometry.rowStep - tile.z * boardGeometry.layerStepY);
    button.node.style.zIndex = String(10 + tile.z * 100 + Math.round(tile.y * 2));
    button.positioned = true;
  }
  if (button.type !== tile.type) {
    button.node.replaceChildren(tileImage(tile.type).cloneNode(false));
    button.type = tile.type;
  }
}

// Transfer each image source only once. Ordinary DOM cloning then shares the
// browser's decoded artwork without copying its data URL across Wasm again.
function tileImage(type) {
  if (tileImages.has(type)) return tileImages.get(type);
  const bonus = type[0] === "f";
  const source = bonus ? bonusArt[+type.slice(1)] : sprite.source;
  if (!imageSources.has(source)) {
    const image = document.createElement("img");
    image.src = source;
    imageSources.set(source, image);
  }
  const image = imageSources.get(source).cloneNode(false);
  if (bonus) {
    image.style.inset = "0";
    image.style.left = "0";
    image.style.top = "0";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "contain";
  } else {
    const cell = spriteCell(type);
    image.style.inset = "auto";
    image.style.objectFit = "fill";
    image.style.width = boardUnit(sprite.width * sprite.scale);
    image.style.height = boardUnit(sprite.height * sprite.scale);
    image.style.left = boardUnit(-(cell[0] * sprite.cellWidth + sprite.leftInset) * sprite.scale);
    image.style.top = boardUnit(-(cell[1] * sprite.cellHeight + sprite.topInset) * sprite.scale);
  }
  tileImages.set(type, image);
  return image;
}
function render(layout = false) {
  for (let index = 0; index < tiles.length; index++) paint(index, layout);
}
function updateStats() {
  statsDisplay.textContent = Math.floor(elapsed / 60) + ":" + (elapsed % 60 < 10 ? "0" : "") + elapsed % 60 + " · " + moves + (moves === 1 ? " move" : " moves") + (undoEnabled ? " · " + undos + " undos" : "");
}
function setPressed(button, value) {
  button.setAttribute("aria-pressed", value ? "true" : "false");
}
function availablePair() {
  for (let first = 0; first < tiles.length; first++) {
    if (!free(first)) continue;
    for (let second = first + 1; second < tiles.length; second++) {
      if (free(second) && tiles[first].match === tiles[second].match) return [first, second];
    }
  }
  return null;
}
function tilesRemaining() {
  let count = 0;
  for (let index = 0; index < tiles.length; index++) if (!tiles[index].removed) count++;
  return count;
}
function updateNoMoves() {
  const remaining = tilesRemaining();
  gameStatus.textContent = noMovesEnabled && remaining > 0 && !availablePair() ? "No moves remain." : "";
  if (remaining !== 0) return;
  const generation = gameGeneration;
  setTimeout(() => {
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
  if (selected < 0) selected = index;else if (selected === index) selected = -1;else {
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
  const pair = history.pop();
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
  const pair = availablePair();
  if (!pair) {
    updateNoMoves();
    return;
  }
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
  render(true);
  updateNoMoves();
}
function start(resources) {
  resourceUrls = resources;
  sprite.source = resourceUrl("tiles/ExampleRegular.png");
  for (let bonusNumber = 1; bonusNumber <= 4; bonusNumber++) {
    bonusArt.push(resourceUrl("tiles/Flower" + bonusNumber + ".svg"));
  }
  for (let seasonNumber = 1; seasonNumber <= 4; seasonNumber++) {
    bonusArt.push(resourceUrl("tiles/Season" + seasonNumber + ".svg"));
  }
  const main = document.getElementById("app");
  const header = document.createElement("header");
  const title = document.createElement("h1");
  title.textContent = "Classic Mahjong Solitaire";
  const controls = document.createElement("div");
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
  const undoIcon = document.createElement("img");
  undoIcon.className = "control-icon";
  undoIcon.src = resourceUrl("icons/undo-2.svg");
  const undoText = document.createElement("span");
  undoText.textContent = "Undo";
  undoButton.append(undoIcon, undoText);
  undoButton.addEventListener("click", undo);
  hintButton = document.createElement("button");
  hintButton.className = "action";
  hintButton.hidden = !hintEnabled;
  hintButton.setAttribute("type", "button");
  hintButton.textContent = "Hint";
  hintButton.addEventListener("click", hint);
  const newButton = document.createElement("button");
  newButton.className = "action";
  newButton.setAttribute("type", "button");
  newButton.textContent = "New game";
  newButton.addEventListener("click", newGame);
  const settings = document.createElement("div");
  settings.className = "settings";
  const settingsButton = document.createElement("button");
  settingsButton.className = "action";
  settingsButton.setAttribute("type", "button");
  settingsButton.setAttribute("aria-label", "Game options");
  settingsButton.setAttribute("aria-expanded", "false");
  const settingsIcon = document.createElement("img");
  settingsIcon.className = "control-icon";
  settingsIcon.src = resourceUrl("icons/settings.svg");
  settingsButton.append(settingsIcon);
  const settingsMenu = document.createElement("div");
  settingsMenu.className = "settings-menu";
  settingsMenu.hidden = true;
  const settingsDismiss = document.createElement("div");
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
    const button = document.createElement("button");
    button.className = "setting";
    button.setAttribute("type", "button");
    button.setAttribute("aria-pressed", "false");
    button.textContent = label;
    button.addEventListener("click", () => {
      callback();
      closeSettings();
    });
    return button;
  }
  namesSetting = settingButton("Show tile names", () => {
    showNames = !showNames;
    setPressed(namesSetting, showNames);
    if (!showNames) hideTileName();
    saveSetting("showNames", showNames);
  });
  undoSetting = settingButton("Enable undo", () => {
    undoEnabled = !undoEnabled;
    setPressed(undoSetting, undoEnabled);
    undoButton.hidden = !undoEnabled;
    updateStats();
    saveSetting("undoEnabled", undoEnabled);
  });
  statsSetting = settingButton("Show time / moves", () => {
    showStats = !showStats;
    setPressed(statsSetting, showStats);
    statsDisplay.hidden = !showStats;
    updateStats();
    saveSetting("showStats", showStats);
  });
  noMovesSetting = settingButton("Inform when no move exists", () => {
    noMovesEnabled = !noMovesEnabled;
    setPressed(noMovesSetting, noMovesEnabled);
    updateNoMoves();
    saveSetting("noMovesEnabled", noMovesEnabled);
  });
  hintSetting = settingButton("Show hint button", () => {
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
  listenSetting("showNames", value => {
    showNames = value;
    setPressed(namesSetting, value);
    if (!value) hideTileName();
  });
  listenSetting("undoEnabled", value => {
    undoEnabled = value;
    setPressed(undoSetting, value);
    undoButton.hidden = !value;
    updateStats();
  });
  listenSetting("showStats", value => {
    showStats = value;
    setPressed(statsSetting, value);
    statsDisplay.hidden = !value;
    updateStats();
  });
  listenSetting("noMovesEnabled", value => {
    noMovesEnabled = value;
    setPressed(noMovesSetting, value);
    updateNoMoves();
  });
  listenSetting("hintEnabled", value => {
    hintEnabled = value;
    setPressed(hintSetting, value);
    hintButton.hidden = !value;
  });
  settingsButton.addEventListener("click", () => {
    settingsOpen = !settingsOpen;
    settingsMenu.hidden = !settingsOpen;
    settingsDismiss.hidden = !settingsOpen;
    settingsButton.setAttribute("aria-expanded", settingsOpen ? "true" : "false");
  });
  settings.append(settingsButton, settingsDismiss, settingsMenu);
  controls.append(statsDisplay, undoButton, hintButton, newButton, settings);
  header.append(title, controls);
  const game = document.createElement("section");
  game.className = "game";
  const scroll = document.createElement("div");
  scroll.className = "board-scroll";
  const board = document.createElement("div");
  board.className = "board";
  board.setAttribute("role", "grid");
  board.setAttribute("aria-label", "Mahjong solitaire turtle layout");
  for (const [tileIndex] of positions().entries()) {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("role", "gridcell");
    button.addEventListener("click", () => {
      choose(tileIndex);
    });
    button.addEventListener("pointerenter", () => {
      showTileName(tileIndex);
    });
    button.addEventListener("pointerleave", hideTileName);
    button.addEventListener("focus", () => {
      showTileName(tileIndex);
    });
    button.addEventListener("blur", hideTileName);
    board.append(button);
    buttons.push({ node: button });
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
  scroll.append(board, nameDisplay);
  game.append(scroll, gameStatus);
  const footer = document.createElement("footer");
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.hidden = true;
  const modalCard = document.createElement("div");
  modalCard.className = "modal-card";
  const modalHeader = document.createElement("header");
  const modalTitle = document.createElement("span");
  const modalClose = document.createElement("button");
  modalClose.className = "action";
  modalClose.setAttribute("type", "button");
  modalClose.textContent = "Close";
  modalClose.addEventListener("click", () => {
    modal.hidden = true;
  });
  modalHeader.append(modalTitle, modalClose);
  const modalUrl = document.createElement("input");
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
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("data-href", url);
    button.textContent = label;
    button.addEventListener("click", () => {
      openCredit(label, url);
    });
    return button;
  }
  footer.append(creditButton("Tile art: FluffyStuff/xhokir, CC BY 4.0", "https://github.com/xhokir/riichi-mahjong-tiles"), creditButton("Icons: Lucide, ISC", "https://lucide.dev"));
  main.append(header, game, footer, modal);
  newGame();
  setInterval(() => {
    elapsed++;
    if (showStats) updateStats();
  }, 1000);
}
const resourcePaths = ["tiles/ExampleRegular.png", "tiles/Flower1.svg", "tiles/Flower2.svg", "tiles/Flower3.svg", "tiles/Flower4.svg", "tiles/Season1.svg", "tiles/Season2.svg", "tiles/Season3.svg", "tiles/Season4.svg", "icons/settings.svg", "icons/undo-2.svg"];
async function main() {
  const entries = await Promise.all(resourcePaths.map(async path => {
    const response = await fetch(`./${path}`);
    if (!response.ok) throw new Error(`${path} was not found`);
    return [path, await response.resourceUrl()];
  }));
  start(Object.fromEntries(entries));
}
main().catch(error => {
  document.getElementById("app").textContent = `Unable to load Mahjong: ${error.message}`;
});

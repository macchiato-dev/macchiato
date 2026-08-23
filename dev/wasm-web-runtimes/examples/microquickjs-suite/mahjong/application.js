function start(resourceBytes) {
resourceFiles = unpackResources(resourceBytes);
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

fetch("./resources.bin").then(function (response) {
  if (!response.ok) throw new Error("resources.bin was not found");
  return response.arrayBuffer();
}).then(start);

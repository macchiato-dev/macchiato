import { Terminal } from "@xterm/xterm";
import xtermCss from "@xterm/xterm/css/xterm.css";

const style = document.createElement("style");
const browserCss = xtermCss.replace(/^\s*-ms-user-select:[^;]+;\s*$/gm, "");
style.textContent = `${browserCss}
  :root { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  * { box-sizing: border-box; }
  body { display: block; margin: 0; min-height: 100vh; background: #090d14; color: #d8e2f0; padding: 24px; }
  main { width: 920px; max-width: 100%; min-width: 0; margin: clamp(24px, 10vh, 120px) auto 0; }
  header { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 14px; }
  h1 { margin: 0; color: #69e6d3; font-size: clamp(26px, 5vw, 42px); }
  p { margin: 5px 0 0; color: #8fa3ba; font: 14px ui-sans-serif, system-ui, sans-serif; }
  button { border: 1px solid #38536b; border-radius: 8px; background: #172232; color: #d8e2f0; padding: 8px 13px; cursor: pointer; }
  button:hover { border-color: #69e6d3; background: #203147; }
  #terminal-shell { min-height: 470px; padding: 14px; overflow: auto; border: 1px solid #2e465d; border-radius: 12px; background: #10141c; box-shadow: 0 24px 60px #0008; }
  #terminal { height: 440px; }
`;
document.head.appendChild(style);
const main = document.createElement("main");
main.innerHTML = `<header><div><h1>QuickJS Pong</h1><p>W/S or arrows move · Space pauses · R resets</p></div>
  <button id="new-game" type="button">New game</button></header>
  <div id="terminal-shell"><div id="terminal"></div></div>`;
document.body.replaceChildren(main);

const terminal = new Terminal({
  cols: 64, rows: 22, scrollback: 200, convertEol: true, cursorBlink: false,
  fontFamily: '"Courier New", ui-monospace, monospace',
  theme: { background: "#10141c", foreground: "#d8e2f0", cursor: "#69e6d3",
    selectionBackground: "#36566f", selectionForeground: "#f7fbff" },
});
terminal.open(document.getElementById("terminal"));
let pong;
const position = (row, column) => `\x1b[${row};${column}H`;
const TICK_MS = 40;
const START_SPEED = .64;
const MAX_SPEED = .92;
const MAX_BOUNCE_ANGLE = Math.PI * .32;

function resetBall(direction = Math.random() < .5 ? -1 : 1) {
  pong.ballX = pong.width / 2; pong.ballY = pong.height / 2;
  const angle = (Math.random() - .5) * .5;
  pong.velocityX = Math.cos(angle) * START_SPEED * direction;
  pong.velocityY = Math.sin(angle) * START_SPEED;
}

function returnBall(paddleY, direction) {
  const impact = Math.max(-1, Math.min(1, (pong.ballY - paddleY) / 1.5));
  const angle = impact * MAX_BOUNCE_ANGLE;
  const speed = Math.min(MAX_SPEED, Math.hypot(pong.velocityX, pong.velocityY) * 1.035);
  pong.velocityX = Math.cos(angle) * speed * direction;
  pong.velocityY = Math.sin(angle) * speed;
}

function render() {
  const rows = [`\x1b[1;36m PONG   ${pong.playerScore} : ${pong.computerScore}   W/S or ↑/↓ · Space pause · R reset\x1b[0m`,
    `\x1b[38;5;39m+${"-".repeat(pong.width)}+\x1b[0m`];
  const computerRow = Math.round(pong.computerY);
  for (let y = 0; y < pong.height; y += 1) {
    const cells = Array(pong.width).fill(" ");
    if (Math.abs(y - pong.playerY) <= 1) cells[1] = "#";
    if (Math.abs(y - computerRow) <= 1) cells[pong.width - 2] = "#";
    cells[Math.max(2, Math.min(pong.width - 3, Math.round(pong.ballX)))] =
      Math.round(pong.ballY) === y ? "o" : cells[Math.max(2, Math.min(pong.width - 3, Math.round(pong.ballX)))];
    if (pong.paused && y === Math.floor(pong.height / 2)) {
      const message = " PAUSED ", start = Math.floor((pong.width - message.length) / 2);
      for (let x = 0; x < message.length; x += 1) cells[start + x] = message[x];
    }
    rows.push(`\x1b[38;5;39m|\x1b[0m${cells.join("")}\x1b[38;5;39m|\x1b[0m`);
  }
  rows.push(`\x1b[38;5;39m+${"-".repeat(pong.width)}+\x1b[0m`);
  terminal.write(`\x1b[?25l\x1b[H${rows.join("\r\n")}\x1b[J`);
}

function update() {
  if (!pong || pong.paused) return;
  pong.computerY += Math.sign(pong.ballY - pong.computerY) * .2;
  pong.computerY = Math.max(1, Math.min(pong.height - 2, pong.computerY));
  pong.ballX += pong.velocityX; pong.ballY += pong.velocityY;
  if (pong.ballY <= 0 || pong.ballY >= pong.height - 1) {
    pong.ballY = Math.max(0, Math.min(pong.height - 1, pong.ballY)); pong.velocityY *= -1;
  }
  if (pong.velocityX < 0 && pong.ballX <= 2 && Math.abs(pong.ballY - pong.playerY) <= 1.6) {
    pong.ballX = 2; returnBall(pong.playerY, 1);
  }
  if (pong.velocityX > 0 && pong.ballX >= pong.width - 3 && Math.abs(pong.ballY - pong.computerY) <= 1.6) {
    pong.ballX = pong.width - 3; returnBall(pong.computerY, -1);
  }
  if (pong.ballX < 0) { pong.computerScore += 1; resetBall(1); }
  if (pong.ballX >= pong.width) { pong.playerScore += 1; resetBall(-1); }
  pong.frames += 1; render();
}

function move(amount) { pong.playerY = Math.max(1, Math.min(pong.height - 2, pong.playerY + amount)); render(); }
function newGame() {
  if (pong?.timer) clearInterval(pong.timer);
  pong = { width: 58, height: 15, playerY: 7, computerY: 7, ballX: 29, ballY: 7,
    velocityX: -START_SPEED, velocityY: .2, playerScore: 0, computerScore: 0, paused: false, frames: 0 };
  render(); pong.timer = setInterval(update, TICK_MS); terminal.focus();
}
terminal.onData(data => {
  if (data === "\x1b[A" || data.toLowerCase() === "w") move(-1);
  else if (data === "\x1b[B" || data.toLowerCase() === "s") move(1);
  else if (data === " ") { pong.paused = !pong.paused; render(); }
  else if (data.toLowerCase() === "r") newGame();
});
document.getElementById("new-game").addEventListener("click", newGame);
newGame();
globalThis.__wwcResult = () => `xterm:pong:frames=${pong.frames}:playerY=${pong.playerY}`;

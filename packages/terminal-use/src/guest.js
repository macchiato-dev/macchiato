import { Terminal } from "@xterm/xterm";

const terminal = new Terminal({
  cols: 80, rows: 24, scrollback: 1_000, convertEol: true, cursorBlink: true,
  theme: { background: "#10141c", foreground: "#d8e2f0", cursor: "#69e6d3" },
});
terminal.open(document.getElementById("terminal"));
let pong = null;

function terminalPosition(row, column) { return `\x1b[${row};${column}H`; }

function renderPong(previous = null) {
  const { width, height, playerY, computerY, ballX, ballY, playerScore, computerScore, paused } = pong;
  if (previous && !paused) {
    let output = "\x1b[?25l";
    const cell = (x, y, value) => {
      x = Math.max(0, Math.min(width - 1, x));
      y = Math.max(0, Math.min(height - 1, y));
      output += `${terminalPosition(3 + y, 2 + x)}${value}`;
    };
    for (let offset = -1; offset <= 1; offset += 1) {
      cell(1, previous.playerY + offset, " ");
      cell(width - 2, previous.computerY + offset, " ");
      cell(1, playerY + offset, "#");
      cell(width - 2, computerY + offset, "#");
    }
    cell(Math.round(previous.ballX), Math.round(previous.ballY), " ");
    cell(Math.round(ballX), Math.round(ballY), "o");
    if (previous.playerScore !== playerScore || previous.computerScore !== computerScore) {
      output += `${terminalPosition(1, 1)}\x1b[1;36m terminal-use pong\x1b[0m   ${playerScore} : ${computerScore}`;
    }
    terminal.write(output);
    return;
  }
  const rows = [];
  rows.push(`\x1b[1;36m terminal-use pong\x1b[0m   ${playerScore} : ${computerScore}   \x1b[2mW/S or ↑/↓ · Space pause · R reset\x1b[0m`);
  rows.push(`\x1b[38;5;39m+${"-".repeat(width)}+\x1b[0m`);
  for (let y = 0; y < height; y += 1) {
    const cells = Array(width).fill(" ");
    if (Math.abs(y - playerY) <= 1) cells[1] = "#";
    if (Math.abs(y - computerY) <= 1) cells[width - 2] = "#";
    if (Math.round(ballY) === y) cells[Math.max(2, Math.min(width - 3, Math.round(ballX)))] = "o";
    if (paused && y === Math.floor(height / 2)) {
      const message = " PAUSED ";
      const start = Math.floor((width - message.length) / 2);
      for (let x = 0; x < message.length; x += 1) cells[start + x] = message[x];
    }
    rows.push(`\x1b[38;5;39m|\x1b[0m${cells.join("")}\x1b[38;5;39m|\x1b[0m`);
  }
  rows.push(`\x1b[38;5;39m+${"-".repeat(width)}+\x1b[0m`);
  terminal.write(`\x1b[?25l\x1b[H${rows.join("\r\n")}\x1b[J`);
}

function resetBall(direction = Math.random() < 0.5 ? -1 : 1) {
  pong.ballX = pong.width / 2;
  pong.ballY = pong.height / 2;
  pong.velocityX = 0.72 * direction;
  pong.velocityY = Math.random() * 0.6 - 0.3;
}

function updatePong() {
  if (!pong || pong.paused) return;
  const previous = { ...pong };
  pong.computerY += Math.sign(pong.ballY - pong.computerY) * 0.34;
  pong.computerY = Math.max(1, Math.min(pong.height - 2, pong.computerY));
  pong.ballX += pong.velocityX;
  pong.ballY += pong.velocityY;
  if (pong.ballY <= 0 || pong.ballY >= pong.height - 1) {
    pong.ballY = Math.max(0, Math.min(pong.height - 1, pong.ballY));
    pong.velocityY *= -1;
  }
  if (pong.velocityX < 0 && pong.ballX <= 2 && Math.abs(pong.ballY - pong.playerY) <= 2) {
    pong.ballX = 2;
    pong.velocityX = Math.min(1.15, -pong.velocityX * 1.04);
    pong.velocityY += (pong.ballY - pong.playerY) * 0.12;
  }
  if (pong.velocityX > 0 && pong.ballX >= pong.width - 3 && Math.abs(pong.ballY - pong.computerY) <= 2) {
    pong.ballX = pong.width - 3;
    pong.velocityX = Math.max(-1.15, -pong.velocityX * 1.04);
    pong.velocityY += (pong.ballY - pong.computerY) * 0.12;
  }
  if (pong.ballX < 0) { pong.computerScore += 1; resetBall(1); }
  if (pong.ballX >= pong.width) { pong.playerScore += 1; resetBall(-1); }
  renderPong(previous);
  pong.frames += 1;
}

function movePlayer(amount) {
  const previous = { ...pong };
  pong.playerY = Math.max(1, Math.min(pong.height - 2, pong.playerY + amount));
  renderPong(previous);
}

terminal.onData((data) => {
  if (pong) {
    if (data === "\x1b[A" || data.toLowerCase() === "w") movePlayer(-1);
    else if (data === "\x1b[B" || data.toLowerCase() === "s") movePlayer(1);
    else if (data === " ") { pong.paused = !pong.paused; renderPong(); }
    else if (data.toLowerCase() === "r") { pong.playerScore = 0; pong.computerScore = 0; resetBall(); renderPong(); }
    return;
  }
  globalThis.__browserUseNotify(JSON.stringify({ type: "data", data }));
});

globalThis.__terminalConfigure = (json) => {
  const limits = JSON.parse(json);
  terminal.options.scrollback = limits.scrollback;
  terminal.resize(limits.columns, limits.rows);
  return JSON.stringify({ columns: terminal.cols, rows: terminal.rows });
};
globalThis.__terminalWrite = (json) => {
  const { text } = JSON.parse(json);
  terminal.write(text);
  return JSON.stringify({ accepted: text.length });
};
globalThis.__terminalStartPong = () => {
  if (pong?.timer) clearInterval(pong.timer);
  pong = {
    width: Math.min(54, terminal.cols - 2), height: Math.min(14, terminal.rows - 4),
    playerY: 7, computerY: 7, ballX: 27, ballY: 7,
    velocityX: -0.72, velocityY: 0.24, playerScore: 0, computerScore: 0,
    paused: false, frames: 0, timer: null,
  };
  terminal.clear();
  renderPong();
  // Four terminal frames per second are enough for the reference game while
  // keeping the ANSI parser and DOM projection budget intentionally tight.
  // Let xterm finish parsing and projecting the initial full frame before
  // incremental animation begins; otherwise writes can outpace a constrained
  // DOM bridge during startup.
  pong.timer = setTimeout(() => { pong.timer = setInterval(updatePong, 250); }, 750);
  terminal.focus();
  return JSON.stringify({ started: true });
};
globalThis.__terminalStopPong = () => {
  if (pong?.timer) clearInterval(pong.timer);
  pong = null;
  terminal.reset();
  terminal.focus();
  return JSON.stringify({ stopped: true });
};
globalThis.__terminalInspect = () => JSON.stringify({
  columns: terminal.cols, rows: terminal.rows,
  cursorX: terminal.buffer.active.cursorX, cursorY: terminal.buffer.active.cursorY,
  lines: terminal.buffer.active.length,
  pong: pong ? {
    playerY: pong.playerY, ballX: pong.ballX, ballY: pong.ballY,
    playerScore: pong.playerScore, computerScore: pong.computerScore,
    paused: pong.paused, frames: pong.frames,
  } : null,
});
globalThis.__browserUseNotify(JSON.stringify({ type: "ready" }));

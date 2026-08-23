import { Terminal } from "@xterm/xterm";
import xtermCss from "@xterm/xterm/css/xterm.css";

const style = document.createElement("style");
style.textContent = `${xtermCss.replace(/^\s*-ms-user-select:[^;]+;\s*$/gm, "")}
  :root { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #090d14; color: #d8e2f0; padding: 24px; }
  main { width: min(920px, 100%); margin: clamp(24px, 10vh, 120px) auto 0; }
  h1 { margin: 0; color: #69e6d3; font-size: clamp(28px, 5vw, 44px); }
  p { margin: 5px 0 16px; color: #8fa3ba; font: 14px ui-sans-serif, system-ui, sans-serif; }
  #terminal-shell { min-height: 470px; padding: 14px; overflow: auto; border: 1px solid #2e465d;
    border-radius: 12px; background: #10141c; box-shadow: 0 24px 60px #0008; }
  #terminal { height: 440px; }
`;
document.head.appendChild(style);

const main = document.createElement("main");
main.innerHTML = `<h1>Interactive terminal</h1>
  <p>A small guest shell with history, completion, and a virtual filesystem.</p>
  <div id="terminal-shell"><div id="terminal"></div></div>`;
document.body.replaceChildren(main);

const terminal = new Terminal({
  cols: 72, rows: 22, scrollback: 500, convertEol: true, cursorBlink: true,
  fontFamily: '"Courier New", ui-monospace, monospace',
  theme: { background: "#10141c", foreground: "#d8e2f0", cursor: "#69e6d3",
    selectionBackground: "#36566f", selectionForeground: "#f7fbff" },
});
terminal.open(document.getElementById("terminal"));
const files = {
  "README.txt": "This shell, xterm.js, and its state all execute inside QuickJS WebAssembly.",
  "notes.txt": "Selection stays stable because output changes only when you enter a command.",
  "links.txt": "Project: https://macchiato.dev/\r\nTerminal: https://xtermjs.org/",
};
const commands = ["help", "ls", "cat", "echo", "status", "clear"];
const prompt = () => terminal.write("\x1b[32mguest\x1b[0m:\x1b[36m/notes\x1b[0m$ ");
terminal.write("\x1b[1;36mQuickJS field terminal\x1b[0m\r\n" +
  "Explore a tiny filesystem. Type \x1b[33mhelp\x1b[0m to begin.\r\n\r\n");
prompt();

let line = "", history = [], historyAt = 0;
function replaceLine(next) {
  while (line.length) { terminal.write("\b \b"); line = line.slice(0, -1); }
  line = next; terminal.write(line);
}
function execute(source) {
  const [command = "", ...args] = source.trim().split(/\s+/);
  const argument = args.join(" ");
  if (!command) return;
  if (command === "help") {
    terminal.write("Commands: help, ls, cat <file>, echo <text>, status, clear\r\n" +
      "Use Tab to complete commands and ↑/↓ for history.");
  } else if (command === "ls") {
    terminal.write(Object.keys(files).join("  "));
  } else if (command === "cat") {
    terminal.write(files[argument] || `cat: ${argument || "file"}: not found`);
  } else if (command === "echo") {
    terminal.write(argument);
  } else if (command === "status") {
    terminal.write("runtime=QuickJS  boundary=wasm-web-machine  network=blocked");
  } else if (command === "clear") {
    terminal.clear();
  } else {
    terminal.write(`${command}: command not found`);
  }
}
terminal.onData(data => {
  if (data === "\r") {
    terminal.write("\r\n");
    execute(line);
    if (line.trim()) history.push(line);
    historyAt = history.length;
    line = "";
    terminal.write("\r\n"); prompt();
  } else if (data === "\x7f") {
    if (line) { line = line.slice(0, -1); terminal.write("\b \b"); }
  } else if (data === "\x03") {
    terminal.write("^C\r\n"); line = ""; prompt();
  } else if (data === "\t") {
    const matches = commands.filter(command => command.startsWith(line));
    if (matches.length === 1) replaceLine(matches[0] + " ");
  } else if (data === "\x1b[A" || data === "\x1b[B") {
    historyAt = Math.max(0, Math.min(history.length,
      historyAt + (data === "\x1b[A" ? -1 : 1)));
    replaceLine(history[historyAt] || "");
  } else if (data >= " " && data !== "\x7f") {
    line += data;
    terminal.write(data);
  }
});
terminal.focus();
globalThis.__wwcResult = () => `xterm:terminal:length=${line.length}`;

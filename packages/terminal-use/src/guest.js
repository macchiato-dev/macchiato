import { Terminal } from "@xterm/xterm";

const terminal = new Terminal({
  cols: 80, rows: 24, scrollback: 1_000, convertEol: true, cursorBlink: true,
  theme: { background: "#10141c", foreground: "#d8e2f0", cursor: "#69e6d3" },
});
terminal.open(document.getElementById("terminal"));
terminal.onData((data) => globalThis.__browserUseNotify(JSON.stringify({ type: "data", data })));

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
globalThis.__terminalInspect = () => JSON.stringify({
  columns: terminal.cols, rows: terminal.rows,
  cursorX: terminal.buffer.active.cursorX, cursorY: terminal.buffer.active.cursorY,
  lines: terminal.buffer.active.length,
});
globalThis.__browserUseNotify(JSON.stringify({ type: "ready" }));

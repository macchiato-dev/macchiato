#!/usr/bin/env node
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};

globalThis.__HTTP_USE_PORT = Number(valueAfter("--port", "8787"));
globalThis.__HTTP_USE_DATABASE = valueAfter("--db", "./notes.sqlite3");
await import("./backend.js");
console.log(`Native backend listening on http://127.0.0.1:${globalThis.__HTTP_USE_PORT}`);

#!/usr/bin/env node
import { startShell } from "./shell.js";
import { createCommands } from "./commands.js";

const args = "Deno" in globalThis
  ? globalThis.Deno.args
  : process.argv.slice(2);

function parseGlobalOptions(argv) {
  const options = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--data-dir") {
      options.dataDir = argv[++i] ?? "";
    } else if (arg === "--db" || arg === "-d") {
      options.dbPath = argv[++i] ?? "";
    } else {
      rest.push(arg);
    }
  }
  return { options, rest };
}

const { options, rest } = parseGlobalOptions(args);
const commands = createCommands({ blocking: true, ...options });

if (rest.length === 0) {
  startShell(options);
} else {
  const [cmd, subcmd, ...commandArgs] = rest;
  const fullCmd = subcmd ? `${cmd} ${subcmd}` : cmd;

  const handler = commands[fullCmd] || commands[cmd];
  if (handler) {
    await handler(commandArgs);
  } else {
    console.error(`Unknown command: ${fullCmd}`);
    process.exit(1);
  }
}

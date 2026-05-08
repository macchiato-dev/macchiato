#!/usr/bin/env node
import { startShell } from "./shell.js";
import { createCommands } from "./commands.js";

const args = "Deno" in globalThis
  ? globalThis.Deno.args
  : process.argv.slice(2);

const commands = createCommands({ blocking: true });

if (args.length === 0) {
  startShell();
} else {
  const [cmd, subcmd, ...rest] = args;
  const fullCmd = subcmd ? `${cmd} ${subcmd}` : cmd;

  const handler = commands[fullCmd] || commands[cmd];
  if (handler) {
    await handler(rest);
  } else {
    console.error(`Unknown command: ${fullCmd}`);
    process.exit(1);
  }
}

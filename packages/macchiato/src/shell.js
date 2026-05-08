import { createCommands } from "./commands.js";

export async function startShell() {
  console.log("Macchiato 0.1.0 — A guest-host web sandbox.");
  console.log("Type 'help' for commands.\n");
  const commands = createCommands({ blocking: false });

  if ("Deno" in globalThis) {
    await denoShell(commands);
  } else {
    await nodeShell(commands);
  }
}

async function nodeShell(commands) {
  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "macchiato> ",
  });

  rl.prompt();
  rl.on("line", async (line) => {
    await handleCommand(commands, line.trim());
    rl.prompt();
  });
  rl.on("close", () => process.exit(0));
}

async function denoShell(commands) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    await Deno.stdout.write(encoder.encode("macchiato> "));
    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);
    if (n === null) {
      if (buffer) await handleCommand(commands, buffer.trim());
      break;
    }

    buffer += decoder.decode(buf.subarray(0, n));
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      await handleCommand(commands, line.trim());
    }
  }
}

async function handleCommand(commands, line) {
  if (!line) return;
  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const subcmd = parts[1];

  const fullCmd = subcmd ? `${cmd} ${subcmd}` : cmd;
  if (commands[fullCmd]) {
    await commands[fullCmd](parts.slice(2));
    return;
  }

  if (commands[cmd]) {
    await commands[cmd](parts.slice(1));
    return;
  }

  console.log(`Unknown command: ${line}`);
}

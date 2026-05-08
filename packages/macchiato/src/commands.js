import { startServer, stopServer, runServer, isRunning } from "./server.js";
import { withDb } from "./db.js";

function parseServerOpts(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" || args[i] === "-p") opts.port = args[++i];
    else if (args[i] === "--host" || args[i] === "-b") opts.host = args[++i];
  }
  return opts;
}

function exit(code = 0) {
  if ("Deno" in globalThis) globalThis.Deno.exit(code);
  else process.exit(code);
}

export function createCommands({ blocking = false } = {}) {
  return {
    help() {
      console.log("Commands:");
      console.log("  help                          Show this help");
      console.log("  exit, quit, q                 Exit the shell");
      console.log("  server start [opts]           Start the HTTP server");
      console.log("  server stop                   Stop the HTTP server");
      console.log("  server status                 Check server status");
      console.log("  site add <subdomain> <dir>    Add a site");
      console.log("  site list                     List sites");
      console.log("  site remove <subdomain>       Remove a site");
    },

    exit() { exit(0); },
    quit() { exit(0); },
    q() { exit(0); },

    async "server start"(args) {
      const opts = parseServerOpts(args);
      if (blocking) {
        await runServer(opts);
      } else {
        await startServer(opts);
      }
    },

    "server stop"() {
      stopServer();
    },

    "server status"() {
      console.log(isRunning() ? "Server is running" : "Server is not running");
    },

    "site add"(args) {
      const [subdomain, directory] = args;
      if (!subdomain || !directory) {
        console.log("Usage: site add <subdomain> <directory>");
        return;
      }
      withDb((db) => {
        db.prepare("INSERT OR REPLACE INTO sites VALUES (?, ?)").run(subdomain, directory);
      });
      console.log(`Added site: ${subdomain} -> ${directory}`);
    },

    "site list"() {
      const rows = withDb((db) => db.prepare("SELECT subdomain, directory FROM sites").all());
      if (rows.length === 0) {
        console.log("No sites configured");
        return;
      }
      for (const row of rows) {
        console.log(`  ${row.subdomain} -> ${row.directory}`);
      }
    },

    "site remove"(args) {
      const [subdomain] = args;
      if (!subdomain) {
        console.log("Usage: site remove <subdomain>");
        return;
      }
      withDb((db) => {
        db.prepare("DELETE FROM sites WHERE subdomain = ?").run(subdomain);
      });
      console.log(`Removed site: ${subdomain}`);
    },
  };
}

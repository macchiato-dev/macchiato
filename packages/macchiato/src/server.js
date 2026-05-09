let serverProc = null;

function resolveAppPath() {
  const url = new URL("../../app/src/index.js", import.meta.url);
  return url.pathname;
}

export function isRunning() {
  return serverProc !== null;
}

export async function startServer(opts = {}) {
  if (serverProc) {
    console.log("Server already running");
    return;
  }

  const appPath = resolveAppPath();
  const args = [appPath];
  if (opts.port) args.push("--port", String(opts.port));
  if (opts.host) args.push("--host", opts.host);

  const runtime = "Deno" in globalThis ? "deno" : process.execPath;
  const runtimeArgs = "Deno" in globalThis
    ? ["run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", ...args]
    : args;

  if ("Deno" in globalThis) {
    serverProc = new Deno.Command(runtime, {
      args: runtimeArgs,
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    serverProc.status.then(() => { serverProc = null; });
  } else {
    const { spawn } = await import("node:child_process");
    serverProc = spawn(runtime, runtimeArgs, { stdio: "inherit" });
    serverProc.on("exit", () => { serverProc = null; });
  }

  console.log(`Server started on http://${opts.host || "127.0.0.1"}:${opts.port || "8765"}`);
}

export function stopServer() {
  if (!serverProc) {
    console.log("Server not running");
    return;
  }
  serverProc.kill();
  serverProc = null;
  console.log("Server stopped");
}

export async function runServer(opts = {}) {
  await startServer(opts);
  if ("Deno" in globalThis) {
    await serverProc.status;
  } else {
    await new Promise((resolve) => {
      if (serverProc) serverProc.on("exit", resolve);
      else resolve();
    });
  }
}

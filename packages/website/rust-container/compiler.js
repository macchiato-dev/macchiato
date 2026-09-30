// This service has host privileges. Submitted code only reaches rustc inside
// a fresh, networkless mount/PID/user namespace, never the Deno interpreter.
const encoder = new TextEncoder();
const sourceLimit = 4 * 1024 * 1024;
const outputLimit = 8 * 1024 * 1024;
const diagnosticLimit = 64 * 1024;

export class CompileError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

export async function boundedBytes(stream, limit) {
  const chunks = [];
  let size = 0;
  if (!stream) return new Uint8Array();
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > limit) throw new CompileError("Input exceeds byte limit", 413);
    chunks.push(chunk);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function filesFor(input) {
  if (!Array.isArray(input?.files) || !input.files.length ||
      input.files.length > 64 || typeof input.entry !== "string") {
    throw new CompileError("Expected entry and 1–64 project files");
  }
  const files = new Map();
  let size = 0;
  for (const file of input.files) {
    const path = file?.path;
    // No platform-dependent filenames, traversal, absolute paths, or options.
    if (typeof path !== "string" || path.length > 160 ||
        !/^[A-Za-z0-9_][A-Za-z0-9_.\/-]*$/.test(path) ||
        path.split("/").some(part => !part || part === "." || part === "..") ||
        files.has(path) || typeof file.content !== "string" ||
        path === "output.wasm" || path.startsWith("output.wasm/")) {
      throw new CompileError("Invalid or duplicate project filename");
    }
    let bytes;
    if (file.encoding === "base64") {
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
        .test(file.content)) throw new CompileError("Invalid base64 file");
      bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
    } else {
      if (file.encoding && file.encoding !== "utf8") {
        throw new CompileError("Unknown file encoding");
      }
      bytes = encoder.encode(file.content);
    }
    size += bytes.length;
    if (size > sourceLimit) throw new CompileError("Project is too large", 413);
    files.set(path, bytes);
  }
  if (!input.entry.endsWith(".rs") || !files.has(input.entry)) {
    throw new CompileError("Entry must name a supplied Rust source file");
  }
  return files;
}

export class RustCompiler {
  constructor(root, toolchain) {
    this.root = root;
    this.toolchain = toolchain;
    this.busy = false;
  }

  async compile(input) {
    const files = filesFor(input);
    if (this.busy) throw new CompileError("Compiler is busy; retry shortly", 429);
    this.busy = true;
    let directory, child, timer;
    try {
      directory = await Deno.makeTempDir({ dir: this.root, prefix: "job-" });
      for (const [path, bytes] of files) {
        const name = `${directory}/${path}`;
        await Deno.mkdir(name.slice(0, name.lastIndexOf("/")), {
          recursive: true, mode: 0o700,
        });
        await Deno.writeFile(name, bytes, { createNew: true, mode: 0o600 });
      }
      // Only compiler/runtime libraries are readable outside /work. No host
      // home, environment, /proc, devices, sockets, or sibling jobs are visible.
      // Do not replace this with cwd-only isolation if namespaces fail.
      const args = [
        "--as=2147483648", "--cpu=20", "--fsize=8388608", "--nofile=128",
        "--", "bwrap", "--unshare-all", "--die-with-parent", "--new-session",
        "--cap-drop", "ALL", "--clearenv",
        "--ro-bind", this.toolchain, "/toolchain",
        "--ro-bind", "/usr/lib", "/usr/lib",
        "--ro-bind", "/usr/lib64", "/usr/lib64",
        "--symlink", "usr/lib", "/lib",
        "--symlink", "usr/lib64", "/lib64",
        "--dev", "/dev", "--bind", directory, "/work", "--chdir", "/work",
        "--setenv", "PATH", "/toolchain/bin",
        "--setenv", "LD_LIBRARY_PATH", "/toolchain/lib",
        "--setenv", "HOME", "/work", "--setenv", "TMPDIR", "/work",
        "/toolchain/bin/rustc", input.entry, "--crate-name", "project",
        "--edition=2021", "--crate-type=cdylib",
        "--target=wasm32-unknown-unknown", "--sysroot=/toolchain",
        "--remap-path-prefix=/work=project", "-C", "opt-level=z",
        "-C", "panic=abort", "-C", "lto=true", "-C", "strip=symbols",
        "-C", "link-arg=--max-memory=16777216", "-o", "output.wasm",
      ];
      child = new Deno.Command("prlimit", {
        args, clearEnv: true, env: { PATH: "/usr/bin" },
        stdin: "null", stdout: "piped", stderr: "piped",
      }).spawn();
      let timedOut = false;
      const kill = () => { try { child.kill("SIGKILL"); } catch {} };
      timer = setTimeout(() => { timedOut = true; kill(); }, 30_000);
      const read = stream => boundedBytes(stream, diagnosticLimit)
        .catch(error => { kill(); throw error; });
      const [status, , stderr] = await Promise.all([
        child.status, read(child.stdout), read(child.stderr),
      ]);
      if (timedOut) throw new CompileError("Compilation timed out", 408);
      if (!status.success) {
        throw new CompileError(new TextDecoder().decode(stderr) ||
          `Compiler exited with status ${status.code}`);
      }
      const path = `${directory}/output.wasm`;
      const stat = await Deno.lstat(path);
      if (!stat.isFile || stat.size > outputLimit) {
        throw new CompileError("Invalid compiler output");
      }
      const bytes = await Deno.readFile(path);
      if (!WebAssembly.validate(bytes)) {
        throw new CompileError("Compiler did not produce valid WebAssembly");
      }
      return bytes;
    } finally {
      clearTimeout(timer);
      // Await process exit before removing its only writable directory.
      if (child) {
        try { child.kill("SIGKILL"); } catch {}
        await child.status;
      }
      if (directory) await Deno.remove(directory, { recursive: true });
      this.busy = false;
    }
  }
}

if (import.meta.main) {
  const root = Deno.env.get("RESOURCES_RUST_WORK") ||
    new URL("../../../../macchiato-work/rust-compiler/", import.meta.url)
      .pathname;
  await Deno.mkdir(root, { recursive: true, mode: 0o700 });
  const keyPath = `${root}/api-key`;
  let key;
  try { key = (await Deno.readTextFile(keyPath)).trim(); }
  catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)),
      byte => byte.toString(16).padStart(2, "0")).join("");
    await Deno.writeTextFile(keyPath, key, { createNew: true, mode: 0o600 });
  }
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error("Invalid compiler API key");
  const sysroot = await new Deno.Command("rustc", {
    args: ["--print", "sysroot"],
  }).output();
  if (!sysroot.success) throw new Error("Rust toolchain is unavailable");
  const compiler = new RustCompiler(root,
    new TextDecoder().decode(sysroot.stdout).trim());
  Deno.serve({ hostname: "127.0.0.1", port: 8791 }, async request => {
    const headers = { "Cache-Control": "no-store" };
    if (request.headers.get("authorization") !== `Bearer ${key}`) {
      return new Response("Unauthorized", { status: 401, headers });
    }
    if (request.method !== "POST" || new URL(request.url).pathname !== "/compile") {
      return new Response("Not found", { status: 404, headers });
    }
    try {
      const bytes = await boundedBytes(request.body, 6 * 1024 * 1024);
      const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      return new Response(await compiler.compile(input), {
        headers: { ...headers, "Content-Type": "application/wasm" },
      });
    } catch (error) {
      const status = error instanceof CompileError ? error.status :
        error instanceof SyntaxError || error instanceof TypeError ? 422 : 503;
      return Response.json({ error: status === 503 ? "Compiler unavailable" :
        error.message }, { status, headers });
    }
  });
}

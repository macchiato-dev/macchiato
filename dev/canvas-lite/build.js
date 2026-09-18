// Four standalone, dependency-free libraries; never build native executables.
await Deno.mkdir("dist", { recursive: true });
for (const name of ["frontend-host", "frontend-guest", "backend-host", "backend-guest"]) {
  const result = await new Deno.Command("rustc", {
    args: [
      `${name}.rs`, "--edition=2021", "--crate-type=cdylib",
      "--target=wasm32-unknown-unknown",
      "-C", "opt-level=z", "-C", "panic=abort",
      "-C", "lto=true", "-C", "strip=symbols",
      "-o", `dist/${name}.wasm`,
    ],
  }).spawn().status;
  if (!result.success) Deno.exit(result.code);
}

const root = new URL(".", import.meta.url);
const manifest = new URL("Cargo.toml", root);
const target = new URL("target/", root);
const cargo = `${Deno.env.get("HOME") || "/root"}/.cargo/bin/cargo`;
const command = new Deno.Command(cargo, {
  args: ["rustc", "--release", "--target", "wasm32-unknown-unknown",
    "--manifest-path", manifest.pathname, "--target-dir", target.pathname,
    "--", "--crate-type=cdylib"],
  env: { PATH: Deno.env.get("PATH") || "" },
  stdout: "inherit",
  stderr: "inherit",
});
const result = await command.output();
if (!result.success) Deno.exit(result.code);
await Deno.mkdir(new URL("playground", root), { recursive: true });
const dependencies = new URL("wasm32-unknown-unknown/release/deps/", target);
let artifact;
for await (const entry of Deno.readDir(dependencies)) {
  if (entry.isFile && entry.name.startsWith("macchiato_evm-") &&
      entry.name.endsWith(".wasm")) artifact = new URL(entry.name, dependencies);
}
if (!artifact) throw new Error("the EVM Wasm artifact was not produced");
await Deno.copyFile(artifact, new URL("playground/evm.wasm", root));
console.log("built dev/evm/playground/evm.wasm");

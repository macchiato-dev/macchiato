import { readFileSync } from "node:fs";

export const serverModule = new WebAssembly.Module(readFileSync(new URL(
  "../generated/microquickjs-server.wasm", import.meta.url)));

function bytecodes(directory) {
  const root = new URL(`../generated/${directory}/`, import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
  return manifest.chunks.map(name => readFileSync(new URL(name, root)));
}

export const serverBytecodes = bytecodes("resources-server-bytecode");
export const policyModule = new WebAssembly.Module(readFileSync(new URL(
  "../generated/resources-application-machine/quickjs-server.wasm", import.meta.url)));
export const policyBytecodes = [readFileSync(new URL(
  "../generated/resources-policy-machine/application.bin", import.meta.url))];
export const projectVersionBytecodes = bytecodes("resources-project-version-bytecode");

import { ServerMachineController } from "../../server-use/src/machine-controller.js";
import { decodeResourceArtifact } from "../../wasm-web-container/src/resource-bundle.js";

// Pass the exported machines/backend.bin to exercise the actual upload, not
// an obsolete embedded-runtime build that production no longer imports.
const artifact = Deno.args[0] ?? new URL("../generated/resources-backend.bin", import.meta.url);

Deno.test("Bunny's compressed backend artifact runs its routing and document guests in Deno", async () => {
  const files = await decodeResourceArtifact(await Deno.readFile(artifact));
  function file(name: string): Uint8Array<ArrayBuffer> {
    const bytes = files.get(name);
    if (!bytes) throw new Error(`Backend artifact lacks ${name}`);
    return bytes;
  }
  function bytecodes(name: string): Uint8Array[] {
    const manifest = JSON.parse(new TextDecoder().decode(file(`${name}/manifest.json`)));
    if (manifest.format !== "microquickjs-bytecode-v1" || !manifest.chunks.length) {
      throw new Error(`Invalid ${name} manifest`);
    }
    const chunks = manifest.chunks.map((chunk: string) => file(`${name}/${chunk}`));
    if (chunks.reduce((sum: number, chunk: Uint8Array) => sum + chunk.length, 0) !== manifest.bytes) {
      throw new Error(`Invalid ${name} bytecode size`);
    }
    return chunks;
  }
  const module = await WebAssembly.compile(file("runtime.wasm"));
  const applicationModule = await WebAssembly.compile(file("application-runtime.wasm"));
  const routing = new ServerMachineController(module, { bytecodes: bytecodes("resources-server") });
  const result = await routing.request(["document.unsupported"]);
  if (!Array.isArray(result) || result[0] !== 405 || result[2] !== "Method not allowed") {
    throw new Error(`Routing guest returned ${JSON.stringify(result)}`);
  }
  const documents = new ServerMachineController(module, { bytecodes: bytecodes("resources-document") });
  const rendered = await documents.request(["public-projects", JSON.stringify([[
    { name: "A <safe> project", namespace: "owner", slug: "demo", description: "", template: "article" },
  ], {}])]);
  if (typeof rendered !== "string" || !rendered.includes("A &lt;safe&gt; project") ||
      !rendered.includes("owner/demo") || rendered.includes("A <safe> project")) {
    throw new Error("Document guest did not render and escape the project");
  }
  const policy = new ServerMachineController(applicationModule, {
    bytecodes: [file("resources-policy/application.bin")],
  });
  const denied = await policy.request(["sql", "not-an-installed-operation", []]);
  if (!Array.isArray(denied) || denied[0] !== 500 ||
      !String(denied[2]).includes("SQL operation not-an-installed-operation is not allowed")) {
    throw new Error(`SQL policy did not reject the unknown operation: ${JSON.stringify(denied)}`);
  }
});

import { ServerMachineController } from "../../server-use/src/machine-controller.js";
import { compileEmbeddedServerRuntime,
  loadEmbeddedServerBytecodes } from "../generated/resources-bunny-machine-assets.ts";

Deno.test("embedded Bunny runtime executes its separately compressed guest bytecode", async () => {
  const [module, bytecodes] = await Promise.all([
    compileEmbeddedServerRuntime(), loadEmbeddedServerBytecodes(),
  ]);
  if (!(module instanceof WebAssembly.Module)) throw new Error("runtime did not compile");
  if (bytecodes.length !== 3 || bytecodes.some(value => !value.length)) {
    throw new Error("server bytecode chunks did not decompress");
  }
  const controller = new ServerMachineController(module, { bytecodes });
  const result = await controller.request(["document.unsupported"]);
  if (!Array.isArray(result) || result[0] !== 405 || result[2] !== "Method not allowed") {
    throw new Error(`embedded guest returned an unexpected response: ${JSON.stringify(result)}`);
  }
});

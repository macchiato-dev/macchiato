import WasmWebMachine from "./wasm-web-machine.js";

class CodeMirrorExampleController {
  constructor(document) { this.document = document; }

  async start() {
    const guestUrl = this.document.querySelector("[data-wasm]")?.dataset.wasm ||
      "./generated/codemirror-canonical.wasm";
    const response = await fetch(new URL(guestUrl, import.meta.url),
      { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Wasm response ${response.status}`);
    const module = await WebAssembly.compileStreaming(response);
    const sections = WebAssembly.Module.customSections(module, "wasm-web-container");
    this.machine = new WasmWebMachine(module, this.document, {
      stamp: sections.length === 1 ? new Uint8Array(sections[0]) : undefined,
      services: {
        route: { get: () => "/", listen() {} },
        storage: { get: () => null, set() {}, delete() {}, listen() {} },
      },
    });
    await this.machine.onmsg(0);
    this.document.body.dataset.ready = "true";
    this.document.querySelector(".runtime-status")?.remove();
  }

  fail(error) {
    const status = this.document.querySelector(".runtime-status");
    status.dataset.error = "";
    status.textContent = `QuickJS CodeMirror could not start: ${error?.message || error}`;
  }
}

const controller = new CodeMirrorExampleController(document);
try { await controller.start(); } catch (error) { controller.fail(error); throw error; }

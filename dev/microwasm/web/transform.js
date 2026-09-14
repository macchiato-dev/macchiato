import { createReader } from "./reader.js";

// UI and byte transfer only. The selected handwritten module does the work.
export async function startTransform(entry) {
  const $ = (id) => document.getElementById(id);
  $("index").hidden = true;
  $("transformation").hidden = false;
  $("tool-title").textContent = entry.title;
  document.title = `${entry.title} — Microwasm`;
  $("tool-source").href = `?doc=${
    encodeURIComponent(`transforms/${entry.id}.md`)
  }`;
  $("transform-input").value = entry.input;
  const reader = createReader([]); // User-written links stay inert.
  const panels = new Map();
  for (const side of ["input", "output"]) {
    const panel = document.querySelector(`[data-side="${side}"]`);
    const textarea = $(`transform-${side}`);
    const rendered = $(`transform-${side}-rendered`);
    let view = "code", generation = 0;
    async function display(text = textarea.value) {
      const request = ++generation;
      if (view === "rendered") {
        const detached = document.createElement("div");
        await reader.render(text, detached, "./");
        if (request !== generation) return;
        rendered.replaceChildren(...detached.childNodes);
      }
      textarea.value = text;
      textarea.hidden = view !== "code";
      rendered.hidden = view !== "rendered";
    }
    for (const button of panel.querySelectorAll("[data-display]")) {
      button.addEventListener("click", () => {
        view = button.dataset.display;
        for (const choice of panel.querySelectorAll("[data-display]")) {
          choice.setAttribute("aria-pressed", String(choice === button));
        }
        display().catch((error) =>
          $("transform-status").textContent = error.message
        );
      });
    }
    panels.set(side, { textarea, display });
  }
  $("transform-status").textContent = "Loading transformation…";
  const dependencies = entry.dependencies ?? [];
  const responses = await Promise.all([
    `./transforms/${entry.id}.wasm`,
    ...dependencies.map((item) => `./${item.path}.wasm`),
  ].map((path) => fetch(path)));
  for (const response of responses) {
    if (!response.ok) {
      throw new Error(`Transformation: HTTP ${response.status}`);
    }
  }
  // Wire Wasm exports directly: shared memory and native Wasm calls, not JS
  // implementations or wrapper functions for the numeric parsing routines.
  const imports = Object.fromEntries(
    await Promise.all(dependencies.map(async (item, i) => {
      const { instance } = await WebAssembly.instantiateStreaming(
        responses[i + 1],
      );
      return [item.name, instance.exports];
    })),
  );
  const { instance } = await WebAssembly.instantiateStreaming(
    responses[0],
    imports,
  );
  const memory = new Uint8Array(instance.exports.memory.buffer);
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  $("transform-run").disabled = false;
  $("transform-status").textContent = "Ready.";
  $("transform-run").addEventListener("click", async () => {
    try {
      const input = encoder.encode(panels.get("input").textarea.value);
      if (input.length > 0x10000) throw new Error("Input exceeds 64 KiB.");
      memory.set(input);
      const length = instance.exports.run(input.length);
      const output = decoder.decode(memory.subarray(0x10000, 0x10000 + length));
      await panels.get("output").display(output);
      $("transform-status").textContent = "Done.";
    } catch (error) {
      $("transform-status").textContent =
        error instanceof WebAssembly.RuntimeError
          ? "Transformation stopped: invalid input or capacity exceeded. Previous output kept."
          : error.message;
    }
  });
}

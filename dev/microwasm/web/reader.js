// Wasm performs Markdown parsing and HTML escaping. This module only moves
// bytes and grants navigation to documents in the build's local manifest.
export function enableLocalLinks(
  root,
  sourcePath,
  documents,
  pageURL = location.href,
) {
  const page = new URL(pageURL);
  const source = new URL(sourcePath, page);
  const known = new Map(
    documents.map((entry) => [new URL(entry.path, page).pathname, entry]),
  );
  for (const link of root.querySelectorAll("a[data-href]")) {
    link.removeAttribute("href");
    let target;
    try {
      target = new URL(link.getAttribute("data-href"), source);
    } catch {
      continue;
    }
    if (
      target.origin !== page.origin || target.username || target.password ||
      target.search
    ) continue;
    const entry = known.get(target.pathname);
    if (!entry) continue;
    const route = new URL(page);
    route.search = "";
    route.searchParams.set(
      entry.example ? "example" : "doc",
      entry.example ?? entry.path,
    );
    route.hash = target.hash;
    link.href = route.href;
  }
}

export function createReader(documents) {
  let ready;
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  async function runtime() {
    if (!ready) {
      ready = (async () => {
        const response = await fetch("./markdown-renderer.wasm");
        if (!response.ok) {
          throw new Error(`Markdown renderer: HTTP ${response.status}`);
        }
        const { instance } = await WebAssembly.instantiateStreaming(response);
        return {
          run: instance.exports.run,
          memory: new Uint8Array(instance.exports.memory.buffer),
        };
      })();
    }
    return ready;
  }
  return {
    async render(text, element, sourcePath) {
      const { run, memory } = await runtime();
      const input = encoder.encode(text);
      if (input.length > 0x40000) {
        throw new Error("Markdown input exceeds 256 KiB");
      }
      memory.set(input);
      const length = run(input.length);
      // Only the renderer's fixed tags and escaped text enter this fragment.
      const fragment = document.createElement("template");
      fragment.innerHTML = decoder.decode(
        memory.subarray(0x40000, 0x40000 + length),
      );
      enableLocalLinks(fragment.content, sourcePath, documents);
      element.replaceChildren(fragment.content);
    },
  };
}

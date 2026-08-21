import { decodeResourceBundle } from "./resource-bundle.js";

export class WasmWebContainer {
  #runtime;
  #fetch;

  constructor({ runtime, fetch: fetchInput = globalThis.fetch } = {}) {
    if (!runtime || (typeof runtime.loadJavaScript !== "function" &&
        typeof runtime.loadBundle !== "function")) {
      throw new TypeError("runtime must load JavaScript or resource bundles");
    }
    if (typeof fetchInput !== "function") throw new TypeError("fetch must be a function");
    this.#runtime = runtime;
    this.#fetch = fetchInput;
  }

  async load(input) {
    if (!input || !["javascript", "bin"].includes(input.type)) {
      throw new TypeError("application type must be javascript or bin");
    }
    if (input.type === "javascript") {
      if (typeof this.#runtime.loadJavaScript !== "function") {
        throw new TypeError("selected runtime does not load JavaScript");
      }
      const source = input.source ?? await this.#read(input.url, "text");
      if (typeof source !== "string") throw new TypeError("JavaScript application must be text");
      return this.#runtime.loadJavaScript(source, { url: input.url || null });
    }
    if (typeof this.#runtime.loadBundle !== "function") {
      throw new TypeError("selected runtime does not load resource bundles");
    }
    const bytes = input.bytes ?? await this.#read(input.url, "bytes");
    return this.#runtime.loadBundle(decodeResourceBundle(bytes), { url: input.url || null });
  }

  async #read(url, kind) {
    if (!url) throw new TypeError("application source or URL is required");
    const response = await this.#fetch(url);
    if (!response.ok) throw new Error(`application response: ${response.status}`);
    return kind === "text" ? response.text() : new Uint8Array(await response.arrayBuffer());
  }
}

export default WasmWebContainer;

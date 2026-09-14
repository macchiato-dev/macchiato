// The host owns input/output only. Algorithms are the handwritten Wasm bytes.
import { createReader } from "./reader.js";
const $ = (id) => document.getElementById(id);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const samples = [
  "5",
  "10",
  "48 18",
  "3 7",
  "97",
  "255",
  "1 2 -3 10",
  "8 -3 5 -3",
  "3\n-7 -2 0 3 8 99",
  "9 2 -1 4 2",
  "Hello, café!",
  "Hello, World!",
  "first\nsecond\n",
  "f0 9f 98 80",
  "text ([{}])",
  "aaaaabbbbcccccccc",
  "05 61 04 62 08 63",
  'A "quote", a backslash \\, and a newline\n',
  'name,note\nAda,"Hello, world"\nLin,"say ""hi"""',
];

async function textFile(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }
  return response.text();
}
function parseHex(text) {
  const compact = text.replace(/\s/g, "");
  if (!/^(?:[0-9a-f]{2})*$/i.test(compact)) {
    throw new Error("Use pairs of hex digits separated by spaces.");
  }
  return Uint8Array.from(
    compact.match(/../g) ?? [],
    (byte) => parseInt(byte, 16),
  );
}
function integers(text) {
  if (!text.trim()) return [];
  return text.trim().split(/[\s,]+/).map((value) => {
    const number = Number(value);
    if (
      !/^-?\d+$/.test(value) || !Number.isInteger(number) ||
      number < -2147483648 || number > 4294967295
    ) throw new Error("Use 32-bit integers separated by spaces or commas.");
    return number;
  });
}
function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

async function start() {
  const manifest = JSON.parse(await textFile("./examples.json"));
  const documents = JSON.parse(await textFile("./documents.json"));
  const selected = new URL(location.href).searchParams.get("example");
  const selectedDoc = new URL(location.href).searchParams.get("doc");
  if (!selected && !selectedDoc) {
    for (const entry of manifest) {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = `?example=${entry.id}`;
      link.textContent = entry.title;
      const size = document.createElement("small");
      size.textContent = `${entry.bytes} bytes`;
      li.append(link, size);
      $("examples").append(li);
    }
    for (const entry of documents.filter((entry) => !entry.example)) {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = `?doc=${encodeURIComponent(entry.path)}`;
      link.textContent = entry.title;
      li.append(link);
      $("renderer-pages").append(li);
    }
    return;
  }
  const reader = createReader(documents);
  if (selectedDoc) {
    const entry = documents.find((entry) =>
      !entry.example && entry.path === selectedDoc
    );
    if (!entry) throw new Error("Unknown document.");
    $("index").hidden = true;
    $("example").hidden = false;
    document.querySelector(".demo").hidden = true;
    document.querySelector(".panels").classList.add("reading-only");
    $("title").textContent = entry.title;
    document.title = `${entry.title} — Microwasm`;
    $("size").textContent =
      "Rendered by the handwritten Wasm module defined across these pages. Hex and download contain the complete module.";
    $("download").href = "./markdown-renderer.wasm";
    await configureSource(
      `./${entry.path.slice(0, -3)}`,
      reader,
      "./markdown-renderer.hex",
    );
    return;
  }
  const entry = manifest.find((item) => item.id === selected);
  if (!entry) throw new Error("Unknown example.");
  const number = Number(entry.id.slice(0, 2));
  const prefix = `./examples/${entry.id}`;
  $("index").hidden = true;
  $("example").hidden = false;
  $("title").textContent = entry.title;
  document.title = `${entry.title} — Microwasm`;
  $("size").textContent =
    `${entry.bytes} bytes • assembled from the Markdown lists`;
  $("download").href = `${prefix}.wasm`;
  await configureSource(prefix, reader);
  // Deliberately instantiate from the saved hex, as in the command-line path.
  const module = await WebAssembly.compile(
    parseHex(await textFile(`${prefix}.hex`)),
  );
  if (number === 20) {
    $("form").hidden = true;
    $("life").hidden = false;
    $("instructions").textContent =
      "Click cells to edit. Each step runs the Wasm function once; edges do not wrap.";
    return life(module);
  }
  $("input").value = samples[number - 1];
  $("input-label").textContent = number <= 6
    ? "Integer arguments"
    : number <= 10
    ? "Integer array"
    : [14, 17].includes(number)
    ? "Hex bytes"
    : "Text input";
  $("instructions").textContent = number === 9
    ? "First line: target. Remaining lines: sorted integer array."
    : number <= 6
    ? "The document defines the accepted range and overflow behavior."
    : "Input is copied into Wasm memory; the result below is read after the function returns.";
  async function run(event) {
    event?.preventDefault();
    $("output").classList.remove("failure");
    try {
      const instance = await WebAssembly.instantiate(module);
      const fn = instance.exports[number === 1 ? "factorial" : "run"];
      const input = $("input").value;
      let result;
      if (number <= 6) {
        const args = integers(input);
        const expected = [3, 4].includes(number) ? 2 : 1;
        if (args.length !== expected) {
          throw new Error(`Expected ${expected} integer argument(s).`);
        }
        result = fn(...args);
        if ([3, 4].includes(number)) result >>>= 0;
      } else if (number <= 10) {
        const values = integers(input);
        const target = number === 9 ? values.shift() : undefined;
        if (number === 9 && target === undefined) {
          throw new Error("Provide a target on the first line.");
        }
        if (values.length > 16384) {
          throw new Error("At most 16384 integers fit.");
        }
        const view = new DataView(instance.exports.memory.buffer);
        values.forEach((value, i) => view.setInt32(i * 4, value, true));
        result = fn(values.length, target);
        if (number === 10) {
          result = values.map((_, i) => view.getInt32(i * 4, true));
        }
      } else {
        const bytes = [14, 17].includes(number)
          ? parseHex(input)
          : encoder.encode(input);
        if (bytes.length > 65536) {
          throw new Error("Input exceeds one memory page.");
        }
        new Uint8Array(instance.exports.memory.buffer, 0, bytes.length).set(
          bytes,
        );
        const length = fn(bytes.length);
        if ([13, 14, 15].includes(number)) result = length;
        else {
          const bytes = new Uint8Array(
            instance.exports.memory.buffer,
            65536,
            length,
          );
          result = number === 16 ? hex(bytes) : decoder.decode(bytes);
          if (number === 17) result += `\n\nHex: ${hex(bytes)}`;
        }
      }
      $("output").textContent = typeof result === "string"
        ? result
        : JSON.stringify(result);
    } catch (error) {
      $("output").classList.add("failure");
      $("output").textContent = error instanceof WebAssembly.RuntimeError
        ? `Wasm trapped. Check the document's input and output limits.\n${error.message}`
        : error.message;
    }
  }
  $("form").addEventListener("submit", run);
  await run();
}

async function configureSource(prefix, reader, hexPath = `${prefix}.hex`) {
  let request = 0;
  let extension = "md", view = "rendered";
  const cache = new Map();
  async function show() {
    const current = ++request;
    const path = extension === "hex" ? hexPath : `${prefix}.${extension}`;
    if (!cache.has(path)) cache.set(path, textFile(path));
    let text = await cache.get(path);
    if (current !== request) return;
    // Hex is also a Markdown document, not a separate display mode.
    if (extension === "hex") text = "```hex\n" + text.trimEnd() + "\n```\n";
    if (view === "rendered") {
      // Render off-DOM, then swap only if this is still the selected view.
      const container = document.createElement("div");
      await reader.render(text, container, `${prefix}.md`);
      if (current !== request) return;
      $("rendered").replaceChildren(...container.childNodes);
    } else $("source").textContent = text;
    $("source").hidden = view === "rendered";
    $("rendered").hidden = view !== "rendered";
  }
  for (const button of document.querySelectorAll("[data-extension]")) {
    button.addEventListener("click", () => {
      for (const item of document.querySelectorAll("[data-extension]")) {
        item.setAttribute("aria-pressed", String(item === button));
      }
      extension = button.dataset.extension;
      show().catch(showError);
    });
  }
  for (const button of document.querySelectorAll("[data-view]")) {
    button.addEventListener("click", () => {
      for (const item of document.querySelectorAll("[data-view]")) {
        item.setAttribute("aria-pressed", String(item === button));
      }
      view = button.dataset.view;
      show().catch(showError);
    });
  }
  await show();
}

async function life(module) {
  const instance = await WebAssembly.instantiate(module);
  const board = new Uint8Array(instance.exports.memory.buffer, 0, 256);
  const buttons = [];
  let generation = 0, timer;
  function paint() {
    buttons.forEach((button, i) => {
      button.classList.toggle("alive", !!board[i]);
      button.setAttribute("aria-pressed", String(!!board[i]));
    });
  }
  function stop() {
    clearInterval(timer);
    timer = undefined;
    $("play").textContent = "Play";
  }
  function reset(indices) {
    stop();
    generation = 0;
    board.fill(0);
    indices.forEach((i) => board[i] = 1);
    paint();
    $("output").textContent = "Generation 0";
  }
  function step() {
    const population = instance.exports.run();
    generation++;
    paint();
    $("output").textContent =
      `Generation ${generation} · ${population} live cells`;
  }
  for (let i = 0; i < 256; i++) {
    const button = document.createElement("button");
    button.setAttribute(
      "aria-label",
      `Cell ${i % 16 + 1}, ${Math.floor(i / 16) + 1}`,
    );
    button.addEventListener("click", () => {
      stop();
      board[i] = Number(!board[i]);
      paint();
    });
    buttons.push(button);
    $("board").append(button);
  }
  $("step").addEventListener("click", step);
  $("play").addEventListener("click", () => {
    if (timer) stop();
    else {
      timer = setInterval(step, 250);
      $("play").textContent = "Pause";
    }
  });
  $("clear").addEventListener("click", () => reset([]));
  $("blinker").addEventListener("click", () => reset([118, 119, 120]));
  $("glider").addEventListener("click", () => reset([69, 86, 100, 101, 102]));
  addEventListener("pagehide", stop);
  reset([69, 86, 100, 101, 102]);
}

function showError(error) {
  $("error").hidden = false;
  $("error").textContent = error.message;
}
start().catch(showError);

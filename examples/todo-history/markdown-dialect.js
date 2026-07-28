import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { replayEvents, validateEvent } from "./model.js";

export const MARKDOWN_HEADER = `# TODO character history

Format: \`todo-history/v1\`

Each fenced record is append-only. Text is JSON-quoted; delays are milliseconds.

`;

function quoted(value) {
  return JSON.stringify(value);
}

export function encodeMarkdownEvent(input) {
  const event = validateEvent(input);
  const lines = [
    "```todo-history",
    `event ${event.id}`,
    `at ${event.atMs}`,
    `todo ${event.todoId}`,
    event.kind,
  ];
  if (event.kind === "create") lines.push(`title ${quoted(event.title)}`);
  else if (event.kind === "toggle") lines.push(`done ${event.done}`);
  else if (event.kind === "edit") {
    lines.push(`cursor ${event.cursor}`);
    for (const action of event.actions) {
      if (action.op === "move") lines.push(`move ${action.by} after ${action.delayMs}`);
      else if (action.op === "insert") lines.push(`insert ${quoted(action.text)} delays ${action.delaysMs.join(",")}`);
      else lines.push(`delete ${action.direction} ${action.count} delays ${action.delaysMs.join(",")}`);
    }
  }
  return `${lines.join("\n")}\n\`\`\`\n\n`;
}

function parseJsonString(source, label) {
  try {
    const value = JSON.parse(source);
    if (typeof value !== "string") throw new Error();
    return value;
  } catch {
    throw new Error(`Invalid Markdown ${label}`);
  }
}

function parseDelays(value) {
  return value === "" ? [] : value.split(",").map((part) => Number(part));
}

export function parseMarkdownHistory(markdown) {
  if (!markdown.includes("todo-history/v1")) throw new Error("Unsupported TODO history Markdown dialect");
  const events = [];
  const blocks = markdown.matchAll(/```todo-history\n([\s\S]*?)\n```/g);
  for (const match of blocks) {
    const lines = match[1].split("\n");
    const event = {};
    const actions = [];
    for (const line of lines) {
      let parts;
      if ((parts = /^event (\S+)$/.exec(line))) event.id = parts[1];
      else if ((parts = /^at (\d+)$/.exec(line))) event.atMs = Number(parts[1]);
      else if ((parts = /^todo (\S+)$/.exec(line))) event.todoId = parts[1];
      else if (/^(create|edit|toggle|delete)$/.test(line)) event.kind = line;
      else if ((parts = /^title (.+)$/.exec(line))) event.title = parseJsonString(parts[1], "title");
      else if ((parts = /^done (true|false)$/.exec(line))) event.done = parts[1] === "true";
      else if ((parts = /^cursor (\d+)$/.exec(line))) event.cursor = Number(parts[1]);
      else if ((parts = /^move (-?\d+) after (\d+)$/.exec(line))) {
        actions.push({ op: "move", by: Number(parts[1]), delayMs: Number(parts[2]) });
      } else if ((parts = /^insert (".*") delays ([\d,]*)$/.exec(line))) {
        actions.push({ op: "insert", text: parseJsonString(parts[1], "insert"), delaysMs: parseDelays(parts[2]) });
      } else if ((parts = /^delete (backward|forward) (\d+) delays ([\d,]+)$/.exec(line))) {
        actions.push({ op: "delete", direction: parts[1], count: Number(parts[2]), delaysMs: parseDelays(parts[3]) });
      } else throw new Error(`Invalid TODO history Markdown line: ${line}`);
    }
    if (event.kind === "edit") event.actions = actions;
    events.push(validateEvent(event));
  }
  return events;
}

export function createMarkdownHistoryStore(file) {
  let initialized;
  let queue = Promise.resolve();
  let cachedEvents = null;

  async function initialize() {
    if (!initialized) {
      initialized = (async () => {
        await mkdir(dirname(file), { recursive: true });
        try {
          const markdown = await readFile(file, "utf8");
          cachedEvents = parseMarkdownHistory(markdown);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          await writeFile(file, MARKDOWN_HEADER, { encoding: "utf8", mode: 0o600 });
          cachedEvents = [];
        }
      })();
    }
    return initialized;
  }

  return Object.freeze({
    kind: "markdown",
    file,
    async listEvents() {
      await queue;
      await initialize();
      return cachedEvents.map((event) => structuredClone(event));
    },
    async state() {
      await queue;
      await initialize();
      return replayEvents(cachedEvents);
    },
    append(input) {
      const event = validateEvent(input);
      queue = queue.catch(() => {}).then(async () => {
        await initialize();
        // Validate the complete stream before making the append durable.
        replayEvents([...cachedEvents, event]);
        await appendFile(file, encodeMarkdownEvent(event), "utf8");
        cachedEvents.push(event);
        return structuredClone(event);
      });
      return queue;
    },
  });
}

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { replayEvents, validateEvent } from "./model.js";

const FORMAT = `## Format

- Dialect: \`todo-history/v1\`.
- **List** is the current materialized view; **History** is authoritative in document order.
- \`At\` is Unix time in milliseconds. An edit starts at \`Cursor\` and applies its numbered actions in order.
- Move uses a signed character count and one delay. Insert and delete delays correspond one-to-one with their characters.
- Plain text is literal. A value beginning with \`json:\` inside inline code is a JSON-escaped string.
`;

function safePlain(value) {
  return value.length > 0
    && value.trim() === value
    && !/[\r\n`\\]/.test(value)
    && !/^(?:[#>*+-]|\d+[.)])\s/.test(value);
}

function scalar(value) {
  return safePlain(value) ? value : `\`json:${JSON.stringify(value)}\``;
}

function parseScalar(value) {
  const encoded = /^`json:("(?:[^"\\]|\\.)*")`$/.exec(value);
  if (!encoded) return value;
  try {
    return JSON.parse(encoded[1]);
  } catch {
    throw new Error("Invalid JSON-escaped Markdown value");
  }
}

function delayList(values) {
  return values.map((value) => `\`${value}ms\``).join(", ");
}

function renderEvent(input) {
  const event = validateEvent(input);
  const name = event.kind[0].toUpperCase() + event.kind.slice(1);
  const lines = [
    `### ${name} \`${event.id}\``,
    `- TODO: \`${event.todoId}\``,
    `- At: \`${event.atMs}\``,
  ];
  if (event.kind === "create") lines.push(`- Title: ${scalar(event.title)}`);
  else if (event.kind === "toggle") lines.push(`- Done: \`${event.done}\``);
  else if (event.kind === "edit") {
    lines.push(`- Cursor: \`${event.cursor}\``);
    lines.push("- Actions:");
    event.actions.forEach((action, index) => {
      const prefix = `  ${index + 1}.`;
      if (action.op === "move") {
        lines.push(`${prefix} Move: \`${action.by}\``);
        lines.push(`     - After: \`${action.delayMs}ms\``);
      } else if (action.op === "insert") {
        lines.push(`${prefix} Insert: ${scalar(action.text)}`);
        lines.push(`     - Delays: ${delayList(action.delaysMs)}`);
      } else {
        lines.push(`${prefix} Delete ${action.direction}: \`${action.count}\``);
        lines.push(`     - Delays: ${delayList(action.delaysMs)}`);
      }
    });
  }
  return lines.join("\n");
}

export function renderMarkdownHistory(inputs) {
  const events = inputs.map(validateEvent);
  const todos = replayEvents(events);
  const list = todos.length
    ? todos.map((todo) => `- [${todo.done ? "x" : " "}] ${scalar(todo.title)} — \`${todo.id}\``).join("\n")
    : "- No current TODOs.";
  const history = events.length
    ? events.map(renderEvent).join("\n\n")
    : "_No history yet._";
  return `# TODO character history

## List

${list}

## History

${history}

${FORMAT}`;
}

function numberFromCode(value, label) {
  const match = /^`(-?\d+)(?:ms)?`$/.exec(value);
  if (!match) throw new Error(`Invalid Markdown ${label}`);
  return Number(match[1]);
}

function parseDelays(value) {
  if (!value) return [];
  return value.split(", ").map((part) => numberFromCode(part, "delay"));
}

export function parseMarkdownHistory(markdown) {
  if (!markdown.includes("Dialect: `todo-history/v1`.")) throw new Error("Unsupported TODO history Markdown dialect");
  const historyStart = markdown.indexOf("\n## History\n");
  const formatStart = markdown.indexOf("\n## Format\n");
  if (historyStart < 0 || formatStart < historyStart) throw new Error("Invalid TODO history Markdown sections");
  const source = markdown.slice(historyStart + "\n## History\n".length, formatStart).trim();
  if (source === "_No history yet._") return [];
  const blocks = source.split(/\n\n(?=### )/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const heading = /^### (Create|Edit|Toggle|Delete) `([^`]+)`$/.exec(lines.shift());
    if (!heading) throw new Error("Invalid Markdown history heading");
    const event = { kind: heading[1].toLowerCase(), id: heading[2] };
    const actions = [];
    let currentAction = null;
    for (const line of lines) {
      let parts;
      if ((parts = /^- TODO: `([^`]+)`$/.exec(line))) event.todoId = parts[1];
      else if ((parts = /^- At: (`[^`]+`)$/.exec(line))) event.atMs = numberFromCode(parts[1], "event time");
      else if ((parts = /^- Title: (.*)$/.exec(line))) event.title = parseScalar(parts[1]);
      else if ((parts = /^- Done: `(true|false)`$/.exec(line))) event.done = parts[1] === "true";
      else if ((parts = /^- Cursor: (`[^`]+`)$/.exec(line))) event.cursor = numberFromCode(parts[1], "cursor");
      else if (line === "- Actions:") {
        // Child list follows.
      } else if ((parts = /^  \d+\. Move: (`[^`]+`)$/.exec(line))) {
        currentAction = { op: "move", by: numberFromCode(parts[1], "move") };
        actions.push(currentAction);
      } else if ((parts = /^  \d+\. Insert: (.*)$/.exec(line))) {
        currentAction = { op: "insert", text: parseScalar(parts[1]) };
        actions.push(currentAction);
      } else if ((parts = /^  \d+\. Delete (backward|forward): (`[^`]+`)$/.exec(line))) {
        currentAction = { op: "delete", direction: parts[1], count: numberFromCode(parts[2], "delete count") };
        actions.push(currentAction);
      } else if ((parts = /^     - After: (`[^`]+`)$/.exec(line)) && currentAction?.op === "move") {
        currentAction.delayMs = numberFromCode(parts[1], "move delay");
      } else if ((parts = /^     - Delays: (.*)$/.exec(line)) && currentAction && currentAction.op !== "move") {
        currentAction.delaysMs = parseDelays(parts[1]);
      } else throw new Error(`Invalid TODO history Markdown line: ${line}`);
    }
    if (event.kind === "edit") event.actions = actions;
    return validateEvent(event);
  });
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
          cachedEvents = parseMarkdownHistory(await readFile(file, "utf8"));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          cachedEvents = [];
          await writeFile(file, renderMarkdownHistory(cachedEvents), { encoding: "utf8", mode: 0o600 });
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
        const events = [...cachedEvents, event];
        replayEvents(events);
        const temporary = `${file}.tmp`;
        await writeFile(temporary, renderMarkdownHistory(events), { encoding: "utf8", mode: 0o600 });
        await rename(temporary, file);
        cachedEvents = events;
        return structuredClone(event);
      });
      return queue;
    },
  });
}

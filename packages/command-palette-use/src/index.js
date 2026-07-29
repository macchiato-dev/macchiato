function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function defineCommandPalette({ placeholder = "Search or jump to…", commands = [] } = {}) {
  if (!Array.isArray(commands) || !commands.length || commands.length > 30) throw new Error("Command palette requires 1-30 commands");
  return Object.freeze({
    placeholder: String(placeholder),
    commands: Object.freeze(commands.map((command) => {
      const id = String(command.id || "");
      const label = String(command.label || "");
      const href = String(command.href || "");
      if (!/^[a-z][a-z0-9-]{0,40}$/.test(id) || !label || !/^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(href)) {
        throw new Error("Invalid command palette command");
      }
      return Object.freeze({ id, label, href, kind: command.kind === "search" ? "search" : "command" });
    })),
  });
}

export function renderCommandPalette(model) {
  const items = model.commands.map((command) =>
    `<a class="command-palette__item" href="${escapeHtml(command.href)}" data-command-label="${escapeHtml(command.label.toLowerCase())}" data-command-kind="${command.kind}"><span>${escapeHtml(command.label)}</span><kbd>↵</kbd></a>`).join("");
  return `<button class="command-trigger" type="button" data-command-open aria-label="${escapeHtml(model.placeholder)}"><span>${escapeHtml(model.placeholder)}</span><kbd data-command-shortcut>Ctrl K</kbd></button>
    <dialog class="command-palette" data-command-dialog aria-label="${escapeHtml(model.placeholder)}">
      <div class="command-palette__surface">
        <div class="command-palette__search"><span aria-hidden="true">⌕</span><input type="search" data-command-input aria-label="${escapeHtml(model.placeholder)}" placeholder="${escapeHtml(model.placeholder)}"><kbd>Esc</kbd></div>
        <div class="command-palette__list" data-command-list>${items}<a class="command-palette__item command-palette__search-elsewhere" href="/browse" data-search-elsewhere><span>Search Resources.co</span><kbd>↵</kbd></a></div>
      </div>
    </dialog>`;
}

export const commandPaletteClientPath = "/-/command-palette-use/client.js";

export const DEFAULT_TERMINAL_LIMITS = Object.freeze({ rows: 24, columns: 80, scrollback: 1_000, maxWriteCharacters: 32_768, maxSurfaceOperations: 40_000, surfaceRefillMs: 1_000 });

function integer(value, fallback, maximum, name) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) throw new TypeError(`${name} must be an integer from 1 to ${maximum}`);
  return number;
}

export function normalizeTerminalLimits(input = {}) {
  return Object.freeze({
    rows: integer(input.rows, DEFAULT_TERMINAL_LIMITS.rows, 200, "rows"),
    columns: integer(input.columns, DEFAULT_TERMINAL_LIMITS.columns, 500, "columns"),
    scrollback: integer(input.scrollback, DEFAULT_TERMINAL_LIMITS.scrollback, 10_000, "scrollback"),
    maxWriteCharacters: integer(input.maxWriteCharacters, DEFAULT_TERMINAL_LIMITS.maxWriteCharacters, 1_000_000, "maxWriteCharacters"),
    maxSurfaceOperations: integer(input.maxSurfaceOperations, DEFAULT_TERMINAL_LIMITS.maxSurfaceOperations, 100_000, "maxSurfaceOperations"),
    surfaceRefillMs: integer(input.surfaceRefillMs, DEFAULT_TERMINAL_LIMITS.surfaceRefillMs, 60_000, "surfaceRefillMs"),
  });
}

export function createTerminalDomPolicy(input = {}) {
  const limits = normalizeTerminalLimits(input);
  return Object.freeze({
    tags: ["div", "span", "textarea", "canvas", "style"],
    events: ["auxclick", "blur", "click", "compositionend", "compositionstart", "compositionupdate", "contextmenu", "copy", "focus", "input", "keydown", "keypress", "keyup", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "paste", "pointerdown", "pointerleave", "pointermove", "pointerup", "scroll", "touchend", "touchmove", "touchstart", "wheel"],
    attributes: {
      class: "^[^<>\"']{0,300}$",
      style: /^(?![\s\S]*(?:url\s*\(|@import|:\/\/|\/\/|image-set\s*\(|src\s*\())[^<>"']{0,3000}$/i,
      role: "^(?:application|document|list|listitem|presentation|textbox)$",
      "aria-label": "^[^<>]{0,200}$", "aria-multiline": "^(?:true|false)$",
      "aria-live": "^(?:off|polite|assertive)$", "aria-hidden": "^(?:true|false)$",
      "aria-roledescription": "^[^<>]{0,120}$", tabindex: "^-?\\d+$",
      spellcheck: "^(?:true|false)$", autocorrect: "^(?:on|off)$",
      autocapitalize: "^(?:on|off|none)$", cols: "^\\d{1,4}$", dir: "^(?:ltr|rtl|auto)$", readonly: "^$",
    },
    classNames: ["^xterm(?:-[A-Za-z0-9_-]+)?$", "^(?:terminal|composition-view|active|focus|invisible|live-region|enable-mouse-events|column-select|scrollbar|slider|horizontal|vertical|mac)$"],
    // xterm's DOM renderer can use a span per visible styled cell. Scrollback
    // remains internal; only the current rows × columns viewport is budgeted.
    maxElements: Math.min(10_000, limits.rows * limits.columns + 250),
    maxTagCounts: { div: Math.min(1_200, limits.rows * 6 + 120), span: Math.min(9_500, limits.rows * limits.columns + 100), textarea: 1, canvas: 8, style: 4 },
    maxDepth: 12,
    maxTextLength: Math.min(1_000_000, (limits.rows + limits.scrollback) * limits.columns * 2),
    maxOperations: limits.maxSurfaceOperations,
  });
}

export const TERMINAL_DOM_POLICY = createTerminalDomPolicy();

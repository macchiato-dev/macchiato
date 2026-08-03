export const CODE_EDITOR_LINE_LIMITS = Object.freeze({
  compact: 100,
  standard: 1_000,
  large: 5_000,
});

export const DEFAULT_CODE_EDITOR_LIMITS = Object.freeze({
  maxLines: CODE_EDITOR_LINE_LIMITS.large,
  maxCharacters: 1_000_000,
  maxSurfaceOperations: 75_000,
  surfaceRefillMs: 1_000,
});

function boundedInteger(value, fallback, maximum, label) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw new TypeError(`${label} must be an integer from 1 to ${maximum}`);
  }
  return number;
}

export function normalizeCodeEditorLimits(input = {}) {
  return Object.freeze({
    maxLines: boundedInteger(input.maxLines, DEFAULT_CODE_EDITOR_LIMITS.maxLines, 5_000, "maxLines"),
    maxCharacters: boundedInteger(input.maxCharacters, DEFAULT_CODE_EDITOR_LIMITS.maxCharacters, 1_000_000, "maxCharacters"),
    maxSurfaceOperations: boundedInteger(input.maxSurfaceOperations, DEFAULT_CODE_EDITOR_LIMITS.maxSurfaceOperations, 1_000_000, "maxSurfaceOperations"),
    surfaceRefillMs: boundedInteger(input.surfaceRefillMs, DEFAULT_CODE_EDITOR_LIMITS.surfaceRefillMs, 60_000, "surfaceRefillMs"),
  });
}

export function createCodeEditorDomPolicy(input = {}) {
  const limits = normalizeCodeEditorLimits(input);
  const maxElements = Math.min(10_000, limits.maxLines * 2 + 600);
  return Object.freeze({
    tags: ["div", "span", "br", "img", "input", "button", "label", "ul", "li", "style"],
    events: [
      "beforeinput", "blur", "change", "click", "compositionend", "compositionstart", "compositionupdate",
      "contextmenu", "copy", "cut", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "focus", "input", "keydown", "keyup",
      "mousedown", "mousemove", "mouseup", "mousewheel", "paste", "scroll", "touchcancel", "touchend", "touchmove", "touchstart", "wheel",
    ],
    attributes: {
      class: "^[^<>\"']{0,240}$",
      style: "^[^<>\"']{0,2400}$",
      role: "^(?:textbox|presentation|status|button|listbox|option)$",
      "aria-label": "^[^<>]{0,160}$",
      "aria-live": "^(?:polite|assertive|off)$",
      "aria-hidden": "^(?:true|false)$",
      "aria-selected": "^(?:true|false)$",
      "aria-expanded": "^(?:true|false)$",
      "aria-haspopup": "^listbox$",
      "aria-autocomplete": "^(?:list|none)$",
      "aria-multiline": "^(?:true|false)$",
      "aria-readonly": "^(?:true|false)$",
      "aria-controls": "^[A-Za-z0-9_-]{0,120}$",
      "aria-activedescendant": "^[A-Za-z0-9_-]{0,120}$",
      contenteditable: "^(?:true|false)$",
      tabindex: "^-?\\d+$",
      spellcheck: "^(?:true|false)$",
      writingsuggestions: "^(?:true|false)$",
      autocorrect: "^(?:on|off)$",
      autocapitalize: "^(?:on|off|none)$",
      translate: "^(?:yes|no)$",
      src: "^data:image/gif;base64,[A-Za-z0-9+/=]+$",
      alt: "^[^<>]{0,80}$",
      type: "^(?:text|checkbox|button)$",
      name: "^[A-Za-z0-9_-]{0,80}$",
      value: "^[^<>]{0,500}$",
      id: "^[A-Za-z0-9_-]{1,120}$",
      title: "^[^<>]{0,160}$",
      placeholder: "^[^<>]{0,160}$",
      "data-language": "^(?:javascript|html|css|json|markdown)$",
      form: "^$",
      "main-field": "^true$",
    },
    classNames: ["^cm-[A-Za-z0-9_-]+$", "^tok-[A-Za-z0-9_-]+$", "^ͼ[A-Za-z0-9]+$"],
    // CodeMirror normally virtualizes rows, but conservative guest geometry can
    // transiently retain one div per allowed line during a large replacement.
    maxElements,
    maxTagCounts: {
      div: limits.maxLines + 360,
      span: Math.min(maxElements, limits.maxLines * 4 + 256),
      input: 24, button: 32, ul: 8, li: 120, style: 12,
    },
    maxDepth: 16,
    maxTextLength: limits.maxCharacters,
    maxOperations: limits.maxSurfaceOperations,
  });
}

export const CODE_EDITOR_DOM_POLICY = createCodeEditorDomPolicy();

import { baseKeymap, setBlockType, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { BrowserDomHost } from "@macchiato-dev/browser-use";
import { Command } from "wordgard/command";
import { Wordgard } from "wordgard/editor";
import { history as wordgardHistory, redo as wordgardRedo, undo as wordgardUndo } from "wordgard/history";
import {
  blockDoc,
  code as wordgardCode,
  emphasis as wordgardEmphasis,
  lineBreak,
  paragraph,
  strong as wordgardStrong,
} from "wordgard/schema";

const MAX_CHARACTERS = 20_000;

export const PROSE_EDITOR_SCHEMA = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM: () => ["p", 0],
      parseDOM: [{ tag: "p" }],
    },
    text: { group: "inline" },
    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      toDOM: () => ["br"],
      parseDOM: [{ tag: "br" }],
    },
  },
  marks: {
    strong: {
      toDOM: () => ["strong", 0],
      parseDOM: [{ tag: "strong" }, { tag: "b", getAttrs: (node) => node.style.fontWeight !== "normal" && null }],
    },
    emphasis: {
      toDOM: () => ["em", 0],
      parseDOM: [{ tag: "em" }, { tag: "i" }],
    },
    code: {
      excludes: "_",
      toDOM: () => ["code", 0],
      parseDOM: [{ tag: "code" }],
    },
  },
});

export const MESSAGE_EDITOR_SURFACE_BASE = Object.freeze({
  tags: ["p", "strong", "em", "code", "br"],
  attributes: Object.freeze({
    contenteditable: "^(?:true|false)$",
    translate: "^(?:yes|no)$",
    spellcheck: "^(?:true|false)$",
    "aria-label": "^Message$",
  }),
  maxElements: 800,
  maxDepth: 24,
  maxTextLength: MAX_CHARACTERS,
  maxOperations: 20_000,
});

export function createMessageEditorSurfacePolicy({ tags = [], attributes = {}, classNames = [], maxTagCounts = {} } = {}) {
  return Object.freeze({
    ...MESSAGE_EDITOR_SURFACE_BASE,
    tags: [...MESSAGE_EDITOR_SURFACE_BASE.tags, ...tags],
    attributes: { ...MESSAGE_EDITOR_SURFACE_BASE.attributes, ...attributes },
    classNames,
    maxTagCounts: { p: 500, strong: 400, em: 400, code: 400, br: 500, ...maxTagCounts },
  });
}

export const PROSE_EDITOR_DOM_POLICY = createMessageEditorSurfacePolicy({
  tags: ["div"],
  attributes: {
    class: "^(?:ProseMirror|ProseMirror-focused|ProseMirror-hideselection|ProseMirror-separator|ProseMirror-trailingBreak)(?:\\s+(?:ProseMirror|ProseMirror-focused|ProseMirror-hideselection|ProseMirror-separator|ProseMirror-trailingBreak))*$",
    "data-pm-slice": "^[0-9]+ [0-9]+(?: -?[0-9]+)?(?: \\[[^<>]{0,200}\\])?$",
  },
  classNames: [
    "^ProseMirror$",
    "^ProseMirror-focused$",
    "^ProseMirror-hideselection$",
    "^ProseMirror-separator$",
    "^ProseMirror-trailingBreak$",
  ],
  maxTagCounts: { div: 40 },
});

export const WORDGARD_EDITOR_DOM_POLICY = createMessageEditorSurfacePolicy({
  tags: ["wordgard-editor", "wg-announced", "wg-scroller", "wg-content", "wg-cursor-layer", "wg-cursor", "div"],
  attributes: {
    class: "^[^<>\"']{0,240}$",
    "aria-live": "^(?:polite|assertive)$",
    "aria-atomic": "^(?:true|false)$",
    "aria-multiline": "^(?:true|false)$",
    id: "^wordgard-[a-f0-9]{1,6}$",
    tabindex: "^-?\\d+$",
    role: "^(?:textbox|status)$",
    style: "^(?:(?:position|top|left|right|bottom|width|height|overflow|pointer-events|opacity):[^;<>\"']{0,120};?\\s*|animation-duration:\\s*[0-9]{1,5}ms;?\\s*|animation-name:\\s*wg-blink[0-9]*;?\\s*|caret-color:\\s*transparent\\s*!important;?\\s*){0,12}$",
  },
  classNames: [
    "^wg-[A-Za-z0-9_-]+$",
    "^ͼ[A-Za-z0-9]+$",
  ],
  maxTagCounts: {
    "wordgard-editor": 1, "wg-announced": 2, "wg-scroller": 1,
    "wg-content": 1, "wg-cursor-layer": 2, "wg-cursor": 8, div: 80,
  },
});

function attachMessageEditorSurface({ parent, policy, dispose, onShape, onViolation, stop }) {
  const surface = new BrowserDomHost(parent, policy, {
    onViolation(error) {
      stop();
      dispose();
      parent.replaceChildren();
      onViolation(error);
    },
  });
  try {
    surface.start();
    onShape(surface.inspectSurface());
    return surface;
  } catch (error) {
    stop();
    dispose();
    parent.replaceChildren();
    throw error;
  }
}

function documentFromText(value) {
  const paragraphs = String(value)
    .slice(0, MAX_CHARACTERS)
    .split(/\n{2,}/)
    .map((text) => PROSE_EDITOR_SCHEMA.nodes.paragraph.create(
      null,
      text ? PROSE_EDITOR_SCHEMA.text(text.replace(/\n/g, " ")) : null,
    ));
  return PROSE_EDITOR_SCHEMA.nodes.doc.create(null, paragraphs.length ? paragraphs : [
    PROSE_EDITOR_SCHEMA.nodes.paragraph.create(),
  ]);
}

function editorSnapshot(view) {
  return Object.freeze({
    text: view.state.doc.textBetween(0, view.state.doc.content.size, "\n\n"),
    characters: view.state.doc.textContent.length,
    paragraphs: view.state.doc.childCount,
    json: view.state.doc.toJSON(),
  });
}

export function createProseEditor({
  parent,
  document = "Write a thoughtful message.",
  onChange = () => {},
  onShape = () => {},
  onViolation = () => {},
} = {}) {
  if (!parent?.replaceChildren) throw new Error("prose-editor-use requires a parent element");
  parent.replaceChildren();
  let browserDom;
  let stopped = false;
  const state = EditorState.create({
    schema: PROSE_EDITOR_SCHEMA,
    doc: documentFromText(document),
    plugins: [
      history(),
      keymap({
        "Mod-b": toggleMark(PROSE_EDITOR_SCHEMA.marks.strong),
        "Mod-i": toggleMark(PROSE_EDITOR_SCHEMA.marks.emphasis),
        "Mod-`": toggleMark(PROSE_EDITOR_SCHEMA.marks.code),
        "Mod-z": undo,
        "Shift-Mod-z": redo,
        "Mod-y": redo,
        "Shift-Enter": (state, dispatch) => {
          dispatch?.(state.tr.replaceSelectionWith(PROSE_EDITOR_SCHEMA.nodes.hard_break.create()).scrollIntoView());
          return true;
        },
      }),
      keymap(baseKeymap),
    ],
  });
  const view = new EditorView(parent, {
    state,
    dispatchTransaction(transaction) {
      if (stopped) return;
      const next = view.state.apply(transaction);
      if (next.doc.textContent.length > MAX_CHARACTERS) return;
      view.updateState(next);
      if (transaction.docChanged) onChange(editorSnapshot(view));
    },
    attributes: {
      "aria-label": "Message",
      spellcheck: "true",
    },
  });
  browserDom = attachMessageEditorSurface({
    parent, policy: PROSE_EDITOR_DOM_POLICY, dispose: () => view.destroy(), onShape, onViolation,
    stop: () => { stopped = true; },
  });

  const run = (command) => {
    if (stopped) return false;
    const handled = command(view.state, view.dispatch, view);
    if (handled) view.focus();
    return handled;
  };
  return Object.freeze({
    view,
    browserDom,
    snapshot: () => editorSnapshot(view),
    focus: () => view.focus(),
    toggleStrong: () => run(toggleMark(PROSE_EDITOR_SCHEMA.marks.strong)),
    toggleEmphasis: () => run(toggleMark(PROSE_EDITOR_SCHEMA.marks.emphasis)),
    toggleCode: () => run(toggleMark(PROSE_EDITOR_SCHEMA.marks.code)),
    setParagraph: () => run(setBlockType(PROSE_EDITOR_SCHEMA.nodes.paragraph)),
    undo: () => run(undo),
    redo: () => run(redo),
    selectAll() {
      if (stopped) return;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, view.state.doc.content.size - 1)));
      view.focus();
    },
    inspect: () => browserDom.inspectSurface(),
    destroy() {
      stopped = true;
      browserDom.stop();
      view.destroy();
      parent.replaceChildren();
    },
  });
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}

function wordgardDocument(value) {
  return String(value)
    .slice(0, MAX_CHARACTERS)
    .split(/\n{2,}/)
    .map((text) => `<p>${escapeHtml(text.replace(/\n/g, " "))}</p>`)
    .join("");
}

export function createWordgardEditor({
  parent,
  document = "Write a thoughtful message.",
  onChange = () => {},
  onShape = () => {},
  onViolation = () => {},
} = {}) {
  if (!parent?.replaceChildren) throw new Error("prose-editor-use requires a parent element");
  parent.replaceChildren();
  let browserDom;
  let stopped = false;
  const editor = Wordgard.create({
    parent,
    doc: wordgardDocument(document),
    config: [
      blockDoc(),
      paragraph(),
      lineBreak(),
      wordgardStrong(),
      wordgardEmphasis(),
      wordgardCode(),
      wordgardHistory(),
      Wordgard.label("Message"),
      Wordgard.contentAttributes.of({ spellcheck: "true" }),
      Wordgard.updateListener.of((update) => {
        if (update.docChanged && !stopped) {
          update.editor.flush();
          onChange(wordgardSnapshot(update.editor));
        }
      }),
    ],
  });
  editor.flush();
  browserDom = attachMessageEditorSurface({
    parent, policy: WORDGARD_EDITOR_DOM_POLICY, dispose: () => editor.dom.remove(), onShape, onViolation,
    stop: () => { stopped = true; },
  });
  const run = (command) => {
    if (stopped) return false;
    const handled = Command.dispatch(editor, command);
    if (handled) editor.focus();
    return handled;
  };
  return Object.freeze({
    engine: "Wordgard",
    view: editor,
    browserDom,
    snapshot: () => wordgardSnapshot(editor),
    focus: () => editor.focus(),
    toggleStrong: () => run(wordgardStrong.button.run),
    toggleEmphasis: () => run(wordgardEmphasis.button.run),
    toggleCode: () => run(wordgardCode.button.run),
    undo: () => run(wordgardUndo),
    redo: () => run(wordgardRedo),
    inspect: () => browserDom.inspectSurface(),
    destroy() {
      stopped = true;
      browserDom.stop();
      editor.dom.remove();
      parent.replaceChildren();
    },
  });
}

function wordgardSnapshot(editor) {
  const text = editor.state.doc.textContent({ blockSeparator: "\n\n" });
  return Object.freeze({
    text,
    characters: text.length,
    paragraphs: editor.contentDOM.querySelectorAll("p").length,
    json: editor.state.doc.toJSON(),
  });
}

export function createMessageEditor({ engine = "prosemirror", ...options } = {}) {
  if (engine === "prosemirror") {
    const editor = createProseEditor(options);
    return Object.freeze({ ...editor, engine: "ProseMirror" });
  }
  if (engine === "wordgard") return createWordgardEditor(options);
  throw new Error(`Unsupported message editor engine: ${engine}`);
}

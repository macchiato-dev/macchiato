import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { BrowserDomHost } from "@macchiato-dev/browser-use";

export const CODE_EDITOR_DOM_POLICY = Object.freeze({
  tags: ["div", "span", "br", "img", "input", "button", "label", "ul", "li"],
  attributes: {
    class: "^[^<>\"']{0,240}$",
    style: "^(?:(?:min-height|max-height|height|min-width|max-width|width|left|right|top|bottom|transform|position|visibility|pointer-events|font-family|font-size|line-height|white-space|tab-size|overflow|overflow-x|overflow-y|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|color|background(?:-color)?|border(?:-[a-z]+)?|outline|caret-color|opacity|z-index|animation-duration):[^;<>\"']{0,200};?\\s*|animation-name:\\s*cm-blink[0-9]*;?\\s*|display:\\s*(?:none|block|inline-block);?\\s*){0,30}$",
    role: "^(?:textbox|presentation|status|button|listbox|option)$",
    "aria-label": "^[^<>]{0,160}$",
    "aria-live": "^(?:polite|assertive|off)$",
    "aria-hidden": "^(?:true|false)$",
    "aria-selected": "^(?:true|false)$",
    "aria-expanded": "^(?:true|false)$",
    "aria-haspopup": "^listbox$",
    "aria-autocomplete": "^(?:list|none)$",
    "aria-multiline": "^(?:true|false)$",
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
    "data-language": "^(?:javascript)$",
    form: "^$",
    "main-field": "^true$",
  },
  classNames: [
    "^cm-[A-Za-z0-9_-]+$",
    "^tok-[A-Za-z0-9_-]+$",
    "^ͼ[A-Za-z0-9]+$",
  ],
  maxElements: 600,
  maxDepth: 16,
  maxTextLength: 200_000,
});

export function createCodeEditor({
  parent,
  document = "const greeting = \"Hello, constrained editor!\";\nconsole.log(greeting);",
  onChange = () => {},
  onShape = () => {},
  onViolation = () => {},
} = {}) {
  if (!parent?.replaceChildren) throw new Error("code-editor-use requires a parent element");
  parent.replaceChildren();
  const state = EditorState.create({
    doc: String(document).slice(0, 100_000),
    extensions: [
      basicSetup,
      javascript(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
    ],
  });
  const view = new EditorView({ state, parent });
  const browserDom = new BrowserDomHost(parent, CODE_EDITOR_DOM_POLICY, {
    onViolation(error) {
      view.destroy();
      onViolation(error);
    },
  });
  try {
    browserDom.start();
    onShape(browserDom.inspect());
  } catch (error) {
    view.destroy();
    parent.replaceChildren();
    throw error;
  }
  return Object.freeze({
    view,
    browserDom,
    get value() {
      return view.state.doc.toString();
    },
    setValue(value) {
      const next = String(value).slice(0, 100_000);
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
      onShape(browserDom.inspect());
    },
    inspect() {
      return browserDom.inspect();
    },
    destroy() {
      browserDom.stop();
      view.destroy();
      parent.replaceChildren();
    },
  });
}

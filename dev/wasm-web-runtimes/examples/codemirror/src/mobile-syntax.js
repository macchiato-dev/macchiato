import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";

const LOOKBACK_LINES = 400;
const classes = {
  comment: "cm-mobile-comment", keyword: "cm-mobile-keyword",
  number: "cm-mobile-number", string: "cm-mobile-string",
  heading: "cm-mobile-heading", tag: "cm-mobile-tag",
  attribute: "cm-mobile-attribute", property: "cm-mobile-property",
  fence: "cm-mobile-fence", link: "cm-mobile-link",
};

function add(tokens, from, to, kind) {
  if (to > from) tokens.push({ from, to, kind });
}

function boundedStart(doc, from) {
  const line = doc.lineAt(from);
  return doc.line(Math.max(1, line.number - LOOKBACK_LINES)).from;
}

function javascriptState(prefix) {
  let state = "normal";
  let blankLine = true;
  for (let at = 0; at < prefix.length;) {
    if (state === "template" && blankLine && (at === 0 || prefix[at - 1] === "\n")) {
      const line = prefix.slice(at, prefix.indexOf("\n", at) < 0 ? prefix.length :
        prefix.indexOf("\n", at));
      // A bounded scan can begin inside a template whose opening delimiter is
      // outside the window. A top-level declaration after a blank line is a
      // practical recovery point in ordinary modules and generated bundles.
      if (/^\s*(?:export\s+|import\s+|(?:async\s+)?function\s+|class\s+|(?:const|let|var)\s+)/
        .test(line)) state = "normal";
    }
    if (state === "comment") {
      const end = prefix.indexOf("*/", at);
      if (end < 0) return state;
      state = "normal";
      at = end + 2;
    } else if (state === "line-comment") {
      const end = prefix.indexOf("\n", at);
      if (end < 0) return "normal";
      state = "normal";
      at = end + 1;
    } else if (state === "template" || state === "single" || state === "double") {
      const quote = state === "template" ? "`" : state === "single" ? "'" : "\"";
      if (prefix[at] === "\\") at += 2;
      else if (prefix[at++] === quote) state = "normal";
      else if (prefix[at - 1] === "\n") {
        blankLine = prefix.slice(Math.max(0, prefix.lastIndexOf("\n", at - 2) + 1), at - 1)
          .trim().length === 0;
        if (quote !== "`") state = "normal";
      }
    } else if (prefix.startsWith("/*", at)) {
      state = "comment";
      at += 2;
    } else if (prefix.startsWith("//", at)) {
      state = "line-comment";
      at += 2;
    } else if (prefix[at] === "`") {
      state = "template";
      at++;
    } else if (prefix[at] === "'") {
      state = "single";
      at++;
    } else if (prefix[at] === "\"") {
      state = "double";
      at++;
    } else {
      if (prefix[at] === "\n") {
        const start = prefix.lastIndexOf("\n", at - 1) + 1;
        blankLine = prefix.slice(start, at).trim().length === 0;
      }
      at++;
    }
  }
  return state === "comment" || state === "template" ? state : "normal";
}

function javascriptInitial(prefix, text) {
  let state = javascriptState(prefix);
  if (state !== "normal") return state;
  const commentClose = text.indexOf("*/");
  const commentOpen = text.indexOf("/*");
  if (commentClose >= 0 && (commentOpen < 0 || commentClose < commentOpen)) return "comment";

  const synchronization = /\n\s*\n\s*(?:export\s+|import\s+|(?:async\s+)?function\s+|class\s+|(?:const|let|var)\s+)/
    .exec(text);
  const sample = text.slice(0, synchronization ? synchronization.index : text.length);
  let delimiters = 0;
  for (let at = 0; at < sample.length; at++) {
    if (sample[at] === "\\") at++;
    else if (sample[at] === "`") delimiters++;
  }
  return delimiters % 2 ? "template" : "normal";
}

const jsKeywords = new Set((
  "async await break case catch class const continue debugger default delete " +
  "do else export extends finally for from function get if import in instanceof " +
  "let new of return set static super switch throw try typeof var void while with yield"
).split(" "));

function javascriptScan(text, offset, initial = "normal") {
  const tokens = [];
  let state = initial;
  let blankLine = true;
  let at = 0;
  while (at < text.length) {
    const start = at;
    if (state === "template" && blankLine && (at === 0 || text[at - 1] === "\n")) {
      const lineEnd = text.indexOf("\n", at);
      const line = text.slice(at, lineEnd < 0 ? text.length : lineEnd);
      if (/^\s*(?:export\s+|import\s+|(?:async\s+)?function\s+|class\s+|(?:const|let|var)\s+)/
        .test(line)) state = "normal";
    }
    if (state === "comment") {
      const end = text.indexOf("*/", at);
      at = end < 0 ? text.length : end + 2;
      add(tokens, offset + start, offset + at, "comment");
      if (end >= 0) state = "normal";
    } else if (state === "template") {
      while (at < text.length) {
        if (text[at] === "\\") { at += 2; continue; }
        if (text[at] === "`") { at++; state = "normal"; break; }
        if (text[at] === "\n") {
          const lineStart = text.lastIndexOf("\n", at - 1) + 1;
          blankLine = text.slice(lineStart, at).trim().length === 0;
        }
        at++;
        if (blankLine && at < text.length && (at === 0 || text[at - 1] === "\n")) break;
      }
      add(tokens, offset + start, offset + at, "string");
    } else if (text.startsWith("/*", at)) {
      state = "comment";
    } else if (text.startsWith("//", at)) {
      at = text.indexOf("\n", at);
      if (at < 0) at = text.length;
      add(tokens, offset + start, offset + at, "comment");
    } else if (text[at] === "`" || text[at] === "\"" || text[at] === "'") {
      const quote = text[at++];
      while (at < text.length) {
        if (text[at] === "\\") at += 2;
        else if (text[at++] === quote) break;
        else if (quote !== "`" && text[at - 1] === "\n") break;
      }
      if (quote === "`" && text[at - 1] !== "`") state = "template";
      add(tokens, offset + start, offset + Math.min(at, text.length), "string");
    } else if (/[A-Za-z_$]/.test(text[at])) {
      while (at < text.length && /[\w$]/.test(text[at])) at++;
      if (jsKeywords.has(text.slice(start, at))) add(tokens, offset + start, offset + at, "keyword");
    } else if (/\d/.test(text[at])) {
      while (at < text.length && /[\w.xob_]/i.test(text[at])) at++;
      add(tokens, offset + start, offset + at, "number");
    } else {
      if (text[at] === "\n") {
        const lineStart = text.lastIndexOf("\n", at - 1) + 1;
        blankLine = text.slice(lineStart, at).trim().length === 0;
      }
      at++;
    }
  }
  return { tokens, state };
}

function javascriptTokens(text, offset, initial = "normal") {
  return javascriptScan(text, offset, initial).tokens;
}

function cssState(prefix) {
  let state = "normal";
  for (let at = 0; at < prefix.length;) {
    if (state === "comment") {
      const end = prefix.indexOf("*/", at);
      if (end < 0) return state;
      state = "normal";
      at = end + 2;
    } else if (state === "single" || state === "double") {
      const quote = state === "single" ? "'" : "\"";
      if (prefix[at] === "\\") at += 2;
      else if (prefix[at++] === quote) state = "normal";
    } else if (prefix.startsWith("/*", at)) {
      state = "comment";
      at += 2;
    } else if (prefix[at] === "'") {
      state = "single";
      at++;
    } else if (prefix[at] === "\"") {
      state = "double";
      at++;
    } else at++;
  }
  return state;
}

function cssInitial(prefix, text) {
  const state = cssState(prefix);
  if (state !== "normal") return state;
  const close = text.indexOf("*/");
  const open = text.indexOf("/*");
  return close >= 0 && (open < 0 || close < open) ? "comment" : "normal";
}

function cssScan(text, offset, initial = "normal") {
  const tokens = [];
  let state = initial;
  let at = 0;
  while (at < text.length) {
    const start = at;
    if (state === "comment") {
      const end = text.indexOf("*/", at);
      at = end < 0 ? text.length : end + 2;
      add(tokens, offset + start, offset + at, "comment");
      if (end >= 0) state = "normal";
    } else if (state === "single" || state === "double") {
      const quote = state === "single" ? "'" : "\"";
      while (at < text.length) {
        if (text[at] === "\\") at += 2;
        else if (text[at++] === quote) { state = "normal"; break; }
      }
      add(tokens, offset + start, offset + Math.min(at, text.length), "string");
    } else if (text.startsWith("/*", at)) {
      state = "comment";
    } else if (text[at] === "\"" || text[at] === "'") {
      const quote = text[at++];
      state = quote === "'" ? "single" : "double";
      while (at < text.length) {
        if (text[at] === "\\") at += 2;
        else if (text[at++] === quote) { state = "normal"; break; }
      }
      add(tokens, offset + start, offset + Math.min(at, text.length), "string");
    } else if (text[at] === "@") {
      while (++at < text.length && /[-\w]/.test(text[at])) {}
      add(tokens, offset + start, offset + at, "keyword");
    } else if (text[at] === "#" || /\d/.test(text[at])) {
      while (++at < text.length && /[-\w.%]/.test(text[at])) {}
      add(tokens, offset + start, offset + at, "number");
    } else if (/[A-Za-z_-]/.test(text[at])) {
      while (++at < text.length && /[-\w]/.test(text[at])) {}
      let next = at;
      while (/\s/.test(text[next] || "")) next++;
      if (text[next] === ":") add(tokens, offset + start, offset + at, "property");
    } else at++;
  }
  return { tokens, state };
}

function cssTokens(text, offset, initial = "normal") {
  return cssScan(text, offset, initial).tokens;
}

function markdownFence(prefix) {
  let fence = null;
  for (const line of prefix.split("\n")) {
    const match = /^\s*(```+|~~~+)\s*([\w-]*)/.exec(line);
    if (match && (!fence ||
        (match[1][0] === fence.marker && match[1].length >= fence.length))) {
      fence = fence ? null : {
        marker: match[1][0], length: match[1].length,
        language: match[2].toLowerCase(), inner: "normal",
      };
    } else if (fence && /^(js|javascript|ts|typescript)$/.test(fence.language)) {
      fence.inner = javascriptScan(line, 0, fence.inner).state;
    } else if (fence && fence.language === "css") {
      fence.inner = cssScan(line, 0, fence.inner).state;
    }
  }
  return fence;
}

function markdownTokens(text, offset, initialFence) {
  const tokens = [];
  let fence = initialFence;
  let at = 0;
  for (const line of text.split("\n")) {
    const end = at + line.length;
    const marker = /^\s*(```+|~~~+)\s*([\w-]*)/.exec(line);
    if (marker && (!fence ||
        (marker[1][0] === fence.marker && marker[1].length >= fence.length))) {
      add(tokens, offset + at, offset + end, "fence");
      fence = fence ? null : {
        marker: marker[1][0], length: marker[1].length,
        language: marker[2].toLowerCase(), inner: "normal",
      };
    } else if (fence) {
      if (/^(js|javascript|ts|typescript)$/.test(fence.language)) {
        const result = javascriptScan(line, offset + at, fence.inner);
        tokens.push(...result.tokens);
        fence.inner = result.state;
      } else if (fence.language === "css") {
        const result = cssScan(line, offset + at, fence.inner);
        tokens.push(...result.tokens);
        fence.inner = result.state;
      }
      else if (/^(html|xml)$/.test(fence.language)) tokens.push(...htmlTokens(line, offset + at));
      else add(tokens, offset + at, offset + end, "string");
    } else {
      const heading = /^\s{0,3}#{1,6}\s/.exec(line);
      if (heading) add(tokens, offset + at, offset + end, "heading");
      const inline = /`[^`]+`|!?\[[^\]]+\]\([^\s)]+\)/g;
      let match;
      while ((match = inline.exec(line)))
        add(tokens, offset + at + match.index, offset + at + match.index + match[0].length,
          match[0][0] === "`" ? "string" : "link");
    }
    at = end + 1;
  }
  return tokens;
}

function htmlState(prefix) {
  const lower = prefix.toLowerCase();
  let state = { mode: "normal", inner: "normal" };
  let at = 0;
  while (at < prefix.length) {
    if (state.mode === "comment") {
      const end = prefix.indexOf("-->", at);
      if (end < 0) return state;
      state = { mode: "normal", inner: "normal" };
      at = end + 3;
    } else if (state.mode === "javascript" || state.mode === "css") {
      const closing = state.mode === "javascript" ? "</script" : "</style";
      const end = lower.indexOf(closing, at);
      const segment = prefix.slice(at, end < 0 ? prefix.length : end);
      state.inner = (state.mode === "javascript" ? javascriptScan : cssScan)(
        segment, 0, state.inner).state;
      if (end < 0) return state;
      state = { mode: "normal", inner: "normal" };
      at = end;
    } else if (prefix.startsWith("<!--", at)) {
      state = { mode: "comment", inner: "normal" };
      at += 4;
    } else if (prefix[at] === "<") {
      const end = prefix.indexOf(">", at + 1);
      if (end < 0) return state;
      const tag = lower.slice(at, end + 1);
      if (/^<script\b/.test(tag)) state = { mode: "javascript", inner: "normal" };
      else if (/^<style\b/.test(tag)) state = { mode: "css", inner: "normal" };
      at = end + 1;
    } else at++;
  }
  return state;
}

function htmlInitial(prefix, text) {
  const state = htmlState(prefix);
  if (state.mode !== "normal") return state;
  const lower = text.toLowerCase();
  const candidates = [
    { close: "-->", open: "<!--", mode: "comment" },
    { close: "</script", open: "<script", mode: "javascript" },
    { close: "</style", open: "<style", mode: "css" },
  ];
  for (const candidate of candidates) {
    const close = lower.indexOf(candidate.close);
    const open = lower.indexOf(candidate.open);
    if (close >= 0 && (open < 0 || close < open)) {
      return { mode: candidate.mode, inner: "normal" };
    }
  }
  return state;
}

function htmlTokens(text, offset, initial = { mode: "normal", inner: "normal" }) {
  const tokens = [];
  let state = typeof initial === "string" ? { mode: initial, inner: "normal" } : initial;
  let at = 0;
  const lower = text.toLowerCase();
  while (at < text.length) {
    if (state.mode === "comment") {
      const end = text.indexOf("-->", at);
      const to = end < 0 ? text.length : end + 3;
      add(tokens, offset + at, offset + to, "comment");
      at = to;
      if (end >= 0) state = { mode: "normal", inner: "normal" };
    } else if (state.mode === "javascript" || state.mode === "css") {
      const close = lower.indexOf(state.mode === "javascript" ? "</script" : "</style", at);
      const to = close < 0 ? text.length : close;
      const result = (state.mode === "javascript" ? javascriptScan : cssScan)(
        text.slice(at, to), offset + at, state.inner);
      tokens.push(...result.tokens);
      state.inner = result.state;
      at = to;
      if (close >= 0) state = { mode: "normal", inner: "normal" };
    } else if (text.startsWith("<!--", at)) {
      state = { mode: "comment", inner: "normal" };
    } else if (text[at] === "<") {
      const end = text.indexOf(">", at + 1);
      const to = end < 0 ? text.length : end + 1;
      const tag = /^<\/?\s*[-\w:]+/.exec(text.slice(at, to));
      if (tag) add(tokens, offset + at, offset + at + tag[0].length, "tag");
      const attributes = /\s([-:\w]+)(?=\s*=)/g;
      const source = text.slice(at, to);
      let match;
      while ((match = attributes.exec(source)))
        add(tokens, offset + at + match.index + 1, offset + at + match.index + 1 + match[1].length,
          "attribute");
      if (/^<script\b/i.test(text.slice(at, to)))
        state = { mode: "javascript", inner: "normal" };
      if (/^<style\b/i.test(text.slice(at, to)))
        state = { mode: "css", inner: "normal" };
      at = to;
    } else at++;
  }
  return tokens;
}

function tokensFor(view, mode) {
  const doc = view.state.doc;
  const tokens = [];
  let parsedChars = 0;
  let lookbackChars = 0;
  for (const visible of view.visibleRanges) {
    const from = doc.lineAt(visible.from).from;
    const to = doc.lineAt(visible.to).to;
    const anchor = boundedStart(doc, from);
    const prefix = doc.sliceString(anchor, from);
    const text = doc.sliceString(from, to);
    lookbackChars += prefix.length;
    parsedChars += text.length;
    if (mode === "javascript") {
      const state = javascriptInitial(prefix, text);
      tokens.push(...javascriptTokens(text, from, state));
    } else if (mode === "css") {
      const state = cssInitial(prefix, text);
      tokens.push(...cssTokens(text, from, state));
    } else if (mode === "markdown") {
      const state = markdownFence(prefix);
      tokens.push(...markdownTokens(text, from, state));
    } else {
      const state = htmlInitial(prefix, text);
      tokens.push(...htmlTokens(text, from, state));
    }
  }
  tokens.sort((left, right) => left.from - right.from || left.to - right.to);
  return { tokens, parsedChars, lookbackChars };
}

function decorationsFor(tokens) {
  const builder = new RangeSetBuilder();
  let end = -1;
  for (const token of tokens) {
    if (token.from < end) continue;
    builder.add(token.from, token.to, Decoration.mark({ class: classes[token.kind] }));
    end = token.to;
  }
  return builder.finish();
}

export function inspectMobileSyntax(mode, text, prefix = "") {
  if (mode === "javascript") return javascriptScan(text, 0, javascriptInitial(prefix, text));
  if (mode === "css") return cssScan(text, 0, cssInitial(prefix, text));
  if (mode === "markdown") return {
    tokens: markdownTokens(text, 0, markdownFence(prefix)), state: markdownFence(prefix),
  };
  const state = htmlInitial(prefix, text);
  return { tokens: htmlTokens(text, 0, state), state };
}

export function mobileSyntax(mode, report) {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.scrollPending = false;
      this.refreshAfterScroll = false;
      this.onScroll = () => {
        if (this.scrollPending) return;
        this.scrollPending = true;
        requestAnimationFrame(() => {
          this.scrollPending = false;
          this.refreshAfterScroll = true;
          // CodeMirror has measured its new viewport by this frame. Reasserting
          // the current selection gives this plugin an update in runtimes where the
          // geometry-only ViewUpdate is not observable by guest extensions.
          view.dispatch({ selection: { anchor: view.state.selection.main.head } });
        });
      };
      view.scrollDOM.addEventListener("scroll", this.onScroll);
      this.refresh(view);
    }
    update(update) {
      if (this.refreshAfterScroll || update.docChanged || update.viewportChanged ||
          update.geometryChanged) {
        this.refreshAfterScroll = false;
        this.refresh(update.view);
      }
    }
    destroy() { this.view.scrollDOM.removeEventListener("scroll", this.onScroll); }
    refresh(view) {
      const start = performance.now();
      const result = tokensFor(view, mode);
      this.decorations = decorationsFor(result.tokens);
      report({ mode, documentLines: view.state.doc.lines,
        visibleRanges: view.visibleRanges.length, retainedTokens: result.tokens.length,
        parsedChars: result.parsedChars, lookbackChars: result.lookbackChars,
        updateMilliseconds: performance.now() - start });
    }
  }, { decorations: value => value.decorations });
}

export const mobileSyntaxTheme = EditorView.baseTheme({
  ".cm-mobile-comment": { color: "#708090", fontStyle: "italic" },
  ".cm-mobile-keyword": { color: "#c678dd" },
  ".cm-mobile-number": { color: "#d19a66" },
  ".cm-mobile-string": { color: "#98c379" },
  ".cm-mobile-heading": { color: "#61afef", fontWeight: "700" },
  ".cm-mobile-tag": { color: "#e06c75" },
  ".cm-mobile-attribute": { color: "#d19a66" },
  ".cm-mobile-property": { color: "#56b6c2" },
  ".cm-mobile-fence": { color: "#abb2bf", backgroundColor: "#30343c" },
  ".cm-mobile-link": { color: "#61afef", textDecoration: "underline" },
});

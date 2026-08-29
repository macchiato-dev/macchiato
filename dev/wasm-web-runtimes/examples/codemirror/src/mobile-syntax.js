import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";

const HIGHLIGHT_LINE_LIMIT = 2048;
const STATE_LINE_LIMIT = 4096;
const REFRESH_DELAY = 180;
const classes = {
  comment: "cm-mobile-comment", keyword: "cm-mobile-keyword",
  number: "cm-mobile-number", string: "cm-mobile-string",
  heading: "cm-mobile-heading", tag: "cm-mobile-tag",
  attribute: "cm-mobile-attribute", property: "cm-mobile-property",
  fence: "cm-mobile-fence", link: "cm-mobile-link",
};

function add(tokens, from, to, kind) {
  if (tokens && to > from) tokens.push({ from, to, kind });
}

function lineEnd(text, at) {
  const end = text.indexOf("\n", at);
  return end < 0 ? text.length : end;
}

function unescapedDelimiter(text, delimiter) {
  let at = text.indexOf(delimiter);
  while (at >= 0) {
    let escapes = 0;
    for (let before = at - 1; before >= 0 && text[before] === "\\"; before--) escapes++;
    if (escapes % 2 === 0) return true;
    at = text.indexOf(delimiter, at + 1);
  }
  return false;
}

function skipJavascriptTail(state, tail) {
  if (state === "comment" && tail.includes("*/")) return "normal";
  if (state === "template" && unescapedDelimiter(tail, "`")) return "normal";
  if (state === "single" && unescapedDelimiter(tail, "'")) return "normal";
  if (state === "double" && unescapedDelimiter(tail, "\"")) return "normal";
  return state === "line-comment" ? "normal" : state;
}

function skipCssTail(state, tail) {
  if (state === "comment" && tail.includes("*/")) return "normal";
  if (state === "single" && unescapedDelimiter(tail, "'")) return "normal";
  if (state === "double" && unescapedDelimiter(tail, "\"")) return "normal";
  return state;
}

function javascriptState(prefix) {
  let state = "normal";
  let blankLine = true;
  for (let at = 0; at < prefix.length;) {
    if (state === "normal") {
      let next = prefix.length;
      for (const marker of ["/", "`", "\"", "'"]) {
        const found = prefix.indexOf(marker, at);
        if (found >= 0 && found < next) next = found;
      }
      if (next > at) { at = next; continue; }
    }
    const end = lineEnd(prefix, at);
    if ((at === 0 || prefix[at - 1] === "\n") && end - at > STATE_LINE_LIMIT) {
      state = skipJavascriptTail(state, prefix.slice(at, end));
      at = end + (end < prefix.length ? 1 : 0);
      blankLine = false;
      continue;
    }
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

function javascriptScan(text, offset, initial = "normal", emit = true) {
  const tokens = emit ? [] : null;
  let state = initial;
  let blankLine = true;
  let at = 0;
  while (at < text.length) {
    if (!emit && state === "normal") {
      let next = text.length;
      for (const marker of ["/", "`", "\"", "'"]) {
        const found = text.indexOf(marker, at);
        if (found >= 0 && found < next) next = found;
      }
      if (next > at) { at = next; continue; }
    }
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
  return { tokens: tokens || [], state };
}

function javascriptTokens(text, offset, initial = "normal") {
  return javascriptScan(text, offset, initial).tokens;
}

function cssState(prefix) {
  let state = "normal";
  for (let at = 0; at < prefix.length;) {
    if (state === "normal") {
      let next = prefix.length;
      for (const marker of ["/", "\"", "'"]) {
        const found = prefix.indexOf(marker, at);
        if (found >= 0 && found < next) next = found;
      }
      if (next > at) { at = next; continue; }
    }
    const end = lineEnd(prefix, at);
    if ((at === 0 || prefix[at - 1] === "\n") && end - at > STATE_LINE_LIMIT) {
      state = skipCssTail(state, prefix.slice(at, end));
      at = end + (end < prefix.length ? 1 : 0);
      continue;
    }
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

function cssScan(text, offset, initial = "normal", emit = true) {
  const tokens = emit ? [] : null;
  let state = initial;
  let at = 0;
  while (at < text.length) {
    if (!emit && state === "normal") {
      let next = text.length;
      for (const marker of ["/", "\"", "'"]) {
        const found = text.indexOf(marker, at);
        if (found >= 0 && found < next) next = found;
      }
      if (next > at) { at = next; continue; }
    }
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
  return { tokens: tokens || [], state };
}

function cssTokens(text, offset, initial = "normal") {
  return cssScan(text, offset, initial).tokens;
}

function markdownFence(prefix) {
  let fence = null;
  let at = 0;
  while (at <= prefix.length) {
    const end = lineEnd(prefix, at);
    const source = prefix.slice(at, end);
    const line = source.length > STATE_LINE_LIMIT ? source.slice(0, STATE_LINE_LIMIT) : source;
    const match = /^\s*(```+|~~~+)\s*([\w-]*)/.exec(line);
    if (match && (!fence ||
        (match[1][0] === fence.marker && match[1].length >= fence.length))) {
      fence = fence ? null : {
        marker: match[1][0], length: match[1].length,
        language: match[2].toLowerCase(), inner: "normal",
      };
    } else if (fence && /^(js|javascript|ts|typescript)$/.test(fence.language)) {
      fence.inner = javascriptScan(line, 0, fence.inner, false).state;
    } else if (fence && fence.language === "css") {
      fence.inner = cssScan(line, 0, fence.inner, false).state;
    }
    if (end === prefix.length) break;
    at = end + 1;
  }
  return fence;
}

function markdownScan(text, offset, initialFence, emit = true) {
  const tokens = emit ? [] : null;
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
        const result = javascriptScan(line, offset + at, fence.inner, emit);
        if (tokens) tokens.push(...result.tokens);
        fence.inner = result.state;
      } else if (fence.language === "css") {
        const result = cssScan(line, offset + at, fence.inner, emit);
        if (tokens) tokens.push(...result.tokens);
        fence.inner = result.state;
      }
      else if (/^(html|xml)$/.test(fence.language) && tokens)
        tokens.push(...htmlTokens(line, offset + at));
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
  return { tokens: tokens || [], state: fence };
}

function markdownTokens(text, offset, initialFence) {
  return markdownScan(text, offset, initialFence).tokens;
}

function htmlState(prefix) {
  const latest = value => Math.max(prefix.lastIndexOf(value),
    prefix.lastIndexOf(value.toUpperCase()));
  const candidates = [
    { mode: "comment", open: prefix.lastIndexOf("<!--"), close: prefix.lastIndexOf("-->") },
    { mode: "javascript", open: latest("<script"), close: latest("</script") },
    { mode: "css", open: latest("<style"), close: latest("</style") },
  ].filter(candidate => candidate.open > candidate.close)
    .sort((left, right) => right.open - left.open);
  if (!candidates.length) return { mode: "normal", inner: "normal" };
  const current = candidates[0];
  if (current.mode === "comment") return { mode: "comment", inner: "normal" };
  const content = prefix.indexOf(">", current.open) + 1;
  const inner = (current.mode === "javascript" ? javascriptScan : cssScan)(
    prefix.slice(content), 0, "normal", false).state;
  return { mode: current.mode, inner };
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

function htmlScan(text, offset, initial = { mode: "normal", inner: "normal" }, emit = true) {
  const tokens = emit ? [] : null;
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
        text.slice(at, to), offset + at, state.inner, emit);
      if (tokens) tokens.push(...result.tokens);
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
  return { tokens: tokens || [], state };
}

function htmlTokens(text, offset, initial = { mode: "normal", inner: "normal" }) {
  return htmlScan(text, offset, initial).tokens;
}

function initialState(mode, prefix, text) {
  if (mode === "javascript") return javascriptInitial(prefix, text);
  if (mode === "css") return cssInitial(prefix, text);
  if (mode === "markdown") return markdownFence(prefix);
  return htmlInitial(prefix, text);
}

function scanMode(mode, text, offset, state, emit = true) {
  if (mode === "javascript") return javascriptScan(text, offset, state, emit);
  if (mode === "css") return cssScan(text, offset, state, emit);
  if (mode === "markdown") return markdownScan(text, offset, state, emit);
  return htmlScan(text, offset, state, emit);
}

function skipLongTail(mode, state, tail) {
  if (mode === "javascript") return skipJavascriptTail(state, tail);
  if (mode === "css") return skipCssTail(state, tail);
  if (mode === "markdown") {
    if (!state) return state;
    if (/^(js|javascript|ts|typescript)$/.test(state.language))
      state.inner = skipJavascriptTail(state.inner, tail);
    else if (state.language === "css") state.inner = skipCssTail(state.inner, tail);
    return state;
  }
  if (state.mode === "comment" && tail.includes("-->"))
    return { mode: "normal", inner: "normal" };
  if (state.mode === "javascript") {
    if (tail.toLowerCase().includes("</script")) return { mode: "normal", inner: "normal" };
    state.inner = skipJavascriptTail(state.inner, tail);
  } else if (state.mode === "css") {
    if (tail.toLowerCase().includes("</style")) return { mode: "normal", inner: "normal" };
    state.inner = skipCssTail(state.inner, tail);
  }
  return state;
}

function tokensFor(view, mode) {
  const doc = view.state.doc;
  const tokens = [];
  let parsedChars = 0;
  let stateChars = 0;
  let skippedHighlightChars = 0;
  for (const visible of view.visibleRanges) {
    const firstLine = doc.lineAt(visible.from);
    const lastLine = doc.lineAt(visible.to);
    // This prefix is a disposable state-recovery input. It is rescanned from
    // the top after the throttle and is never retained as tokens or a tree.
    const prefix = doc.sliceString(0, firstLine.from);
    const firstText = doc.sliceString(firstLine.from,
      Math.min(firstLine.to, firstLine.from + HIGHLIGHT_LINE_LIMIT));
    let state = initialState(mode, prefix, firstText);
    stateChars += prefix.length;
    for (let number = firstLine.number; number <= lastLine.number; number++) {
      const line = doc.line(number);
      const length = Math.min(line.length, HIGHLIGHT_LINE_LIMIT);
      const text = doc.sliceString(line.from, line.from + length);
      const result = scanMode(mode, text, line.from, state);
      tokens.push(...result.tokens);
      state = result.state;
      parsedChars += text.length;
      if (line.length > length) {
        const tail = doc.sliceString(line.from + length, line.to);
        state = skipLongTail(mode, state, tail);
        skippedHighlightChars += tail.length;
      }
    }
  }
  tokens.sort((left, right) => left.from - right.from || left.to - right.to);
  return { tokens, parsedChars, stateChars, skippedHighlightChars };
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
      this.decorations = Decoration.none;
      this.scrollPending = false;
      this.refreshPending = false;
      this.refreshTimer = 0;
      this.onScroll = () => {
        if (this.scrollPending) return;
        this.scrollPending = true;
        requestAnimationFrame(() => {
          this.scrollPending = false;
          this.clearAndSchedule();
        });
      };
      view.scrollDOM.addEventListener("scroll", this.onScroll);
      this.schedule();
    }
    update(update) {
      if (this.refreshPending) {
        this.refreshPending = false;
        this.refresh(update.view);
      } else if (update.docChanged || update.viewportChanged) {
        // Decorations are a disposable observation of one viewport, not
        // syntax state that follows the document. Drop them as soon as either
        // the document or shown range changes, then rebuild after activity
        // pauses.
        this.decorations = Decoration.none;
        this.schedule();
      }
    }
    clearAndSchedule() {
      this.schedule();
    }
    schedule() {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = 0;
        this.refreshPending = true;
        this.view.dispatch({
          selection: { anchor: this.view.state.selection.main.head },
        });
      }, REFRESH_DELAY);
    }
    destroy() {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
    }
    refresh(view) {
      const start = performance.now();
      const result = tokensFor(view, mode);
      this.decorations = decorationsFor(result.tokens);
      report({ mode, documentLines: view.state.doc.lines,
        visibleRanges: view.visibleRanges.length, retainedTokens: result.tokens.length,
        parsedChars: result.parsedChars, stateChars: result.stateChars,
        skippedHighlightChars: result.skippedHighlightChars,
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

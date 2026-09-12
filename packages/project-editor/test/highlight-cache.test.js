import assert from "node:assert/strict";
import test from "node:test";
import { HighlightStyle, highlightingFor, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Tag, tags } from "@lezer/highlight";
import { cacheHighlightStyle } from "../src/highlight-cache.js";

const specs = [
  { tag: tags.name, class: "name" },
  { tag: [tags.keyword, tags.operatorKeyword], class: "keyword" },
  { tag: tags.variableName, class: "variable" },
  { tag: tags.definition(tags.variableName), class: "definition" },
  { tag: tags.function(tags.variableName), class: "function" },
  { tag: tags.string, class: "string" },
];

test("cached palette preserves tag specificity, ordering, duplicates, and misses", () => {
  const palette = HighlightStyle.define(specs), native = palette.style;
  let calls = 0;
  palette.style = value => { calls++; return native(value); };
  assert.equal(cacheHighlightStyle(palette), palette);
  const vocabulary = Object.values(tags).filter(tag => tag instanceof Tag);
  vocabulary.push(Tag.define(), Tag.define(tags.variableName),
    tags.definition(tags.function(tags.variableName)), tags.function(tags.definition(tags.variableName)));
  const groups = [[], ...vocabulary.map(tag => [tag])];
  for (let index = 0; index < vocabulary.length; index++) {
    groups.push([vocabulary[index], tags.keyword, vocabulary[index], tags.string]);
  }
  for (const group of groups) assert.equal(palette.style(group), native(group));
  const firstPass = calls;
  for (const group of groups.reverse()) assert.equal(palette.style(group), native(group));
  assert.equal(calls, firstPass, "including null results: repeated tags need no palette resolution");
  const mutable = [tags.keyword];
  assert.equal(palette.style(mutable), "keyword");
  mutable[0] = tags.string;
  assert.equal(palette.style(mutable), "string", "do not cache mutable input groups");
});

test("changing a tag's exposed ancestry invalidates only its cached choice", () => {
  const palette = HighlightStyle.define(specs), native = palette.style;
  cacheHighlightStyle(palette);
  const tag = Tag.define();
  assert.equal(palette.style([tag]), null);
  tag.set.push(tags.keyword);
  assert.equal(palette.style([tag]), native([tag]));
  assert.equal(palette.style([tag]), "keyword");
  tag.set[1] = tags.string;
  assert.equal(palette.style([tag]), "string");
  tag.set = [tag, tags.variableName];
  assert.equal(palette.style([tag]), "variable");
  tag.set.length = 1;
  assert.equal(palette.style([tag]), null);
});

test("all styles remain native, and separate palettes never share class choices", () => {
  const all = HighlightStyle.define(specs, { all: "base" }), native = all.style;
  cacheHighlightStyle(all);
  assert.equal(all.style, native);
  assert.equal(all.style([]), "base");
  assert.equal(all.style([tags.keyword, tags.string]), "base keyword string");
  const first = cacheHighlightStyle(HighlightStyle.define([{ tag: tags.keyword, class: "first" }]));
  const second = cacheHighlightStyle(HighlightStyle.define([{ tag: tags.keyword, class: "second" }]));
  assert.equal(first.style([tags.keyword]), "first");
  assert.equal(second.style([tags.keyword]), "second");
  for (const palette of [first, second, first]) {
    const state = EditorState.create({ extensions: syntaxHighlighting(palette) });
    assert.equal(highlightingFor(state, [tags.keyword]), palette.style([tags.keyword]));
  }
});

test("theme-selected palettes keep their original modules and switch repeatedly", () => {
  const dark = HighlightStyle.define([{ tag: tags.keyword, color: "var(--dark-keyword)" }], { themeType: "dark" });
  const light = HighlightStyle.define([{ tag: tags.keyword, color: "var(--light-keyword)" }], { themeType: "light" });
  const darkModule = dark.module, lightModule = light.module;
  const darkClass = dark.style([tags.keyword]), lightClass = light.style([tags.keyword]);
  cacheHighlightStyle(dark); cacheHighlightStyle(light);
  assert.equal(dark.module, darkModule);
  assert.equal(light.module, lightModule);
  const theme = new Compartment();
  let state = EditorState.create({ extensions: [theme.of(EditorView.darkTheme.of(false)),
    syntaxHighlighting(dark), syntaxHighlighting(light)] });
  for (const isDark of [false, true, false, true, false]) {
    state = state.update({ effects: theme.reconfigure(EditorView.darkTheme.of(isDark)) }).state;
    assert.equal(highlightingFor(state, [tags.keyword]), isDark ? darkClass : lightClass);
  }
});

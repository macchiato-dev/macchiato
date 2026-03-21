import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProseParser } from '@macchiato-dev/content-parse-tiny';
import { LayoutRenderer } from '@macchiato-dev/layout-render-small';
import { VDocument } from '@macchiato-dev/dom-tiny';
import { renderDocument } from '@macchiato-dev/render-html';
import { ProseRenderer } from './index.js';

function build(md, { titleTemplate } = {}) {
  const document = new VDocument();
  const parser = new ProseParser(md);
  parser.parse();
  const layout = new LayoutRenderer({ document });
  if (titleTemplate !== undefined) {
    layout.setTitleTemplate(titleTemplate);
  }
  const prose = new ProseRenderer({ document, layout });
  prose.render(parser.output);
  return document;
}

test('renders h1 as title and heading element', () => {
  const document = build('# Hello World');
  assert.equal(document.title, 'Hello World');
  assert.ok(renderDocument(document).includes('<h1>Hello World</h1>'));
});

test('second h1 overrides the title', () => {
  const document = build('# First\n\n# Second');
  assert.equal(document.title, 'Second');
});

test('title template interpolates page title', () => {
  const document = build('# My Page', { titleTemplate: 'My Site | {title}' });
  assert.equal(document.title, 'My Site | My Page');
});

test('renders paragraph', () => {
  const document = build('A paragraph.');
  assert.ok(renderDocument(document).includes('<p>A paragraph.</p>'));
});

test('renders h2 through h6', () => {
  for (let level = 2; level <= 6; level++) {
    const document = build(`${'#'.repeat(level)} Heading`);
    assert.ok(renderDocument(document).includes(`<h${level}>Heading</h${level}>`));
  }
});

test('h7 renders as p with data-heading-level', () => {
  const document = build('####### Extended');
  const html = renderDocument(document);
  assert.ok(html.includes('data-heading-level="7"'));
  assert.ok(html.includes('Extended'));
});

test('renders italic with *asterisks*', () => {
  const document = build('Hello *world*.');
  assert.ok(renderDocument(document).includes('<em>world</em>'));
});

test('renders italic with _underscores_', () => {
  const document = build('Hello _world_.');
  assert.ok(renderDocument(document).includes('<em>world</em>'));
});

test('renders bold with **asterisks**', () => {
  const document = build('Hello **world**.');
  assert.ok(renderDocument(document).includes('<strong>world</strong>'));
});

test('renders bold with __underscores__', () => {
  const document = build('Hello __world__.');
  assert.ok(renderDocument(document).includes('<strong>world</strong>'));
});

test('renders bold inside italic', () => {
  const document = build('*italic **bold** italic*');
  const html = renderDocument(document);
  assert.ok(html.includes('<em>italic <strong>bold</strong> italic</em>'));
});

test('renders italic inside bold', () => {
  const document = build('**bold *italic* bold**');
  const html = renderDocument(document);
  assert.ok(html.includes('<strong>bold <em>italic</em> bold</strong>'));
});

test('plain text is preserved alongside inline markup', () => {
  const document = build('before *em* between **strong** after');
  const html = renderDocument(document);
  assert.ok(html.includes('before '));
  assert.ok(html.includes(' between '));
  assert.ok(html.includes(' after'));
});

test('inline markup in heading', () => {
  const document = build('# Hello **world**');
  assert.ok(renderDocument(document).includes('<h1>Hello <strong>world</strong></h1>'));
});

test('throws when italic span is not closed', () => {
  assert.throws(() => build('*unclosed'), /unclosed em/i);
});

test('throws when bold span is not closed', () => {
  assert.throws(() => build('**unclosed'), /unclosed strong/i);
});

test('throws on unmatched * — no CommonMark leniency', () => {
  assert.throws(() => build('Hello* world\n\ntest'), /unclosed em/i);
});

test('throws on unmatched _ — no CommonMark leniency', () => {
  assert.throws(() => build('snake_case'), /unclosed em/i);
});

test('escaped * renders as literal asterisk', () => {
  const document = build('price: \\*');
  assert.ok(renderDocument(document).includes('price: *'));
});

test('escaped _ renders as literal underscore', () => {
  const document = build('snake\\_case');
  assert.ok(renderDocument(document).includes('snake_case'));
});

test('escaped ** renders as two literal asterisks', () => {
  const document = build('\\*\\* not bold');
  assert.ok(renderDocument(document).includes('** not bold'));
});

test('throws on disallowed characters', () => {
  assert.throws(() => build('\u200B sneaky'));
});

test('throws when block count exceeds limit', () => {
  const manyBlocks = Array.from({ length: 129 }, (_, i) => `Para ${i}`).join('\n\n');
  assert.throws(() => build(manyBlocks));
});

test('throws when word exceeds codepoint limit', () => {
  const longWord = 'a'.repeat(65);
  assert.throws(() => build(longWord));
});

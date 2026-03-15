import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProseParser } from '@macchiato-dev/parse-prose';
import { LayoutRenderer } from '@macchiato-dev/render-layout';
import { VDocument } from '@macchiato-dev/build-static';
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
  assert.ok(document.toHTML().includes('<h1>Hello World</h1>'));
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
  assert.ok(document.toHTML().includes('<p>A paragraph.</p>'));
});

test('renders h2 through h6', () => {
  for (let level = 2; level <= 6; level++) {
    const document = build(`${'#'.repeat(level)} Heading`);
    assert.ok(document.toHTML().includes(`<h${level}>Heading</h${level}>`));
  }
});

test('h7 renders as p with data-heading-level', () => {
  const document = build('####### Extended');
  const html = document.toHTML();
  assert.ok(html.includes('data-heading-level="7"'));
  assert.ok(html.includes('Extended'));
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

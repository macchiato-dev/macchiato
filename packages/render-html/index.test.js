import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VText, VElement, VDocument } from '@macchiato-dev/dom-tiny';
import { renderElement, renderDocument } from './index.js';

test('renders a text node with HTML escaping', () => {
  const doc = new VDocument();
  const el = doc.createElement('p');
  el.appendChild(doc.createTextNode('a & b < c > d'));
  assert.equal(renderElement(el), '<p>a &amp; b &lt; c &gt; d</p>');
});

test('renders an element with no attributes and no children', () => {
  const el = new VElement('br');
  assert.equal(renderElement(el), '<br></br>');
});

test('renders an element with attributes', () => {
  const el = new VElement('a');
  el.setAttribute('href', '/page');
  el.setAttribute('class', 'link');
  assert.equal(renderElement(el), '<a href="/page" class="link"></a>');
});

test('escapes attribute values', () => {
  const el = new VElement('input');
  el.setAttribute('value', '"hello" & <world>');
  assert.ok(renderElement(el).includes('&quot;hello&quot; &amp; &lt;world&gt;'));
});

test('renders nested elements', () => {
  const doc = new VDocument();
  const ul = doc.createElement('ul');
  const li1 = doc.createElement('li');
  li1.appendChild(doc.createTextNode('one'));
  const li2 = doc.createElement('li');
  li2.appendChild(doc.createTextNode('two'));
  ul.appendChild(li1);
  ul.appendChild(li2);
  assert.equal(renderElement(ul), '<ul><li>one</li><li>two</li></ul>');
});

test('renders element in text mode using ownTextContent', () => {
  const el = new VElement('code');
  el.textContent = 'a & b';
  assert.equal(renderElement(el), '<code>a &amp; b</code>');
});

test('text mode content is escaped', () => {
  const el = new VElement('pre');
  el.textContent = '<script>alert(1)</script>';
  assert.equal(renderElement(el), '<pre>&lt;script&gt;alert(1)&lt;/script&gt;</pre>');
});

test('renderDocument includes DOCTYPE and html wrapper', () => {
  const doc = new VDocument();
  const html = renderDocument(doc);
  assert.ok(html.startsWith('<!DOCTYPE html>\n'));
  assert.ok(html.includes('<html>'));
  assert.ok(html.endsWith('</html>\n'));
});

test('renderDocument includes head and body', () => {
  const doc = new VDocument();
  const html = renderDocument(doc);
  assert.ok(html.includes('<head>'));
  assert.ok(html.includes('</head>'));
  assert.ok(html.includes('<body>'));
  assert.ok(html.includes('</body>'));
});

test('renderDocument includes title set via document.title', () => {
  const doc = new VDocument();
  doc.title = 'My Page';
  assert.ok(renderDocument(doc).includes('<title>My Page</title>'));
});

test('renderDocument includes content appended to body', () => {
  const doc = new VDocument();
  const p = doc.createElement('p');
  p.appendChild(doc.createTextNode('Hello'));
  doc.body.appendChild(p);
  assert.ok(renderDocument(doc).includes('<p>Hello</p>'));
});

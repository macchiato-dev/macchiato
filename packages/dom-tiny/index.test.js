import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VText, VElement, VDocument } from './index.js';

test('VText textContent returns the string', () => {
  const t = new VText('hello');
  assert.equal(t.textContent, 'hello');
});

test('VText coerces value to string', () => {
  const t = new VText(42);
  assert.equal(t.textContent, '42');
});

test('VElement tagName', () => {
  const el = new VElement('div');
  assert.equal(el.tagName, 'div');
});

test('VElement setAttribute stores attribute', () => {
  const el = new VElement('a');
  el.setAttribute('href', '/foo');
  assert.equal(el.attributes.get('href'), '/foo');
});

test('VElement setAttribute coerces value to string', () => {
  const el = new VElement('input');
  el.setAttribute('tabindex', 0);
  assert.equal(el.attributes.get('tabindex'), '0');
});

test('VElement appendChild adds to childNodes', () => {
  const el = new VElement('ul');
  const li = new VElement('li');
  el.appendChild(li);
  assert.equal(el.childNodes.length, 1);
  assert.equal(el.childNodes[0], li);
});

test('VElement appendChild returns the child', () => {
  const el = new VElement('div');
  const child = new VElement('span');
  assert.equal(el.appendChild(child), child);
});

test('VElement replaceChildren replaces all children', () => {
  const el = new VElement('div');
  el.appendChild(new VElement('span'));
  el.appendChild(new VElement('em'));
  const p = new VElement('p');
  el.replaceChildren(p);
  assert.equal(el.childNodes.length, 1);
  assert.equal(el.childNodes[0], p);
});

test('VElement replaceChildren with no args clears children', () => {
  const el = new VElement('div');
  el.appendChild(new VElement('span'));
  el.replaceChildren();
  assert.equal(el.childNodes.length, 0);
});

test('VElement textContent getter joins children', () => {
  const el = new VElement('p');
  el.appendChild(new VText('hello '));
  el.appendChild(new VText('world'));
  assert.equal(el.textContent, 'hello world');
});

test('VElement textContent setter switches to text mode', () => {
  const el = new VElement('p');
  el.appendChild(new VElement('span'));
  el.textContent = 'plain';
  assert.equal(el.textContent, 'plain');
  assert.equal(el.childNodes.length, 0);
  assert.equal(el.ownTextContent, 'plain');
});

test('VElement ownTextContent is null in children mode', () => {
  const el = new VElement('div');
  el.appendChild(new VText('hi'));
  assert.equal(el.ownTextContent, null);
});

test('VElement appendChild after textContent setter clears text mode', () => {
  const el = new VElement('div');
  el.textContent = 'old';
  el.appendChild(new VText('new'));
  assert.equal(el.ownTextContent, null);
  assert.equal(el.textContent, 'new');
});

test('VDocument createElement returns VElement', () => {
  const doc = new VDocument();
  const el = doc.createElement('section');
  assert.ok(el instanceof VElement);
  assert.equal(el.tagName, 'section');
});

test('VDocument createTextNode returns VText', () => {
  const doc = new VDocument();
  const t = doc.createTextNode('hi');
  assert.ok(t instanceof VText);
  assert.equal(t.textContent, 'hi');
});

test('VDocument head and body are VElements', () => {
  const doc = new VDocument();
  assert.ok(doc.head instanceof VElement);
  assert.ok(doc.body instanceof VElement);
  assert.equal(doc.head.tagName, 'head');
  assert.equal(doc.body.tagName, 'body');
});

test('VDocument title getter and setter', () => {
  const doc = new VDocument();
  doc.title = 'My Page';
  assert.equal(doc.title, 'My Page');
});

test('VDocument head already contains title element', () => {
  const doc = new VDocument();
  assert.ok(doc.head.childNodes.some(n => n instanceof VElement && n.tagName === 'title'));
});

test('VDocument title setter updates the title element textContent', () => {
  const doc = new VDocument();
  doc.title = 'First';
  doc.title = 'Second';
  assert.equal(doc.title, 'Second');
  const titleEl = doc.head.childNodes.find(n => n instanceof VElement && n.tagName === 'title');
  assert.equal(titleEl.textContent, 'Second');
});

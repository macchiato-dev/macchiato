import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { findChildInMutationBatch, optimizeMutationScans } from '../codemirror-mutation-scan.js';

function original(tile, dom, dir) {
  while (dom) {
    const candidate = dom.cmTile;
    if (candidate && candidate.parent === tile) return candidate;
    const parent = dom.parentNode;
    dom = parent !== tile.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
  }
  return null;
}
function siblings(count, parentNode) {
  const nodes = Array.from({ length: count }, () => ({ parentNode }));
  nodes.forEach((node, index) => {
    node.previousSibling = nodes[index - 1] || null;
    node.nextSibling = nodes[index + 1] || null;
  });
  return nodes;
}

test('mutation scan matches original traversal across parents and directions', () => {
  const root = { parentNode: null };
  const container = { dom: root };
  const nodes = siblings(40, root);
  const nested = { dom: nodes[12] };
  const children = siblings(12, nested.dom);
  for (let index = 0; index < nodes.length; index += 9) nodes[index].cmTile = { parent: container };
  children[3].cmTile = { parent: nested };
  const cache = new Map();
  for (const tile of [container, nested]) {
    for (const direction of [-1, 1]) {
      for (const node of [...nodes, ...children, null]) {
        assert.equal(findChildInMutationBatch(tile, node, direction, cache, node => node.cmTile),
          original(tile, node, direction));
      }
    }
  }
  // A later scan must see a changed tile mapping, not reuse the old batch.
  nodes[20].cmTile = { parent: container };
  assert.equal(findChildInMutationBatch(container, nodes[21], -1, new Map(), node => node.cmTile),
    nodes[20].cmTile);
});

test('long unrendered sibling runs require linear tile lookups', () => {
  const root = { parentNode: null }, tile = { dom: root };
  const nodes = siblings(2000, root);
  nodes[0].cmTile = { parent: tile };
  const cache = new Map();
  let reads = 0;
  const getTile = node => { reads++; return node.cmTile; };
  for (const dir of [-1, 1]) for (const node of nodes) {
    assert.equal(findChildInMutationBatch(tile, node, dir, cache, getTile), original(tile, node, dir));
  }
  assert.ok(reads <= nodes.length * 2, `${reads} lookups for ${nodes.length} siblings`);
});

test('the build adaptation matches the installed source and rejects incompatible changes', async () => {
  const source = await readFile(new URL(import.meta.resolve('@codemirror/view')), 'utf8');
  const adapted = optimizeMutationScans(source);
  assert.match(adapted, /records\.length > 128 \? new Map\(\) : null/);
  assert.match(adapted, /readMutation\(record, childScanCache\)/);
  assert.match(adapted, /findChildInMutationBatch\(tile, dom, dir, cache, Tile.get\)/);
  assert.throws(() => optimizeMutationScans(source.replace('readMutation(rec) {', 'readMutation(record) {')),
    /Review CodeMirror/);
  assert.throws(() => optimizeMutationScans(adapted), /Review CodeMirror/);
});

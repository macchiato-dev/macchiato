/*
 * Adapted from CodeMirror view 6.43.9, src/domobserver.ts.
 * Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
// This build-only adaptation keeps the original small-batch path. Repeated
// searches through newly inserted, unrendered siblings can otherwise become
// quadratic in a large native mutation batch, particularly in an interpreter.

export function findChildInMutationBatch(tile, dom, dir, cache, getTile) {
  let sides = cache.get(tile);
  if (!sides) cache.set(tile, sides = [new Map(), new Map()]);
  const results = sides[dir > 0 ? 1 : 0];
  const path = [];
  let found = null;
  while (dom) {
    const known = results.get(dom);
    if (known !== undefined) { found = known; break; }
    path.push(dom);
    const candidate = getTile(dom);
    if (candidate && candidate.parent === tile) { found = candidate; break; }
    const parent = dom.parentNode;
    dom = parent !== tile.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
  }
  for (const node of path) results.set(node, found);
  return found;
}

const originalFindChild = `function findChild(tile, dom, dir) {
    while (dom) {
        let curTile = Tile.get(dom);
        if (curTile && curTile.parent == tile)
            return curTile;
        let parent = dom.parentNode;
        dom = parent != tile.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
    }
    return null;
}`;

export function optimizeMutationScans(source) {
  // Fail closed when upstream changes these internals. Never silently patch
  // a different method or assume that its record scan is still read-only.
  function replace(before, after) {
    if (source.split(before).length !== 2) {
      throw new Error('Review CodeMirror mutation-scan adaptation: ' + before.split('\n')[0]);
    }
    source = source.replace(before, after);
  }
  replace('let records = this.pendingRecords();', `let records = this.pendingRecords();
        // Only this synchronous scan owns the cache. No reuse across batches.
        const childScanCache = records.length > 128 ? new Map() : null;`);
  replace('this.readMutation(record)', 'this.readMutation(record, childScanCache)');
  replace('readMutation(rec) {', 'readMutation(rec, childScanCache) {');
  for (const [sibling, direction] of [['previousSibling', -1], ['nextSibling', 1]]) {
    replace(`findChild(tile, rec.${sibling} || rec.target.${sibling}, ${direction})`,
      `findChild(tile, rec.${sibling} || rec.target.${sibling}, ${direction}, childScanCache)`);
  }
  replace(originalFindChild, findChildInMutationBatch.toString() + '\n' +
    originalFindChild.replace('function findChild(tile, dom, dir) {',
      `function findChild(tile, dom, dir, cache) {
    if (cache) return findChildInMutationBatch(tile, dom, dir, cache, Tile.get);`));
  return source;
}

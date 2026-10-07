import test from "node:test";
import assert from "node:assert/strict";
import { assignTiles, isFree, positions, removalOrder } from "../../../examples/mahjong/game-model.js";

test("Mahjong's shuffled model preserves the 144-position turtle and a complete playthrough", () => {
  assert.equal(positions().length, 144);
  assert.deepEqual(positions().at(-1), { x: 6.5, y: 3.5, z: 4 });
  let seed = 17;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 2 ** 32);
  let previous;
  for (let game = 0; game < 20; game++) {
    const tiles = assignTiles(random);
    assert.equal(tiles.length, 144);
    const identities = tiles.map(tile => tile.type).join(",");
    assert.notEqual(identities, previous, "a new game changes tile identities");
    previous = identities;
    assert.equal(isFree(tiles, 143), true, "the top tile is available");
    for (const [first, second] of removalOrder) {
      assert.equal(isFree(tiles, first), true);
      assert.equal(isFree(tiles, second), true);
      assert.equal(tiles[first].match, tiles[second].match);
      tiles[first].removed = tiles[second].removed = true;
      assert.equal(isFree(tiles, first), false);
    }
    assert.ok(tiles.every(tile => tile.removed));
  }
});

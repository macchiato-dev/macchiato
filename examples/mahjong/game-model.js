var names = {
  E: "East wind", S: "South wind", W: "West wind", N: "North wind",
  R: "Red dragon", G: "Green dragon", H: "White dragon"
};
var regular = [];
["m", "p", "s"].forEach(function (suit) {
  for (var number = 1; number <= 9; number++) regular.push(suit + number);
});
regular = regular.concat(["E", "S", "W", "N", "R", "H", "G"]);

var solution = [
  [131,57],[126,92],[135,11],[58,99],[143,74],[12,44],[117,10],
  [139,91],[86,141],[134,67],[110,125],[111,56],[0,59],[93,105],
  [85,124],[9,127],[84,140],[122,109],[138,1],[30,2],[29,116],
  [106,73],[3,137],[98,31],[83,20],[115,123],[97,118],[90,132],
  [89,96],[19,136],[104,121],[18,120],[68,130],[114,129],[8,94],
  [72,112],[17,71],[103,45],[46,82],[88,113],[32,119],[128,81],
  [102,4],[47,7],[100,6],[28,55],[80,60],[27,5],[48,95],[61,101],
  [26,54],[69,79],[21,43],[107,87],[49,22],[62,16],[15,33],
  [78,13],[142,14],[63,133],[53,70],[108,25],[50,34],[64,77],
  [24,51],[65,35],[36,76],[66,52],[23,75],[42,37],[38,41],[39,40]
];

function positions() {
  var result = [];
  function layer(z, width, height, x, y) {
    for (var row = 0; row < height; row++) {
      for (var column = 0; column < width; column++) {
        result.push({ x: x + column, y: y + row, z: z });
      }
    }
  }
  var rows = [[12,1],[8,3],[10,2],[14,0],[13,.5],[10,2],[8,3],[12,1]];
  rows.forEach(function (row, y) { layer(0, row[0], 1, row[1], y); });
  layer(1, 6, 6, 4, 1);
  layer(2, 4, 4, 5, 2);
  layer(3, 2, 2, 6, 3);
  result.push({ x: 6.5, y: 3.5, z: 4 });
  return result;
}

function shuffle(values) {
  for (var index = values.length - 1; index > 0; index--) {
    var other = Math.floor(Math.random() * (index + 1));
    var value = values[index]; values[index] = values[other]; values[other] = value;
  }
  return values;
}

function assignTiles() {
  var places = positions();
  var types = [];
  regular.forEach(function (type) { types.push(type, type); });
  for (var bonus = 0; bonus < 8; bonus++) types.push("f" + bonus);
  shuffle(types);
  var assigned = new Array(places.length);
  solution.forEach(function (pair) {
    var type = types.pop();
    var match = type[0] === "f" ? (+type.slice(1) < 4 ? "flowers" : "seasons") : type;
    pair.forEach(function (index) {
      assigned[index] = {
        x: places[index].x, y: places[index].y, z: places[index].z,
        type: type, match: match, removed: false
      };
    });
  });
  return assigned;
}

function overlaps(first, second) {
  return Math.abs(first.x - second.x) < 1 && Math.abs(first.y - second.y) < 1;
}

function free(index) {
  var tile = tiles[index], left = false, right = false;
  if (tile.removed) return false;
  for (var other = 0; other < tiles.length; other++) {
    var candidate = tiles[other];
    if (candidate.removed || other === index) continue;
    if (candidate.z > tile.z && overlaps(tile, candidate)) return false;
    if (candidate.z === tile.z && Math.abs(candidate.y - tile.y) < .5) {
      if (candidate.x < tile.x && tile.x - candidate.x <= 1) left = true;
      if (candidate.x > tile.x && candidate.x - tile.x <= 1) right = true;
    }
  }
  return !left || !right;
}

function tileName(type) {
  if (type[0] === "f") return +type.slice(1) < 4 ? "Flower" : "Season";
  return names[type] || type[1] + " " + ({ m: "characters", p: "dots", s: "bamboo" })[type[0]];
}

function spriteCell(type) {
  if (type[0] === "m") return [+type[1] - 1, 0];
  if (type[0] === "p") return [+type[1] - 1, 1];
  if (type[0] === "s") return [+type[1] - 1, 2];
  return [{ E: 0, S: 1, W: 2, N: 3, R: 4, H: 5, G: 6 }[type], 3];
}

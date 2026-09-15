// Catalogue data only. Every transformation is implemented in its .md source.
export const transforms = [{
  id: "01-list-to-json",
  title: "Hierarchical list to JSON",
  dependencies: [{ name: "n", path: "numbers/02-json-number" }],
  input:
    "- {}\n  - name Ben\n  - location {}\n    - city Phoenix\n    - state AZ",
  expected:
    '```json\n{"name":"Ben","location":{"city":"Phoenix","state":"AZ"}}\n```\n',
}, {
  id: "02-json-to-list",
  title: "JSON to hierarchical list",
  dependencies: [{ name: "n", path: "numbers/02-json-number" }],
  input:
    '```json\n{"name":"Ben","location":{"city":"Phoenix","state":"AZ"}}\n```\n',
  expected:
    '- {}\n  - "name" "Ben"\n  - "location" {}\n    - "city" "Phoenix"\n    - "state" "AZ"\n',
}, {
  id: "03-mad-libs",
  title: "Mad libs",
  input:
    "My [pet] went to the [place] [time]!\n\n- pet: dog\n- place: park\n- time: yesterday",
  expected: "My dog went to the park yesterday!",
}, {
  id: "04-csv-to-table",
  title: "CSV to Markdown table",
  input:
    '```csv\nname,city,note\nBen,Phoenix,"hello, world"\nAda,London,"said ""hi"""\n```\n',
  expected:
    '| name | city | note |\n| --- | --- | --- |\n| Ben | Phoenix | hello,&#32;world |\n| Ada | London | said&#32;"hi" |\n',
}, {
  id: "05-table-to-csv",
  title: "Markdown table to CSV",
  input:
    '| name | note |\n| --- | --- |\n| Ben | hello,&#32;world |\n| Ada | said "hi" |',
  expected:
    '```csv\n"name","note"\n"Ben","hello, world"\n"Ada","said ""hi"""\n```\n',
}, {
  id: "06-tsv-to-table",
  title: "TSV to Markdown table",
  dependencies: [{ name: "d", path: "transforms/04-csv-to-table" }],
  input: "```tsv\nname\tcity\nBen\tPhoenix\nAda\tLondon\n```\n",
  expected:
    "| name | city |\n| --- | --- |\n| Ben | Phoenix |\n| Ada | London |\n",
}, {
  id: "07-table-to-tsv",
  title: "Markdown table to TSV",
  dependencies: [{ name: "d", path: "transforms/05-table-to-csv" }],
  input: "| name | city |\n| --- | --- |\n| Ben | Phoenix |\n| Ada | London |",
  expected: "```tsv\nname\tcity\nBen\tPhoenix\nAda\tLondon\n```\n",
}, {
  id: "12-json-pretty",
  title: "Pretty-print JSON",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
  ],
  input:
    '```json\n{"name":"Ben","tags":["wasm","Markdown"],"settings":{}}\n```\n',
  expected:
    '```json\n{\n  "name": "Ben",\n  "tags": [\n    "wasm",\n    "Markdown"\n  ],\n  "settings": {}\n}\n```\n',
}, {
  id: "13-json-compact",
  title: "Compact JSON",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
  ],
  input:
    '```json\n{\n  "name": "Ben",\n  "numbers": [ -0, 1.2300E+40 ],\n  "text": "keep  these spaces"\n}\n```\n',
  expected:
    '```json\n{"name":"Ben","numbers":[-0,1.2300E+40],"text":"keep  these spaces"}\n```\n',
}, {
  id: "14-json-lines-to-array",
  title: "JSON Lines to JSON array",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
  ],
  input:
    '```jsonl\n{"name":"Ben","city":"Phoenix"}\n{"name":"Ada","city":"London"}\nnull\n```\n',
  expected:
    '```json\n[{"name":"Ben","city":"Phoenix"},{"name":"Ada","city":"London"},null]\n```\n',
}, {
  id: "15-array-to-json-lines",
  title: "JSON array to JSON Lines",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
    { name: "j", path: "transforms/14-json-lines-to-array" },
  ],
  input:
    '```json\n[\n  {"name":"Ben","tags":["wasm","Markdown"]},\n  [1,2],\n  "comma, inside a string",\n  null\n]\n```\n',
  expected:
    '```jsonl\n{"name":"Ben","tags":["wasm","Markdown"]}\n[1,2]\n"comma, inside a string"\nnull\n```\n',
}];

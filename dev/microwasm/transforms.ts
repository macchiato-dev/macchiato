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
  id: "08-json-objects-to-table",
  title: "JSON objects to a table with a header union",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    '```json\n[{"name":"Ben","score":12.50},{"name":"Ada","active":true},{}]\n```\n',
  expected:
    '| "name" | "score" | "active" |\n| --- | --- | --- |\n| "Ben" | 12.50 |  |\n| "Ada" |  | true |\n|  |  |  |\n',
}, {
  id: "09-table-to-json-objects",
  title: "Typed Markdown table to JSON objects",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "d", path: "transforms/11-table-to-json-rows" },
  ],
  input:
    '| "name" | "score" | "active" |\n| --- | --- | --- |\n| "Ben" | 12.50 |  |\n| "Ada" |  | true |\n|  |  |  |\n',
  expected:
    '```json\n[{"name":"Ben","score":12.50},{"name":"Ada","active":true},{}]\n```\n',
}, {
  id: "10-json-rows-to-table",
  title: "JSON rows to Markdown table",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
  ],
  input:
    '```json\n[\n  ["name","score","metadata"],\n  ["Ben",12.50,{"active":true}],\n  ["Ada",null,["wasm","Markdown"]]\n]\n```\n',
  expected:
    '| "name" | "score" | "metadata" |\n| --- | --- | --- |\n| "Ben" | 12.50 | {"active":true} |\n| "Ada" | null | &#91;"wasm","Markdown"&#93; |\n',
}, {
  id: "11-table-to-json-rows",
  title: "Typed Markdown table to JSON rows",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
  ],
  input:
    '| "name" | "score" | "metadata" |\n| --- | --- | --- |\n| "Ben" | 12.50 | {"active":true} |\n| "Ada" | null | &#91;"wasm","Markdown"&#93; |\n',
  expected:
    '```json\n[["name","score","metadata"],["Ben",12.50,{"active":true}],["Ada",null,["wasm","Markdown"]]]\n```\n',
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
}, {
  id: "16-list-to-yaml",
  title: "Hierarchical Markdown data to YAML",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "l", path: "transforms/01-list-to-json" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    "- {}\n  - name Ben\n  - active = true\n  - location {}\n    - city Phoenix\n  - tags []\n    - wasm\n    - yaml\n  - empty {}",
  expected:
    '```yaml\n"name": "Ben"\n"active": true\n"location":\n  "city": "Phoenix"\n"tags":\n  - "wasm"\n  - "yaml"\n"empty": {}\n```\n',
}, {
  id: "17-yaml-to-list",
  title: "Block YAML to hierarchical Markdown data",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "p", path: "transforms/02-json-to-list" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "s", path: "transforms/00-yaml-scalars" },
  ],
  input:
    "```yaml\nname: Ben\nactive: true\nlocation:\n  city: Phoenix\ntags:\n  - wasm\n  - yaml\nempty: {}\n```\n",
  expected:
    '- {}\n  - "name" "Ben"\n  - "active" = true\n  - "location" {}\n    - "city" "Phoenix"\n  - "tags" []\n    - "wasm"\n    - "yaml"\n  - "empty" {}\n',
}, {
  id: "18-list-to-toml",
  title: "Hierarchical Markdown data to TOML",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "l", path: "transforms/01-list-to-json" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    "- {}\n  - name Ben\n  - active = true\n  - location {}\n    - city Phoenix\n  - tags []\n    - wasm\n    - Markdown\n  - empty {}",
  expected:
    '```toml\n"name" = "Ben"\n"active" = true\n"location" = {"city" = "Phoenix"}\n"tags" = ["wasm", "Markdown"]\n"empty" = {}\n```\n',
}, {
  id: "19-toml-to-list",
  title: "TOML assignments to hierarchical Markdown data",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "s", path: "transforms/00-toml-strings" },
  ],
  input:
    '```toml\nname = "Ben"\nactive = true\nlocation = { city = "Phoenix" }\nports = [\n  +8_080, # development\n  443,\n]\nempty = {}\n```\n',
  expected:
    '- {}\n  - "name" "Ben"\n  - "active" = true\n  - "location" {}\n    - "city" "Phoenix"\n  - "ports" []\n    - = 8080\n    - = 443\n  - "empty" {}\n',
}, {
  id: "20-ini-to-list",
  title: "INI sections to hierarchical Markdown data",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    "```ini\nname = Ben\n\n[server]\nhost = localhost\nport: 3030\n\n[paths]\nroot = C:\\projects\n```\n",
  expected:
    '- {}\n  - "" {}\n    - "name" "Ben"\n  - "server" {}\n    - "host" "localhost"\n    - "port" "3030"\n  - "paths" {}\n    - "root" "C:\\\\projects"\n',
}, {
  id: "21-list-to-ini",
  title: "Hierarchical Markdown sections to INI",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "l", path: "transforms/01-list-to-json" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    '- {}\n  - "" {}\n    - name Ben\n  - server {}\n    - host localhost\n    - port "3030"\n  - empty {}',
  expected:
    "```ini\nname = Ben\n[server]\nhost = localhost\nport = 3030\n[empty]\n```\n",
}];

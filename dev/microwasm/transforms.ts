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
}, {
  id: "22-dotenv-to-list",
  title: "Dotenv assignments to a Markdown data list",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    '```dotenv\nexport NAME=Ben\nPORT=3030\nGREETING="Hello # friend"\nLINES="first\\nsecond"\nLITERAL=\'${NAME}\'\nEMPTY=\n```\n',
  expected:
    '- {}\n  - "NAME" "Ben"\n  - "PORT" "3030"\n  - "GREETING" "Hello # friend"\n  - "LINES" "first\\nsecond"\n  - "LITERAL" "${NAME}"\n  - "EMPTY" ""\n',
}, {
  id: "23-list-to-dotenv",
  title: "Markdown string properties to dotenv",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "l", path: "transforms/01-list-to-json" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    '- {}\n  - NAME Ben\n  - PORT "3030"\n  - GREETING "Hello # friend"\n  - LINES "first\\nsecond"\n  - LITERAL "${NAME}"\n  - EMPTY ""',
  expected:
    '```dotenv\nNAME=Ben\nPORT=3030\nGREETING="Hello # friend"\nLINES="first\\nsecond"\nLITERAL=${NAME}\nEMPTY=\n```\n',
}, {
  id: "24-query-to-list",
  title: "URL query string to ordered Markdown pairs",
  input: "```query\n?name=Ben+Atkin&tag=wasm&tag=Markdown&flag\n```\n",
  expected:
    '- []\n  - []\n    - "name"\n    - "Ben Atkin"\n  - []\n    - "tag"\n    - "wasm"\n  - []\n    - "tag"\n    - "Markdown"\n  - []\n    - "flag"\n    - ""\n',
}, {
  id: "25-list-to-query",
  title: "Ordered Markdown pairs to a URL query string",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "l", path: "transforms/01-list-to-json" },
    { name: "k", path: "transforms/00-json-string-keys" },
  ],
  input:
    '- []\n  - []\n    - name\n    - Ben Atkin\n  - []\n    - tag\n    - wasm\n  - []\n    - tag\n    - Markdown\n  - []\n    - flag\n    - ""',
  expected: "```query\nname=Ben+Atkin&tag=wasm&tag=Markdown&flag=\n```\n",
}, {
  id: "26-xml-to-list",
  title: "XML to an ordered Markdown tree",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "x", path: "transforms/00-xml-strings" },
  ],
  input:
    '```xml\n<note priority="high">Hello <b>Ben</b> &amp; friends.</note>\n```\n',
  expected:
    '- []\n  - {}\n    - "element" "note"\n    - "attributes" {}\n      - "priority" "high"\n    - "children" []\n      - {}\n        - "text" "Hello "\n      - {}\n        - "element" "b"\n        - "attributes" {}\n        - "children" []\n          - {}\n            - "text" "Ben"\n      - {}\n        - "text" " & friends."\n',
}, {
  id: "27-list-to-xml",
  title: "An ordered Markdown tree to XML",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "l", path: "transforms/01-list-to-json" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "x", path: "transforms/00-xml-strings" },
    { name: "o", path: "transforms/00-xml-output" },
  ],
  input:
    '- []\n  - {}\n    - element note\n    - attributes {}\n      - priority high\n    - children []\n      - {}\n        - text "Hello "\n      - {}\n        - element b\n        - attributes {}\n        - children []\n          - {}\n            - text Ben\n      - {}\n        - text " & friends."\n',
  expected:
    '```xml\n<note priority="high">Hello <b>Ben</b> &amp; friends.</note>\n```\n',
}, {
  id: "28-outline-to-opml",
  title: "Markdown link outline to OPML",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "x", path: "transforms/00-xml-strings" },
    { name: "o", path: "transforms/00-xml-output" },
  ],
  input:
    "# Reading\n\n- Web\n  - [WebAssembly](https://webassembly.org/)\n  - [SQLite](<https://sqlite.org/docs.html>)\n- Books & notes",
  expected:
    '```opml\n<opml version="2.0">\n<head><title>Reading</title></head>\n<body>\n  <outline text="Web">\n    <outline text="WebAssembly" type="link" url="https://webassembly.org/">\n    </outline>\n    <outline text="SQLite" type="link" url="https://sqlite.org/docs.html">\n    </outline>\n  </outline>\n  <outline text="Books &amp; notes">\n  </outline>\n</body>\n</opml>\n```\n',
}, {
  id: "29-opml-to-outline",
  title: "OPML to a Markdown link outline",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "x", path: "transforms/00-xml-strings" },
    { name: "v", path: "transforms/26-xml-to-list" },
  ],
  input:
    '```opml\n<opml version="2.0">\n  <head><title>Reading</title></head>\n  <body>\n    <outline text="Web">\n      <outline text="WebAssembly" type="link" url="https://webassembly.org/"/>\n      <outline text="SQLite" type="link" url="https://sqlite.org/docs.html"/>\n    </outline>\n  </body>\n</opml>\n```\n',
  expected:
    "# Reading\n\n- Web\n  - [WebAssembly](<https://webassembly.org/>)\n  - [SQLite](<https://sqlite.org/docs.html>)\n",
}, {
  id: "31-outline-to-bookmarks",
  title: "Markdown bookmark outline to browser HTML",
  dependencies: [
    { name: "n", path: "numbers/02-json-number" },
    { name: "k", path: "transforms/00-json-string-keys" },
    { name: "x", path: "transforms/00-xml-strings" },
    { name: "o", path: "transforms/00-xml-output" },
  ],
  input:
    "# Reading\n\n- Web\n  - [WebAssembly](https://webassembly.org/)\n  - [SQLite](<https://sqlite.org/docs.html>)\n- Empty folder",
  expected:
    '```html\n<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Reading</TITLE>\n<H1>Reading</H1>\n<DL><p>\n  <DT><H3>Web</H3>\n  <DL><p>\n    <DT><A HREF="https://webassembly.org/">WebAssembly</A>\n    <DT><A HREF="https://sqlite.org/docs.html">SQLite</A>\n  </DL><p>\n  <DT><H3>Empty folder</H3>\n  <DL><p>\n  </DL><p>\n</DL><p>\n```\n',
}];

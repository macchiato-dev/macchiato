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
}];

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
  id: "03-mad-libs",
  title: "Mad libs",
  input:
    "My [pet] went to the [place] [time]!\n\n- pet: dog\n- place: park\n- time: yesterday",
  expected: "My dog went to the park yesterday!",
}];

import test from "node:test";
import assert from "node:assert/strict";
import { readProjects, writeProjects } from "../../../examples/rest-client/markdown.js";

test("REST Markdown round-trips projects, disabled rows, punctuation and fenced bodies", () => {
  const projects = [{ name: "Demo `project`\n第二", baseUrl: "https://example.test/v1", requests: [
    { name: "Request: \"one\"", method: "POST", url: "/items?existing=yes", body: 'line\n```json\n{"value":"hello"}\n```\n',
      headers: [{ name: "X-`Odd`: name", value: "\"quoted\": `value`\nnext", enabled: false }],
      parameters: [{ name: "", value: "", enabled: true }, { name: "a & b", value: "é / 🐈", enabled: false }] },
    { name: "Empty", method: "GET", url: "/", body: "", headers: [], parameters: [] },
  ] }, { name: "Second", baseUrl: "", requests: [
    { name: "Whitespace", method: "PUT", url: "https://example.test", body: " \n\n", headers: [], parameters: [] },
  ] }];
  const markdown = writeProjects(projects);
  assert.match(markdown, /#### Headers\n- \[ \]/);
  assert.match(markdown, /#### Body\n````text/);
  assert.deepEqual(readProjects(markdown), projects);
});

test("REST Markdown rejects partial and ambiguous imports instead of dropping data", () => {
  const valid = writeProjects([{ name: "One", baseUrl: "https://example.test", requests: [
    { name: "Read", method: "GET", url: "/", body: "text", headers: [], parameters: [] },
  ] }]);
  for (const invalid of ["", valid.replace("### Request", "### Unknown"), valid.replace('`"GET"`', '`"CONNECT"`'),
    valid.replace("text\n```", "text"), valid.replace("#### Headers", "#### Other"), valid + "unexpected\n"])
    assert.throws(() => readProjects(invalid), /Line /);
});

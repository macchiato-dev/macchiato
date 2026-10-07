// The interchange format is ordinary, visible Markdown. JSON string literals
// inside code spans preserve empty strings, line breaks and punctuation; no
// hidden attributes or comments carry application data.
function span(value) {
  const text = JSON.stringify(value);
  const width = Math.max(0, ...[...text.matchAll(/`+/g)].map(match => match[0].length)) + 1;
  const fence = "`".repeat(width);
  return `${fence}${text}${fence}`;
}

export function writeProjects(projects) {
  const lines = ["# REST Desk", ""];
  for (const project of projects) {
    lines.push("## Project", `- Name: ${span(project.name)}`, `- Base URL: ${span(project.baseUrl)}`, "");
    for (const request of project.requests) {
      lines.push("### Request", `- Name: ${span(request.name)}`, `- Method: ${span(request.method)}`, `- URL: ${span(request.url)}`, "");
      for (const [heading, key] of [["Parameters", "parameters"], ["Headers", "headers"]]) {
        lines.push(`#### ${heading}`);
        for (const item of request[key]) lines.push(`- [${item.enabled ? "x" : " "}] ${span(item.name)}: ${span(item.value)}`);
        lines.push("");
      }
      const fence = "`".repeat(Math.max(2, ...[...request.body.matchAll(/`+/g)].map(match => match[0].length)) + 1);
      lines.push("#### Body", `${fence}text`, request.body, fence, "");
    }
  }
  return lines.join("\n");
}

export function readProjects(source) {
  if (typeof source !== "string" || source.length > 1_048_576) throw new Error("Markdown must be at most 1 MiB of text");
  const lines = source.split("\n"), projects = [];
  let at = 0;
  const fail = message => { throw new Error(`Line ${at + 1}: ${message}`); };
  function skip() { while (at < lines.length && !lines[at].trim()) at++; }
  function expect(value) {
    skip();
    if (lines[at]?.trim() !== value) fail(`Expected ${value}`);
    at++;
  }
  function value(text) {
    const match = /^(`+)(".*")\1$/.exec(text);
    if (!match) fail("Expected a JSON string inside a Markdown code span");
    try {
      const result = JSON.parse(match[2]);
      if (typeof result === "string") return result;
    } catch { /* Report the Markdown line, not a parser implementation detail. */ }
    fail("Invalid string");
  }
  function property(name) {
    skip();
    const prefix = `- ${name}: `;
    if (!lines[at]?.startsWith(prefix)) fail(`Expected ${prefix}`);
    const result = value(lines[at].slice(prefix.length).trim());
    at++;
    return result;
  }
  function pairs(heading) {
    expect(`#### ${heading}`);
    const result = [];
    skip();
    while (lines[at]?.startsWith("- ")) {
      const match = /^- \[([ xX])\] (`+)(".*?")\2: (.+)$/.exec(lines[at].trim());
      if (!match) fail("Expected a checked or unchecked name/value list item");
      result.push({ enabled: match[1] !== " ", name: value(match[2] + match[3] + match[2]), value: value(match[4]) });
      at++; skip();
    }
    return result;
  }
  expect("# REST Desk");
  skip();
  while (at < lines.length) {
    expect("## Project");
    const project = { name: property("Name"), baseUrl: property("Base URL"), requests: [] };
    skip();
    while (lines[at]?.trim() === "### Request") {
      at++;
      const request = { name: property("Name"), method: property("Method"), url: property("URL") };
      request.parameters = pairs("Parameters");
      request.headers = pairs("Headers");
      expect("#### Body");
      const opening = /^(`{3,})(?:[a-zA-Z0-9_-]*)\r?$/.exec(lines[at] || "");
      if (!opening) fail("Expected a fenced request body");
      const fence = opening[1], body = [];
      at++;
      while (at < lines.length && lines[at].replace(/\r$/, "") !== fence) body.push(lines[at++]);
      if (at === lines.length) fail("Request body fence is not closed");
      request.body = body.join("\n");
      at++;
      if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(request.method)) fail("Unsupported HTTP method");
      project.requests.push(request);
      skip();
    }
    if (!project.requests.length) fail("A project needs at least one request");
    projects.push(project);
  }
  if (!projects.length) fail("No projects found");
  return projects;
}

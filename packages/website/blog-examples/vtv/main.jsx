import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import View from "vtv";
import "vtv/css/vtv.css";
import "./style.css";

const presets = {
  hierarchy: {
    name: "planets",
    value: {
      inner: ["Mercury", "Venus", "Earth", "Mars"],
      outer: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    },
    state: {},
  },
  code: {
    name: "page",
    value: {
      html: "<main>\n  <h1>Hello, world.</h1>\n</main>",
      css: "main {\n  max-width: 42rem;\n  margin: auto;\n}",
    },
    state: {},
  },
  "code-data": {
    name: "example",
    value: {
      value: {
        html: "<main>\n  <h1>Hello, world.</h1>\n</main>",
        css: "main {\n  max-width: 42rem;\n  margin: auto;\n}",
      },
      state: { html: { _view: "html" }, css: { _view: "css" } },
    },
    state: {},
  },
  types: {
    name: "values",
    value: {
      number: 42,
      boolean: true,
      nullValue: null,
      numberLikeString: "42",
      booleanLikeString: "true",
      quotedString: "\"s\"",
      emptyString: "",
    },
    state: {},
  },
};

function ArchivedExample() {
  const requested = new URLSearchParams(location.search).get("preset") || "hierarchy";
  const initial = presets[requested] || presets.hierarchy;
  const [document, setDocument] = useState(initial);
  return <View
    name={document.name}
    value={document.value}
    state={document.state}
    theme="dark"
    onChange={setDocument}
    onAction={() => {}}
    onPickId={() => {}}
  />;
}

createRoot(document.getElementById("app")).render(<ArchivedExample />);

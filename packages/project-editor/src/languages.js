// Shared by the guest's file chooser and the bytecode build. Parser factories
// are deliberately not imported here: this registry is only small metadata.
export const editorLanguages = [
  { name: "javascript", title: "JavaScript", extensions: ["js", "mjs", "cjs"], aliases: ["js"], package: "javascript" },
  { name: "jsx", title: "JSX", extensions: ["jsx"], aliases: [], package: "javascript" },
  { name: "typescript", title: "TypeScript", extensions: ["ts", "mts", "cts"], aliases: ["ts"], package: "javascript" },
  { name: "tsx", title: "TSX", extensions: ["tsx"], aliases: [], package: "javascript" },
  { name: "html", title: "HTML", extensions: ["html", "htm", "svg"], aliases: [], package: "html" },
  { name: "css", title: "CSS", extensions: ["css"], aliases: [], package: "css" },
  { name: "json", title: "JSON", extensions: ["json"], aliases: [], package: "json" },
  { name: "vue", title: "Vue", extensions: ["vue"], aliases: [], package: "vue" },
  { name: "svelte", title: "Svelte", extensions: ["svelte"], aliases: [], package: "svelte" },
  { name: "markdown", title: "Markdown", extensions: ["md", "markdown"], aliases: ["md"], package: "markdown" },
  { name: "python", title: "Python", extensions: ["py", "pyw", "pyi"], aliases: ["py"], package: "python" },
  { name: "rust", title: "Rust", extensions: ["rs"], aliases: ["rs"], package: "rust" },
  { name: "sql", title: "SQL", extensions: ["sql"], aliases: [], package: "sql" },
  { name: "yaml", title: "YAML", extensions: ["yaml", "yml"], aliases: ["yml"], package: "yaml" },
  { name: "cpp", title: "C/C++", extensions: ["c", "h", "cc", "cpp", "cxx", "hpp", "hxx"], aliases: ["c", "c++"], package: "cpp" },
];

export function editorLanguageForPath(path) {
  if (path === "config") return "json";
  const extension = String(path).split("/").pop().split(".").pop().toLowerCase();
  const entry = editorLanguages.find((language) => language.extensions.includes(extension));
  return entry ? entry.name : "plain";
}

export function createEditorLanguageLoader(load) {
  const loaded = new Set();
  return (name) => {
    const entry = editorLanguages.find((language) => language.name === name);
    if (!entry || loaded.has(entry.package)) return;
    load(`language-${entry.package}.bin`);
    loaded.add(entry.package);
  };
}

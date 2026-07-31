globalThis.__codeEditorBoot = () => {
  const editor = document.querySelector(".cm-editor");
  const lines = document.querySelectorAll(".cm-line");
  const shape = JSON.parse(globalThis.__browserUseInspect());
  return JSON.stringify({
    ready: Boolean(editor),
    lines: lines.length,
    elements: shape.elements,
    tags: shape.tags,
  });
};

globalThis.__codeEditorChanged = (json) => {
  const change = JSON.parse(json);
  const lines = document.querySelectorAll(".cm-line");
  const shape = JSON.parse(globalThis.__browserUseInspect());
  return JSON.stringify({
    characters: change.characters,
    lines: lines.length,
    elements: shape.elements,
  });
};

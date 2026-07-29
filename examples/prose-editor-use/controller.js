function observed(snapshot) {
  const paragraphs = document.querySelectorAll(".ProseMirror > p");
  const shape = JSON.parse(globalThis.__browserUseInspect());
  return JSON.stringify({
    characters: snapshot.characters,
    paragraphs: paragraphs.length,
    elements: shape.elements,
    tags: shape.tags,
  });
}

globalThis.__messageEditorConfig = () => JSON.stringify({ engine: "prosemirror" });
globalThis.__proseEditorBoot = (json) => observed(JSON.parse(json));
globalThis.__proseEditorChanged = (json) => observed(JSON.parse(json));
globalThis.__proseEditorSubmit = (json) => {
  const snapshot = JSON.parse(json);
  if (!snapshot.text.trim()) throw new Error("A message is required");
  return JSON.stringify({ text: snapshot.text.slice(0, 20_000) });
};

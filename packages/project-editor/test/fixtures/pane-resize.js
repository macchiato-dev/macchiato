var resizeRows = [];
for (var row = 1; row <= 18; row++) {
  resizeRows.push("row " + row + ": " + "words that wrap across the pane ".repeat(6));
}
globalThis.__codeEditorSetContent(JSON.stringify({ language: "plain", content: resizeRows.join("\n") }));
function readPaneState() {
  var view = globalThis.__codeEditorView;
  __browserUseNotify(JSON.stringify({ type: "pane-state", width: view.viewState.contentDOMWidth,
    height: view.contentHeight, document: view.state.doc.toString(),
    inView: view.inView, intersecting: view.observer.intersecting,
    lastUpdate: view.docView.lastUpdate, now: Date.now() }));
  if (typeof flush === "function") flush();
}

globalThis.__CODE_EDITOR_DEFER_START__ = true;
load("editor.bin");
globalThis.__codeEditorLoadLanguage = globalThis.__codeEditorCreateLanguageLoader(load);

function selectFile(json) {
  var request = JSON.parse(json);
  request.language = globalThis.__codeEditorLanguageForPath(request.path);
  globalThis.__codeEditorSetContent(JSON.stringify(request));
  inspectEditor();
}

function inspectEditor() {
  globalThis.__wwcPostMessage("__wwcResponse:" + globalThis.__codeEditorInspect());
  flush();
}

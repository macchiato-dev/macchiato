globalThis.__CODE_EDITOR_DEFER_START__ = true;
load("editor.bin");
globalThis.__codeEditorLoadLanguage = globalThis.__codeEditorCreateLanguageLoader(load);
var nativeTextWriter = globalThis.__wwcWriteText;
var localNotices = [];

function localNotifications(json) {
  var request = JSON.parse(json);
  globalThis.__codeEditorNotify = request.enabled ? function (message) {
    if (!message || typeof message !== "object") throw new Error("notification is not an object");
    if (request.latestOnly) localNotices[0] = message;
    else localNotices.push(message);
  } : undefined;
  __wwcPostMessage("__wwcResponse:" + JSON.stringify(localNotices));
  flush();
  if (!request.enabled) localNotices = [];
}

function selectTextWriter(json) {
  var native = JSON.parse(json).native;
  globalThis.__wwcWriteText = native ? nativeTextWriter : undefined;
  if ((typeof __wwcWriteText === "function") !== native) throw new Error("writer path was not switched");
  inspectEditor();
}

function measureTextEncoding(json) {
  var text = JSON.parse(json).text, bytes = new Uint8Array(text.length * 4 + 16);
  var results = [false, true, true, false].map(function (native) {
    globalThis.__wwcWriteText = native ? nativeTextWriter : undefined;
    var writer = new Writer(bytes), started = performance.now();
    for (var index = 0; index < 20; index++) {
      writer.at = 4;
      writer.text(text);
    }
    return { native: native, elapsed: performance.now() - started, end: writer.at };
  });
  globalThis.__wwcWriteText = nativeTextWriter;
  __wwcPostMessage("__wwcResponse:" + JSON.stringify(results));
  flush();
}

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

function collectEditor() {
  gc();
  inspectEditor();
}

function selectPosition(json) {
  globalThis.__codeEditorSelect(json);
  globalThis.__codeEditorFocus();
  inspectEditor();
}

function selectTheme(json) {
  globalThis.__codeEditorSetTheme(json);
  inspectEditor();
}

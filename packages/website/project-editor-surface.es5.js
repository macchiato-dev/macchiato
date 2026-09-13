(function () {
  "use strict";

  // Only the trusted editor runs here. Project source is passed to CodeMirror
  // as text; project execution belongs to the separate output machine.
  globalThis.__CODE_EDITOR_DEFER_START__ = true;
  load("editor.bin");
  // Site commands cross as intents. Do not replay native editing events in
  // another Document, where selection and CodeMirror's handlers differ.
  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      globalThis.__wwcPostMessage(JSON.stringify({ type: "shortcut", name: "command-palette" }));
    }
  });
  var requests = {};
  var nextRequest = 1;
  globalThis.__codeEditorLoadLanguage = globalThis.__codeEditorCreateLanguageLoader(function (name) {
    return new Promise(function (resolve, reject) {
      var id = nextRequest++;
      requests[id] = { resolve: resolve, reject: reject, name: name };
      globalThis.__wwcPostMessage(JSON.stringify({
        protocol: "resources-editor-v1", id: id, name: "bytecode.load", payload: { name: name }
      }));
    });
  });
  globalThis.__resourcesEditorReceive = function (json) {
    var message = JSON.parse(json);
    var operation = requests[message.id];
    if (!operation) return "null";
    delete requests[message.id];
    if (message.error) operation.reject(new Error(message.error));
    else {
      try { load(operation.name); operation.resolve(null); }
      catch (error) { operation.reject(error); }
    }
    return "null";
  };
})();

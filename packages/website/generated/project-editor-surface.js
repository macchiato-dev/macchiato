(() => {
  // Project source remains text here; execution belongs to the output VM.
  // The controller loads CodeMirror before this small integration program.
  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      __wwcPostMessage(JSON.stringify({ type: "shortcut", name: "command-palette" }));
    }
  });
  const requests = new Map();
  let nextRequest = 1;
  globalThis.__codeEditorLoadLanguage = __codeEditorCreateLanguageLoader(name =>
    new Promise((resolve, reject) => {
      const id = nextRequest++;
      requests.set(id, { resolve, reject });
      __wwcPostMessage(JSON.stringify({
        protocol: "resources-editor-v1", id, name: "bytecode.load", payload: { name },
      }));
    }));
  globalThis.__resourcesEditorReceive = json => {
    const message = JSON.parse(json);
    const operation = requests.get(message.id);
    if (operation) {
      requests.delete(message.id);
      // Acknowledgment means the grammar has already run in this context.
      if (message.error) operation.reject(new Error(message.error));
      else operation.resolve(null);
    }
    return "null";
  };
})();

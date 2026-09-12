// Test-only, inclusive timings. Nested rows must not be added together.
var bulkTimings = Object.create(null);
var bulkStringify = JSON.stringify;
function bulkMeasure(object, name, label) {
  var original = object[name];
  if (typeof original !== "function") throw new Error("Missing checkpoint: " + label);
  object[name] = function () {
    var started = performance.now();
    try { return original.apply(this, arguments); }
    finally {
      var duration = performance.now() - started;
      var entry = bulkTimings[label] || (bulkTimings[label] = { calls: 0, milliseconds: 0 });
      entry.calls++;
      entry.milliseconds += duration;
    }
  };
}
var bulkView = globalThis.__codeEditorView;
bulkMeasure(bulkView, "dispatch", "dispatch");
bulkMeasure(bulkView, "update", "view update");
bulkMeasure(bulkView, "measure", "view measure");
bulkMeasure(bulkView.observer, "flush", "observer flush");
bulkMeasure(bulkView.observer, "processRecords", "observer records");
bulkMeasure(bulkView.docView, "update", "DOM view update");
bulkMeasure(bulkView.docView, "updateInner", "DOM tree update");
bulkMeasure(bulkView.docView, "updateDeco", "decorations update");
bulkMeasure(bulkView.docView, "updateSelection", "selection update");
bulkMeasure(bulkView, "updatePlugins", "plugin updates");
bulkMeasure(bulkView.viewState, "update", "viewport update");
bulkMeasure(globalThis, "__browserUseNotify", "notify");
var bulkParse = globalThis.__codeMirrorRequire("@codemirror/language").ParseContext.prototype;
if (globalThis.__bulkParseBudget) {
  var bulkOriginalWork = bulkParse.work;
  bulkParse.work = function (until, upto) {
    // Experiment only: reduce the installed version's 20 ms foreground
    // budget, not its idle-worker predicate or explicit parsing requests.
    return bulkOriginalWork.call(this, until === 20 ? __bulkParseBudget : until, upto);
  };
}
bulkMeasure(bulkParse, "work", "parser work");
bulkMeasure(bulkParse, "takeTree", "parser finish");
bulkMeasure(globalThis.__codeMirrorRequire("@codemirror/state").Text.prototype, "toString", "document string");
bulkMeasure(JSON, "stringify", "JSON stringify");
function resetTypingCheckpoints() {
  bulkTimings = Object.create(null);
}
function finishBulkParsing() {
  var language = globalThis.__codeMirrorRequire("@codemirror/language");
  var started = performance.now();
  var parsed = language.forceParsing(bulkView, bulkView.state.doc.length, 20000);
  globalThis.__browserUseNotify(bulkStringify({ type: "parse-before-typing", parsed: parsed,
    milliseconds: performance.now() - started }));
  if (typeof flush === "function") flush();
}
function reportTypingCheckpoints() {
  var language = globalThis.__codeMirrorRequire("@codemirror/language");
  globalThis.__browserUseNotify(bulkStringify({ type: "typing-checkpoints", timings: bulkTimings,
    viewportParsed: language.syntaxTreeAvailable(bulkView.state, bulkView.viewport.to),
    documentParsed: language.syntaxTreeAvailable(bulkView.state, bulkView.state.doc.length) }));
  if (typeof flush === "function") flush();
}

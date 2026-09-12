// Test-only, inclusive timings. Nested rows must not be added together.
var bulkTimings = Object.create(null);
var bulkStringify = JSON.stringify;
var bulkWireReads = { strings: 0, bytes: 0, largest: 0 };
var bulkWireOperations = Object.create(null);
var bulkCollections = Object.create(null);
var bulkParseProgress = [];
if (globalThis.__bulkCollectionCheckpoints) {
  // Count collection use without retaining keys/values or inspecting weak
  // reachability. Size is available only for strong collections. These extra
  // guest operations are diagnostic overhead, not benchmark production code.
  ["Map", "Set", "WeakMap", "WeakSet"].forEach(function (name) {
    ["get", "has", "set", "add", "delete"].forEach(function (method) {
      var prototype = globalThis[name].prototype, original = prototype[method];
      if (typeof original !== "function") return;
      prototype[method] = function () {
        var label = name + "." + method;
        var row = bulkCollections[label] || (bulkCollections[label] = { calls: 0, sizeSum: 0, largest: 0, keys: {} });
        row.calls++;
        var keyType = typeof arguments[0];
        row.keys[keyType] = (row.keys[keyType] || 0) + 1;
        if (name === "Map" || name === "Set") {
          var size = this.size;
          row.sizeSum += size;
          row.largest = Math.max(row.largest, size);
          if (size > 512 && !row.exampleStack) row.exampleStack = String(new Error("Collection checkpoint").stack).slice(0, 2000);
        }
        return original.apply(this, arguments);
      };
    });
  });
}
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
bulkMeasure(Object.getPrototypeOf(bulkView.docView.tile), "sync", "root DOM sync");
bulkView.plugins.forEach(function (plugin, index) {
  if (plugin.value && typeof plugin.value.update === "function") {
    bulkMeasure(plugin.value, "update", "plugin " + index + " " + plugin.value.constructor.name);
  }
});
if (globalThis.__bulkHighlightCheckpoints) {
  // Obtain the installed highlighter facet from a throwaway extension, without
  // installing a different highlighter. These fine-grained timers are costly:
  // use them only to locate work, not for candidate/control latency comparisons.
  var highlightLanguage = globalThis.__codeMirrorRequire("@codemirror/language");
  var highlightExtension = highlightLanguage.syntaxHighlighting({ style: function () { return null; } });
  var highlightProvider = highlightExtension[highlightExtension.length - 1];
  if (!highlightProvider.facet) throw Error("Highlighter facet shape changed");
  var measuredHighlighters = bulkView.state.facet(highlightProvider.facet);
  if (!measuredHighlighters.length) throw Error("No active highlighter to measure");
  measuredHighlighters.forEach(function (highlighter, index) {
    bulkMeasure(highlighter, "style", "highlight style " + index);
  });
  bulkView.plugins.forEach(function (plugin) {
    if (plugin.value && plugin.value.markCache && typeof plugin.value.buildDeco === "function") {
      bulkMeasure(plugin.value, "buildDeco", "highlight decorations");
    }
  });
  var builder = globalThis.__codeMirrorRequire("@codemirror/state").RangeSetBuilder.prototype;
  bulkMeasure(builder, "add", "range builder add");
  bulkMeasure(builder, "finish", "range builder finish");
}
bulkMeasure(bulkView.viewState, "update", "viewport update");
bulkMeasure(globalThis, "__browserUseNotify", "notify");
var bulkParse = globalThis.__codeMirrorRequire("@codemirror/language").ParseContext.prototype;
if (globalThis.__bulkParseProgress) {
  // Snapshot positions, not parser/tree references. This exposes whether edits
  // retain completed fragments or discard ongoing work, without timing every
  // token or holding old editor states alive. Keep diagnostic output bounded.
  var parsePosition = function (context) {
    return { length: context.state.doc.length, tree: context.treeLen,
      position: context.parse ? context.parse.parsedPos : null,
      fragments: context.fragments.map(function (fragment) {
        return [fragment.from, fragment.to];
      }) };
  };
  ["work", "changes"].forEach(function (method) {
    var original = bulkParse[method];
    bulkParse[method] = function () {
      if (bulkParseProgress.length >= 256) return original.apply(this, arguments);
      var row = { method: method, before: parsePosition(this) };
      var result = original.apply(this, arguments);
      row.after = parsePosition(this);
      if (method === "changes") row.next = parsePosition(result);
      bulkParseProgress.push(row);
      return result;
    };
  });
}
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
if (globalThis.__bulkWireCheckpoints && typeof Reader === "function" && typeof exchange === "function") {
  // Count at the callers, not inside exchange: an alternative encoder may
  // bypass that batch helper without changing the number of actual host calls.
  bulkMeasure(globalThis, "bridge", "host wire call");
  var countWireOperations = function (operations) {
    for (var index = 0; index < operations.length; index++) {
      var operation = operations[index], name = operation[0] + ":" + wireStrings[operation[2]];
      bulkWireOperations[name] = (bulkWireOperations[name] || 0) + 1;
    }
  };
  var bulkImmediate = immediate, bulkFlush = flush;
  immediate = function (operation) {
    countWireOperations([operation]);
    return bulkImmediate(operation);
  };
  flush = function () {
    countWireOperations(pendingOperations);
    return bulkFlush();
  };
  bulkMeasure(Reader.prototype, "text", "wire text decoding");
  var bulkReadText = Reader.prototype.text;
  Reader.prototype.text = function () {
    var start = this.at;
    try { return bulkReadText.call(this); }
    finally {
      var length = this.at - start;
      bulkWireReads.strings++;
      bulkWireReads.bytes += length;
      bulkWireReads.largest = Math.max(bulkWireReads.largest, length);
    }
  };
}
function resetTypingCheckpoints() {
  bulkTimings = Object.create(null);
  bulkWireReads = { strings: 0, bytes: 0, largest: 0 };
  bulkWireOperations = Object.create(null);
  bulkCollections = Object.create(null);
  bulkParseProgress = [];
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
  globalThis.__browserUseNotify(bulkStringify({ type: "typing-checkpoints", timings: bulkTimings, wireReads: bulkWireReads,
    wireOperations: bulkWireOperations, collections: bulkCollections, parseProgress: bulkParseProgress,
    viewportParsed: language.syntaxTreeAvailable(bulkView.state, bulkView.viewport.to),
    documentParsed: language.syntaxTreeAvailable(bulkView.state, bulkView.state.doc.length) }));
  if (typeof flush === "function") flush();
}

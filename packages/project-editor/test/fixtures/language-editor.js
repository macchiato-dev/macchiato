globalThis.__CODE_EDITOR_DEFER_START__ = true;
load("editor.bin");
globalThis.__codeEditorLoadLanguage = globalThis.__codeEditorCreateLanguageLoader(load);
var nativeTextWriter = globalThis.__wwcWriteText;
var localNotices = [];

function encodeTextCases(json) {
  var inputs = JSON.parse(json), result = [];
  [true, false].forEach(function (native) {
    globalThis.__wwcWriteText = native ? nativeTextWriter : undefined;
    var encoder = new TextEncoder();
    var encoded = inputs.map(function (text) { return encoder.encode(text); });
    encoded.push(encoder.encode());
    // Later writes and collection must not invalidate previous results.
    encoder.encode('unrelated later buffer'); gc();
    result.push(encoded.map(function (bytes) {
      if (bytes.byteOffset !== 0 || bytes.buffer.byteLength !== bytes.length)
        throw new Error('TextEncoder must return an exactly sized independent buffer');
      return Array.from(bytes);
    }));
  });
  globalThis.__wwcWriteText = nativeTextWriter;
  __wwcPostMessage('__wwcResponse:' + JSON.stringify(result)); flush();
}

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

function measureMount(json) {
  var request = JSON.parse(json);
  request.language = globalThis.__codeEditorLanguageForPath(request.path);
  if (globalThis.__codeEditorView) globalThis.__codeEditorView.destroy();
  globalThis.__codeEditorView = null;
  var encoded = JSON.stringify(request), started = performance.now();
  globalThis.__codeEditorSetContent(encoded);
  flush();
  var elapsed = performance.now() - started;
  var view = globalThis.__codeEditorView;
  var language = globalThis.__codeMirrorRequire("@codemirror/language");
  __wwcPostMessage("__wwcResponse:" + JSON.stringify({
    elapsed: elapsed, parsedTo: language.syntaxTree(view.state).length,
    viewportTo: view.viewport.to, length: view.state.doc.length
  }));
  flush();
}

function inspectParsing() {
  var view = globalThis.__codeEditorView;
  var language = globalThis.__codeMirrorRequire("@codemirror/language");
  __wwcPostMessage("__wwcResponse:" + JSON.stringify({
    viewportTo: view.viewport.to, length: view.state.doc.length,
    available: language.syntaxTreeAvailable(view.state, view.viewport.to)
  }));
  flush();
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

var tabSizeCompartment;
function configureTabSize(json) {
  var state = globalThis.__codeMirrorRequire("@codemirror/state");
  var extension = state.EditorState.tabSize.of(JSON.parse(json).size);
  var effect;
  if (!tabSizeCompartment) {
    tabSizeCompartment = new state.Compartment();
    effect = state.StateEffect.appendConfig.of(tabSizeCompartment.of(extension));
  } else effect = tabSizeCompartment.reconfigure(extension);
  globalThis.__codeEditorView.dispatch({ effects: effect });
  inspectEditor();
}

var listenerProbeHits = 0;
var listenerProbe = function () { listenerProbeHits++; };
function recycleListeners() {
  for (var index = 0; index < 5000; index++) {
    document.addEventListener('pointermove', listenerProbe);
    document.removeEventListener('pointermove', listenerProbe);
  }
  document.addEventListener('pointermove', listenerProbe);
  inspectListeners();
}
function inspectListeners() {
  __wwcPostMessage('__wwcResponse:' + JSON.stringify({ hits: listenerProbeHits, slots: callbacks.length }));
  flush();
}
function removeProbeListener() {
  document.removeEventListener('pointermove', listenerProbe);
  inspectListeners();
}

var burstTarget, burstCount, burstLast, burstRetained;
function bubbleProbe(event) {
  if (event.target !== burstTarget) return;
  if (event !== burstLast || event.probe !== burstCount) throw new Error("event identity lost while bubbling");
}
function startEventBurst() {
  burstCount = 0;
  burstTarget = document.createElement("button");
  burstTarget.setAttribute("id", "event-burst");
  burstTarget.textContent = "Event test";
  burstTarget.addEventListener("change", function (event) {
    event.probe = ++burstCount;
    burstLast = event;
    if (!burstRetained) burstRetained = event;
  });
  document.body.appendChild(burstTarget);
  document.addEventListener("change", bubbleProbe);
  inspectListeners();
}
function inspectEventBurst() {
  gc();
  __wwcPostMessage("__wwcResponse:" + JSON.stringify({
    count: burstCount, slots: callbacks.length,
    retainedType: burstRetained.type, retainedTarget: burstRetained.target.getAttribute("id"),
    retainedProbe: burstRetained.probe
  }));
  flush();
}

var mutationLeft, mutationRight, mutationSaved, mutationResult;
function startMutationProbe() {
  var root = document.createElement("div");
  root.setAttribute("id", "mutation-probe");
  mutationLeft = document.createElement("div");
  mutationRight = document.createElement("div");
  mutationLeft.setAttribute("data-name", "left");
  mutationRight.setAttribute("data-name", "right");
  root.appendChild(mutationLeft); root.appendChild(mutationRight);
  var nodes = ["a", "b", "c", "d", "e"].map(function (name, index) {
    var node = document.createElement("span");
    node.setAttribute("data-name", name); node.textContent = name;
    (index < 4 ? mutationLeft : mutationRight).appendChild(node);
    return node;
  });
  mutationSaved = nodes[1];
  document.body.appendChild(root);
  var observer = new MutationObserver(function (records) {
    function names(parent) { return parent.childNodes.map(function (node) { return node.getAttribute("data-name"); }); }
    function label(node) { return !node ? null : node.nodeType === 3 ? "#text" : node.getAttribute("data-name") || "container"; }
    mutationResult = { left: names(mutationLeft), right: names(mutationRight),
      same: mutationLeft.firstChild === mutationSaved,
      removedParent: nodes[2].parentNode === null,
      addedParent: mutationLeft.lastChild.parentNode === mutationLeft,
      text: nodes[3].textContent, count: records.length,
      records: records.map(function (record) { return {
        type: record.type, target: label(record.target),
        previous: label(record.previousSibling), next: label(record.nextSibling),
        added: (record.addedNodes || []).map(label), removed: (record.removedNodes || []).map(label),
        attribute: record.attributeName || null, oldValue: record.oldValue == null ? null : record.oldValue
      }; }) };
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true,
    characterDataOldValue: true, attributes: true, attributeOldValue: true });
  inspectListeners();
}
function inspectMutationProbe() {
  __wwcPostMessage("__wwcResponse:" + JSON.stringify(mutationResult || null));
  flush();
}

var disabledProbe;
function inspectDisabledProbe(json) {
  var request = JSON.parse(json);
  if (!disabledProbe) {
    disabledProbe = document.createElement("button");
    disabledProbe.setAttribute("id", "disabled-probe");
    document.body.appendChild(disabledProbe);
  }
  if (request.write) disabledProbe.disabled = request.value;
  __wwcPostMessage("__wwcResponse:" + JSON.stringify({ disabled: disabledProbe.disabled }));
  flush();
}

var textProbe, textProbeParent, textProbeObserver, textProbeRecords;
function startTextProbe() {
  textProbeParent = document.createElement("div");
  textProbeParent.setAttribute("id", "text-probe");
  textProbe = document.createTextNode("initial");
  textProbeParent.appendChild(textProbe);
  document.body.appendChild(textProbeParent);
  textProbeRecords = [];
  inspectTextProbe();
}
function observeTextProbe() {
  textProbeObserver = new MutationObserver(function (records) {
    textProbeRecords = records.map(function (record) { return record.oldValue; });
  });
  textProbeObserver.observe(textProbe, { characterData: true, characterDataOldValue: true });
  inspectTextProbe();
}
function writeTextProbe(json) {
  var change = JSON.parse(json);
  textProbe[change.property] = change.value;
  inspectTextProbe();
}
function inspectTextProbe() {
  __wwcPostMessage("__wwcResponse:" + JSON.stringify({
    nodeValue: textProbe.nodeValue, textContent: textProbe.textContent,
    parentText: textProbeParent.textContent, oldValues: textProbeRecords
  }));
  flush();
}

var siblingNodes, siblingParent, siblingObserver, siblingFragment, siblingFragmentChild;
function startSiblingProbe() {
  siblingParent = document.createElement("div");
  siblingParent.setAttribute("id", "sibling-probe");
  siblingParent.setAttribute("data-name", "container");
  siblingFragment = document.createDocumentFragment();
  siblingFragmentChild = document.createElement("span");
  siblingFragment.appendChild(siblingFragmentChild);
  siblingNodes = ["first", "middle", "last"].map(function (name) {
    var node = document.createElement("span");
    node.setAttribute("data-name", name);
    siblingParent.appendChild(node);
    return node;
  });
  document.body.appendChild(siblingParent);
  siblingObserver = new MutationObserver(function () {});
  siblingObserver.observe(siblingParent, { childList: true });
  inspectSiblingProbe();
}
function moveSiblingProbe() {
  siblingParent.appendChild(siblingNodes[1]);
  siblingParent.appendChild(siblingNodes[2]);
  inspectSiblingProbe();
}
function inspectSiblingProbe() {
  function name(node) { return node ? node.getAttribute("data-name") : null; }
  __wwcPostMessage("__wwcResponse:" + JSON.stringify({
    first: name(siblingParent.firstChild),
    last: name(siblingParent.lastChild),
    next: siblingNodes.map(function (node) { return name(node.nextSibling); }),
    previous: siblingNodes.map(function (node) { return name(node.previousSibling); }),
    parents: siblingNodes.map(function (node) { return node.parentNode === siblingParent; }),
    parentElements: siblingNodes.map(function (node) { return node.parentElement === siblingParent; }),
    parentNames: siblingNodes.map(function (node) { return name(node.parentNode); }),
    fragmentParent: siblingFragmentChild.parentNode === siblingFragment,
    fragmentParentElement: siblingFragmentChild.parentElement === null,
    identity: siblingNodes[0].nextSibling === siblingNodes[1],
    nextIdentity: siblingNodes[2].nextSibling === siblingNodes[2].nextSibling,
    rootNext: document.body.nextSibling === null,
    rootPrevious: document.body.previousSibling === null,
    rootParent: document.body.parentNode === null,
    rootParentElement: document.body.parentElement === null
  }));
  flush();
}

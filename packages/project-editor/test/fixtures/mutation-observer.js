var mutationObserver;
function mutationReport(value) {
  __wwcPostMessage(JSON.stringify(value));
  if (typeof flush === "function") flush();
}
function describeMutations(records) {
  return records.map(function (record) {
    var result = { type: record.type, target: record.target.nodeType === 3 ? "#text" : record.target.id };
    if (record.type === "attributes") result.attribute = record.attributeName;
    if (record.type !== "childList") result.oldValue = record.oldValue;
    else result.added = Array.from(record.addedNodes).map(function (node) { return node.nodeName; });
    return result;
  });
}
function mutationCommand(json) {
  var action = JSON.parse(json).action;
  var a = document.getElementById("a"), b = document.getElementById("b");
  if (mutationObserver) mutationObserver.disconnect();
  mutationObserver = new MutationObserver(function (records, observer) {
    mutationReport({ records: describeMutations(records), identity: observer === mutationObserver,
      receiver: this === mutationObserver });
  });
  if (action === "multiple") {
    mutationObserver.observe(a, { attributes: true, attributeOldValue: true });
    a.setAttribute("data-keep", "first");
    mutationObserver.observe(b, { attributes: true, attributeOldValue: true });
    b.setAttribute("data-keep", "second");
  } else if (action === "replace-options") {
    mutationObserver.observe(a, { attributes: true });
    mutationObserver.observe(b, { attributes: true });
    a.setAttribute("data-keep", "queued");
    mutationObserver.observe(a, { childList: true });
    a.setAttribute("data-keep", "ignored");
    a.appendChild(document.createElement("i"));
    b.setAttribute("data-keep", "still-observed");
  } else if (action === "defaults-filter") {
    mutationObserver.observe(a, { attributeOldValue: true, attributeFilter: ["data-keep"] });
    a.setAttribute("data-ignore", "ignored");
    a.appendChild(document.createElement("em"));
    a.setAttribute("data-keep", "filtered");
  } else if (action === "character-default") {
    mutationObserver.observe(a.firstChild, { characterDataOldValue: true });
    a.firstChild.data = "changed text";
  } else if (action === "empty-filter") {
    mutationObserver.observe(a, { attributeFilter: [], childList: true });
    a.setAttribute("data-keep", "ignored again");
    a.appendChild(document.createElement("strong"));
  } else if (action === "drain") {
    mutationObserver.observe(a, { attributes: true });
    a.setAttribute("data-keep", "drained");
    mutationObserver.observe(b, { childList: true });
    b.appendChild(document.createElement("i"));
    mutationReport({ drained: describeMutations(mutationObserver.takeRecords()),
      empty: mutationObserver.takeRecords().length });
  } else if (action === "invalid") {
    mutationObserver.observe(a, { attributes: true });
    var failures = [];
    [undefined, null, {}, { attributes: false, attributeOldValue: true },
      { attributes: false, attributeFilter: [] },
      { characterData: false, characterDataOldValue: true }].forEach(function (options) {
      try { mutationObserver.observe(b, options); failures.push("accepted"); }
      catch (error) { failures.push(error.name); }
    });
    mutationReport({ failures: failures });
    a.setAttribute("data-keep", "valid observation survived");
  } else if (action === "recycle") {
    var before = typeof callbacks === "undefined" ? 0 : callbacks.length;
    for (var index = 0; index < 5000; index++) {
      mutationObserver.observe(a, { childList: true });
      mutationObserver.disconnect();
    }
    mutationReport({ recycled: 5000, growth: typeof callbacks === "undefined" ? 0 : callbacks.length - before });
  }
  return "ok";
}

const target = document.querySelector("#results");
const response = await fetch("/benchmark-results.json");
if (!response.ok) {
  target.textContent = "Run npm run benchmark:runtimes to create a result.";
} else {
  const result = await response.json();
  const labels = {
    startupReadyMs: "Ready",
    typingTraceMs: "Typing trace",
    keyLatencyMs: "Median key",
    undoRedoMs: "Undo + redo",
  };
  const cards = Object.entries(result.report).map(([runtime, measurements]) => {
    const rows = Object.entries(labels).map(([key, label]) =>
      `<dt>${label}</dt><dd>${measurements[key].median.toFixed(1)} ms</dd>`).join("");
    return `<article><h2>${runtime === "quickjs" ? "QuickJS" : "MicroQuickJS"}</h2>
      <dl>${rows}</dl></article>`;
  }).join("");
  target.innerHTML = `<div class="grid">${cards}</div>
    <p class="meta">${result.warmups} warmups · ${result.iterations} measured
    runs per runtime · ${result.sourceCharacters} source characters ·
    ${new Date(result.generatedAt).toLocaleString()}</p>`;
}

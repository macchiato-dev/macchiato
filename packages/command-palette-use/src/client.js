const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
const shortcut = isMac ? "⌘ K" : "Ctrl K";

for (const label of document.querySelectorAll("[data-command-shortcut]")) label.textContent = shortcut;

function paletteFor(trigger) {
  return trigger.closest(".userbar")?.querySelector("[data-command-dialog]") || document.querySelector("[data-command-dialog]");
}

function openPalette(trigger) {
  const dialog = paletteFor(trigger);
  if (!dialog || dialog.open) return;
  dialog.showModal();
  const input = dialog.querySelector("[data-command-input]");
  input.value = "";
  input.dispatchEvent(new Event("input"));
  input.focus();
}

function closePalette(dialog) {
  if (dialog?.open) dialog.close();
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-command-open]");
  if (trigger) {
    event.preventDefault();
    openPalette(trigger);
    return;
  }
  const search = event.target.closest("[data-search-elsewhere]");
  if (search) {
    const dialog = search.closest("[data-command-dialog]");
    const query = dialog?.querySelector("[data-command-input]")?.value.trim() || "";
    search.href = query ? `/browse?q=${encodeURIComponent(query)}` : "/browse";
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openPalette(document.querySelector("[data-command-open]"));
    return;
  }
  if (event.key === "Escape") closePalette(document.querySelector("[data-command-dialog][open]"));
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-command-input]")) return;
  const query = event.target.value.trim().toLowerCase();
  const dialog = event.target.closest("[data-command-dialog]");
  for (const item of dialog.querySelectorAll("[data-command-label]")) {
    item.hidden = Boolean(query && !item.dataset.commandLabel.includes(query));
  }
  const elsewhere = dialog.querySelector("[data-search-elsewhere] span");
  elsewhere.textContent = query ? `Search Resources.co for “${event.target.value.trim()}”` : "Search Resources.co";
});

for (const dialog of document.querySelectorAll("[data-command-dialog]")) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePalette(dialog);
  });
}

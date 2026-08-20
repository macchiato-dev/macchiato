const root = document.documentElement;
const choices = new Set(["dark", "light", "system"]);
const storageKey = root.dataset.themeStorageKey || "macchiato-theme";
const media = matchMedia("(prefers-color-scheme: light)");

function storedTheme() {
  try {
    const value = localStorage.getItem(storageKey);
    return choices.has(value) ? value : null;
  } catch {
    return null;
  }
}

function resolved(choice) {
  return choice === "system" ? (media.matches ? "light" : "dark") : choice;
}

function apply(choice, persist = true) {
  if (!choices.has(choice)) return;
  const theme = resolved(choice);
  root.dataset.theme = theme;
  root.dataset.themeChoice = choice;
  for (const button of document.querySelectorAll("button[data-theme-choice]")) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice));
  }
  if (persist) {
    try { localStorage.setItem(storageKey, choice); } catch {}
  }
  document.dispatchEvent(new CustomEvent("themechange", {
    detail: { choice, theme },
  }));
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-choice]");
  if (button) apply(button.dataset.themeChoice);
});
const syncSystemTheme = () => {
  if (root.dataset.themeChoice === "system" && root.dataset.theme !== resolved("system")) apply("system", false);
};
// Keep the MediaQueryList callback attached through repeated explicit/system
// switches. The two standard registration forms cover browser and emulation
// implementations that only notify one form; the state check makes it idempotent.
media.onchange = syncSystemTheme;
media.addEventListener?.("change", syncSystemTheme);
apply(storedTheme() || "system", false);

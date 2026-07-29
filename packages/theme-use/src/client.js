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
  root.dataset.theme = resolved(choice);
  root.dataset.themeChoice = choice;
  for (const button of document.querySelectorAll("[data-theme-choice]")) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice));
  }
  if (persist) {
    try { localStorage.setItem(storageKey, choice); } catch {}
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-choice]");
  if (button) apply(button.dataset.themeChoice);
});
media.addEventListener?.("change", () => {
  if (root.dataset.themeChoice === "system") apply("system", false);
});
apply(storedTheme() || "dark", false);

// Run in the document head, before any content can paint. The guest still owns
// the theme controls and system-change listeners; it must not be on the critical
// path for choosing the initial palette on each full-document navigation.
export const themeBootstrapScript = `(() => {
  const root = document.documentElement;
  let choice = "system";
  try {
    const stored = localStorage.getItem(root.dataset.themeStorageKey || "macchiato-theme");
    if (stored === "light" || stored === "dark") choice = stored;
  } catch {}
  root.dataset.themeChoice = choice;
  root.dataset.theme = choice === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : choice;
})();`;

// Authorize only this exact inline bootstrap, not arbitrary inline scripts.
// The theme regression test checks this digest when the script changes.
export const themeBootstrapCsp = "sha256-SMeejJj7s9hK3sGF9yuntGYEJSOaKqRflHuse6gtbfc=";

export const themeBootstrapHtml = `<script>${themeBootstrapScript}</script>`;

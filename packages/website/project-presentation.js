// Page-level presentation chrome belongs to the outer frontend guest. The
// output can be useful before the editor machine (and CodeMirror) is loaded.
export function mountProjectPresentation(root) {
  const button = root.querySelector("[data-project-present]");
  const close = root.querySelector("[data-project-present-close]");
  const preview = root.querySelector(".project-editor__preview");
  const content = root.closest(".content-block");

  function hide() {
    delete root.dataset.presenting;
    document.body.classList.remove("project-presenting");
    preview.classList.remove("project-editor__preview--presenting");
    for (const name of ["animation", "backdrop-filter", "transform"]) content?.style.removeProperty(name);
    button.setAttribute("aria-pressed", "false");
  }

  button.addEventListener("click", () => {
    root.dataset.presenting = "true";
    document.body.classList.add("project-presenting");
    preview.classList.add("project-editor__preview--presenting");
    for (const name of ["animation", "backdrop-filter", "transform"]) content?.style.setProperty(name, "none");
    button.setAttribute("aria-pressed", "true");
    close.blur();
    // Focusing the existing iframe preserves its document, selection, and
    // current focused element. Never move or reload it to expand the view.
    requestAnimationFrame(() => root.querySelector(".project-editor__output-frame")?.focus());
  });
  close.addEventListener("click", event => {
    hide();
    if (event.detail === 0) button.focus();
    else button.blur();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && root.dataset.presenting === "true") {
      event.preventDefault();
      hide();
      button.focus();
    } else if (event.key === "Escape" && parent !== window) {
      parent.postMessage({ protocol: "resources-project-presentation-v1", type: "escape" }, "*");
    }
  });
}

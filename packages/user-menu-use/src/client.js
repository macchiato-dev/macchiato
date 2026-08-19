const menuSelector = "details.edge-user-menu";

function closeMenus(except = null) {
  for (const menu of document.querySelectorAll(`${menuSelector}[open]`)) {
    if (menu !== except) menu.removeAttribute("open");
  }
}

document.addEventListener("click", (event) => {
  const menu = event.target.closest(menuSelector);
  if (!menu) closeMenus();
  else if (event.target.closest("summary")) closeMenus(menu);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = document.querySelector(`${menuSelector}[open]`);
  if (!open) return;
  open.removeAttribute("open");
  open.querySelector("summary")?.focus();
});

document.addEventListener("change", (event) => {
  const select = event.target.closest?.("select[data-language-select]");
  if (select?.form) select.form.requestSubmit();
});

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/g, "");
}

for (const source of document.querySelectorAll("[data-slug-source]")) {
  const slug = document.getElementById(source.dataset.slugSource);
  const error = document.getElementById(slug?.getAttribute("aria-describedby"));
  if (!slug || !error) continue;
  let generated = slug.value === "";
  let touched = false;
  function validate() {
    const invalid = slug.value !== "" && !slugPattern.test(slug.value);
    slug.setCustomValidity(invalid ? error.dataset.message : "");
    slug.setAttribute("aria-invalid", invalid ? "true" : "false");
    error.hidden = !invalid || !touched;
  }
  source.addEventListener("input", () => {
    if (!generated) return;
    slug.value = slugify(source.value);
    validate();
  });
  slug.addEventListener("input", (event) => {
    if (event.isTrusted) generated = slug.value === slugify(source.value);
    touched = true;
    validate();
  });
  slug.addEventListener("blur", () => { touched = true; validate(); });
}

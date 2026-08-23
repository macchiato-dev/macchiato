const root = document.querySelector("[data-public-projects]");

if (root) {
  fetch("/api/public-projects", {
    headers: { accept: "application/json" },
    credentials: "same-origin",
  }).then((response) => {
    if (!response.ok) throw new Error(`Public projects response: ${response.status}`);
    return response.json();
  }).then((projects) => {
    if (!Array.isArray(projects) || !projects.length) return;
    const grid = document.createElement("div");
    grid.className = "account-grid";
    for (const project of projects) {
      if (!project || typeof project.namespace !== "string" || typeof project.slug !== "string") continue;
      const link = document.createElement("a");
      link.className = "account-card";
      link.dataset.projectLink = "";
      link.href = `/${encodeURIComponent(project.namespace)}/${encodeURIComponent(project.slug)}`;
      const title = document.createElement("h3");
      title.textContent = String(project.name || project.slug);
      const namespace = document.createElement("span");
      namespace.className = "account-card__namespace";
      namespace.textContent = `${project.namespace}/${project.slug}`;
      const description = document.createElement("p");
      description.textContent = String(project.description || `${String(project.template || "project").toUpperCase()} project`);
      link.append(title, namespace, description);
      grid.append(link);
    }
    if (grid.childElementCount) root.replaceChildren(grid);
  }).catch(() => {});
}

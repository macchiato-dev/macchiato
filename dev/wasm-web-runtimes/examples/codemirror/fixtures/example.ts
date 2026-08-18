type Project = {
  name: string;
  files: string[];
  sandboxed: boolean;
};

const projects: Project[] = [
  { name: "Article", files: ["index.html", "style.css"], sandboxed: true },
  { name: "Clock", files: ["index.html", "clock.js"], sandboxed: true },
];

export function projectSummary(project: Project): string {
  const mode = project.sandboxed ? "sandboxed" : "trusted";
  return `${project.name}: ${project.files.length} files, ${mode}`;
}

for (const project of projects) {
  console.log(projectSummary(project));
}

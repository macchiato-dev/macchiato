import { mountElementUse } from "/-/element-use/controller.js";
import { elementUseExampleSources as sourceFiles } from "/manifest.js";
const nav = document.querySelector("nav"),
  code = document.querySelector("#source");
for (const path of sourceFiles) {
  const button = document.createElement("button");
  button.textContent = path.split("/").at(-1);
  button.title = path;
  button.addEventListener("click", async () => {
    nav.querySelectorAll("button").forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button))
    );
    code.textContent = await fetch(`/source/${path}`).then((response) =>
      response.text()
    );
  });
  nav.append(button);
}
nav.firstElementChild.click();

const project = await fetch("/project.json").then((response) =>
  response.json()
);
mountElementUse({
  root: document.querySelector("#game"),
  runnerUrl: "/-/element-use/runner.html",
  project,
  onStatus(event) {
    document.querySelector("#state").textContent = event.type === "mounted"
      ? "QuickJS · ready"
      : event.type;
    if (event.type === "blocked") {
      document.querySelector("#error").textContent = event.message;
    }
  },
});

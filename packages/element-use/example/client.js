import { elementUseExampleSources as sourceFiles } from "/manifest.js";

const navigation = document.querySelector("nav");
const code = document.querySelector("#source");
for (const path of sourceFiles) {
  const button = document.createElement("button");
  button.textContent = path.split("/").at(-1);
  button.title = path;
  button.addEventListener("click", async () => {
    for (const item of navigation.querySelectorAll("button")) {
      item.setAttribute("aria-pressed", String(item === button));
    }
    code.textContent = await fetch(`/source/${path}`).then((response) =>
      response.text()
    );
  });
  navigation.append(button);
}
navigation.firstElementChild.click();

// Iframe containment belongs to this example, not to element-use.
const frame = document.createElement("iframe");
frame.title = "Classic Mahjong Solitaire";
frame.sandbox = "allow-scripts";
frame.referrerPolicy = "no-referrer";
frame.src = "/frame.html";
document.querySelector("#game").append(frame);

const project = fetch("/project.json").then((response) => response.json());
addEventListener("message", async (event) => {
  if (
    event.source !== frame.contentWindow ||
    event.data?.protocol !== "element-use-example-v1"
  ) return;
  if (event.data.type === "ready") {
    frame.contentWindow.postMessage({
      protocol: "element-use-example-v1",
      type: "mount",
      project: await project,
    }, "*");
    return;
  }
  document.querySelector("#state").textContent = event.data.type === "mounted"
    ? "QuickJS · ready"
    : event.data.type;
  if (event.data.type === "blocked") {
    document.querySelector("#error").textContent = event.data.message;
  }
});

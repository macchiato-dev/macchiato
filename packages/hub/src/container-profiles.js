export const CONTAINER_PROFILES = Object.freeze({
  "single-file-web-app": Object.freeze({
    label: "Single-file HTML/CSS/JS",
    runtime: Object.freeze({
      container: "single-file-html-runtime",
      input: "index.html",
      scripts: "quickjs",
    }),
    display: Object.freeze({
      container: "single-file-web-surface",
      dom: "dom-use",
      css: "style-use",
    }),
  }),
});

export function containerProfile(name) {
  return CONTAINER_PROFILES[name] || null;
}

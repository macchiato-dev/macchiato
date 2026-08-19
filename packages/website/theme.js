import { defineTheme, mergeTheme, renderThemeCss } from "@macchiato-dev/theme-use";

export const RESOURCES_THEME_TOKENS = Object.freeze([
  "--bg", "--bg-color", "--card", "--card-border", "--shadow", "--text", "--muted", "--accent",
  "--hover", "--pop-bg", "--active-bg", "--active-fg", "--track", "--track-border",
  "--ghost", "--thumb", "--thumb-ic",
]);

const defaults = Object.freeze({
  dark: {
    "--bg-color": "#1a1aa2",
    "--bg": "radial-gradient(1150px 820px at 86% -14%, #6a5bff 0%, rgba(106,91,255,0) 54%), radial-gradient(1000px 860px at -8% 110%, rgba(40,80,255,0.5) 0%, rgba(40,80,255,0) 60%), linear-gradient(152deg, #1a1aa2 0%, #2626d8 52%, #16168e 100%)",
    "--card": "rgba(9,15,42,0.52)", "--card-border": "rgba(255,255,255,0.12)", "--shadow": "0 12px 28px rgba(2,6,28,0.24)",
    "--text": "#eef2ff", "--muted": "#aeb9e8", "--accent": "#30d5c8", "--hover": "rgba(255,255,255,0.07)",
    "--pop-bg": "#0c1230", "--active-bg": "#2f5bff", "--active-fg": "#ffffff", "--track": "rgba(255,255,255,0.10)",
    "--track-border": "rgba(255,255,255,0.16)", "--ghost": "rgba(255,255,255,0.55)", "--thumb": "#f3f6ff", "--thumb-ic": "#0e1b46",
  },
  light: {
    "--bg-color": "#e7ecff",
    "--bg": "radial-gradient(1000px 720px at 84% -12%, #cdd9ff 0%, rgba(205,217,255,0) 55%), linear-gradient(155deg, #eef1ff 0%, #dae2ff 100%)",
    "--card": "rgba(255,255,255,0.66)", "--card-border": "rgba(20,40,130,0.10)", "--shadow": "0 12px 28px rgba(30,50,140,0.14)",
    "--text": "#0c1330", "--muted": "#5a679f", "--accent": "#1233f0", "--hover": "rgba(18,38,150,0.06)",
    "--pop-bg": "#ffffff", "--active-bg": "#1233f0", "--active-fg": "#ffffff", "--track": "rgba(18,38,150,0.08)",
    "--track-border": "rgba(18,38,150,0.14)", "--ghost": "rgba(18,38,150,0.45)", "--thumb": "#1233f0", "--thumb-ic": "#ffffff",
  },
});

export const RESOURCES_EXPERIMENTAL_THEME = Object.freeze({
  dark: Object.freeze({ "--accent": "#ffb86b", "--active-bg": "#7c3aed" }),
  light: Object.freeze({ "--accent": "#7c3aed", "--active-bg": "#7c3aed" }),
});

const options = { allowedTokens: RESOURCES_THEME_TOKENS };
const dark = defineTheme({ name: "resources-dark", selector: 'html[data-theme="dark"]', tokens: defaults.dark }, options);
const light = defineTheme({ name: "resources-light", selector: 'html[data-theme="light"]', tokens: defaults.light }, options);
const fallback = defineTheme({ name: "resources-fallback", selector: "html:not([data-theme])", tokens: defaults.dark }, options);

export function createResourcesTheme(overrides = {}) {
  return Object.freeze({
    dark: mergeTheme(dark, overrides.dark || {}, options),
    light: mergeTheme(light, overrides.light || {}, options),
    fallback: mergeTheme(fallback, overrides.fallback || overrides.dark || {}, options),
  });
}

export function resourcesThemeCss(overrides = {}) {
  const theme = createResourcesTheme(overrides);
  return renderThemeCss([theme.dark, theme.light, theme.fallback]);
}

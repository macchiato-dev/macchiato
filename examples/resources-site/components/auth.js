export const RESOURCES_AUTH = Object.freeze({
  defaultState: "in",
  storageKey: "resources-auth-state-v1",
  mode: "simulated-provider-adapter",
  providers: Object.freeze([
    Object.freeze({ key: "github", label: "GitHub", mark: "GH", enabledAtEdge: true }),
    Object.freeze({ key: "gitlab", label: "GitLab", mark: "GL", enabledAtEdge: true }),
    Object.freeze({ key: "google", label: "Google", mark: "G", enabledAtEdge: false }),
    Object.freeze({ key: "apple", label: "Apple", mark: "A", enabledAtEdge: false }),
  ]),
});

export function resourcesAuthRoute(mode) {
  const signup = mode === "signup";
  return {
    navKey: "",
    title: `${signup ? "Sign up" : "Log in"} - Resources.co`,
    crumb: [{ icon: true, href: "/" }, { label: signup ? "Sign up" : "Log in" }],
    blocks: [{ type: "auth", mode }],
  };
}

function providerControl(provider, documentRuntime) {
  const content = `<span class="auth-provider__mark auth-provider__mark--${provider.key}">${provider.mark}</span><span>Continue with ${provider.label}</span>`;
  if (documentRuntime && provider.enabledAtEdge) {
    return `<a class="auth-provider auth-provider--${provider.key}" href="/auth/${provider.key}/start">${content}</a>`;
  }
  if (documentRuntime) {
    return `<div class="auth-provider auth-provider--disabled">${content}<span class="auth-provider__soon">Soon</span></div>`;
  }
  return `<button class="auth-provider auth-provider--${provider.key}" type="button">${content}</button>`;
}

export function renderResourcesAuthBlock(mode, { documentRuntime = false } = {}) {
  const signup = mode === "signup";
  const providers = RESOURCES_AUTH.providers.map((provider) => providerControl(provider, documentRuntime)).join("");
  const alternate = signup ? 'Already have an account? <a href="/login">Log in</a>' : 'New to Resources.co? <a href="/signup">Create an account</a>';
  return `<section class="box block auth-card">
    <div class="auth-eyebrow">${signup ? "Join Resources.co" : "Welcome back"}</div>
    <h1>${signup ? "Create your account" : "Log in to Resources.co"}</h1>
    <p>${signup ? "Use a provider you already have. We'll set up your namespace on first sign-in." : "Continue with the provider you used to sign up."}</p>
    <div class="auth-providers">${providers}</div>
    <div class="auth-legal">By continuing you agree to our <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a>.</div>
    <div class="auth-divider"><span>secured by OAuth</span></div>
    <div class="auth-alt">${alternate}</div>
    <div class="auth-note"><span class="auth-note__icon">i</span><span>${documentRuntime ? "GitHub and GitLab create a real Resources.co session." : "Local architecture preview — provider authorization is simulated."}</span></div>
  </section>`;
}

export function composeResourcesAuthDomSchema(schema) {
  const composed = structuredClone(schema);
  composed.definitions["auth-card"] = {
    element: "section.box.block.auth-card",
    attrs: ["class"],
    children: ["div", "h1", "p"],
  };
  composed.definitions["content-root"].children[0].oneOf.push("$auth-card");
  return composed;
}

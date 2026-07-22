export const RESOURCES_AUTH = Object.freeze({
  defaultState: "in",
  storageKey: "resources-auth-state-v1",
  mode: "simulated-provider-adapter",
  providers: Object.freeze([
    Object.freeze({ key: "github", label: "GitHub" }),
    Object.freeze({ key: "gitlab", label: "GitLab" }),
    Object.freeze({ key: "google", label: "Google" }),
    Object.freeze({ key: "apple", label: "Apple" }),
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

export function renderResourcesAuthBlock(mode) {
  const signup = mode === "signup";
  const buttons = RESOURCES_AUTH.providers.map((provider) => `<button class="auth-provider auth-provider--${provider.key}">Continue with ${provider.label}</button>`).join("");
  return `<section class="box block auth-card">
    <div class="auth-eyebrow">${signup ? "Join Resources.co" : "Welcome back"}</div>
    <h1>${signup ? "Create your account" : "Log in to Resources.co"}</h1>
    <p>${signup ? "Use a provider you already have. We'll set up your namespace on first sign-in." : "Continue with the provider you used to sign up."}</p>
    <div class="auth-providers">${buttons}</div>
    <div class="auth-alt">${signup ? 'Already have an account? <a href="/login">Log in</a>' : 'New to Resources.co? <a href="/signup">Create an account</a>'}</div>
    <div class="auth-note">Local architecture preview only — provider authorization is simulated and no account is created.</div>
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

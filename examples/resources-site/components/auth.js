export const RESOURCES_AUTH = Object.freeze({
  defaultState: "in",
  storageKey: "resources-auth-state-v1",
  mode: "simulated-provider-adapter",
  showUnavailableProviders: false,
  providers: Object.freeze([
    Object.freeze({ key: "github", label: "GitHub", mark: "GH", icon: "github", enabledAtEdge: true }),
    Object.freeze({ key: "gitlab", label: "GitLab", mark: "GL", icon: "gitlab", enabledAtEdge: true }),
    Object.freeze({ key: "google", label: "Google", mark: "G", enabledAtEdge: false }),
    Object.freeze({ key: "apple", label: "Apple", mark: "A", enabledAtEdge: false }),
  ]),
});

const PROVIDER_ICONS = Object.freeze({
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>',
  gitlab: '<svg viewBox="0 0 24 24"><path fill="#E24329" d="M12 21.42 15.31 11.2H8.69L12 21.42z"></path><path fill="#FC6D26" d="M12 21.42 8.69 11.2H4.05L12 21.42z"></path><path fill="#FCA326" d="M4.05 11.2 3.04 14.3a.69.69 0 0 0 .25.77L12 21.42 4.05 11.2z"></path><path fill="#E24329" d="M4.05 11.2h4.64L6.69 5.06a.35.35 0 0 0-.67 0L4.05 11.2z"></path><path fill="#FC6D26" d="M12 21.42 15.31 11.2h4.64L12 21.42z"></path><path fill="#FCA326" d="M19.95 11.2l1.01 3.1a.69.69 0 0 1-.25.77L12 21.42l7.95-10.22z"></path><path fill="#E24329" d="M19.95 11.2h-4.64l2-6.14a.35.35 0 0 1 .67 0l1.97 6.14z"></path></svg>',
});

export function resourcesAuthRoute(mode, messages = {}) {
  const signup = mode === "signup";
  return {
    navKey: "",
    title: messages[signup ? "signupTitle" : "loginTitle"] || `${signup ? "Sign up" : "Log in"} - Resources.co`,
    crumb: [{ icon: true, href: "/" }, { label: messages[signup ? "signup" : "login"] || (signup ? "Sign up" : "Log in") }],
    blocks: [{ type: "auth", mode }],
  };
}

function providerControl(provider, documentRuntime, messages) {
  const mark = PROVIDER_ICONS[provider.icon] || provider.mark;
  const label = (messages.continueWith || "Continue with {provider}").replace("{provider}", provider.label);
  const content = `<span class="auth-provider__mark auth-provider__mark--${provider.key}">${mark}</span><span>${label}</span>`;
  if (documentRuntime && provider.enabledAtEdge) {
    return `<a class="auth-provider auth-provider--${provider.key}" href="/auth/${provider.key}/start">${content}</a>`;
  }
  if (documentRuntime) {
    return `<div class="auth-provider auth-provider--disabled">${content}<span class="auth-provider__soon">Soon</span></div>`;
  }
  return `<button class="auth-provider auth-provider--${provider.key}" type="button">${content}</button>`;
}

export function renderResourcesAuthBlock(mode, {
  documentRuntime = false,
  showUnavailableProviders = RESOURCES_AUTH.showUnavailableProviders,
  messages = {},
} = {}) {
  const signup = mode === "signup";
  const providers = RESOURCES_AUTH.providers
    .filter((provider) => !documentRuntime || provider.enabledAtEdge || showUnavailableProviders)
    .map((provider) => providerControl(provider, documentRuntime, messages))
    .join("");
  const alternate = signup
    ? `${messages.hasAccount || "Already have an account?"} <a href="/login">${messages.login || "Log in"}</a>`
    : `${messages.new || "New to Resources.co?"} <a href="/signup">${messages.createAccount || "Create an account"}</a>`;
  return `<section class="box block auth-card">
    <div class="auth-eyebrow">${signup ? (messages.join || "Join Resources.co") : (messages.welcome || "Welcome back")}</div>
    <h1>${signup ? (messages.createHeading || "Create your account") : (messages.loginHeading || "Log in to Resources.co")}</h1>
    <p>${signup ? (messages.createIntro || "Use a provider you already have. We'll set up your namespace on first sign-in.") : (messages.loginIntro || "Continue with the provider you used to sign up.")}</p>
    <div class="auth-providers">${providers}</div>
    <div class="auth-legal">${messages.termsPrefix || "By continuing you agree to our"} <a href="/terms">${messages.termsOfUse || "Terms of Use"}</a> ${messages.and || "and"} <a href="/privacy">${messages.privacy || "Privacy Policy"}</a>.</div>
    <div class="auth-divider"><span>${messages.oauth || "secured by OAuth"}</span></div>
    <div class="auth-alt">${alternate}</div>
    <div class="auth-note"><span class="auth-note__icon">i</span><span>${documentRuntime ? (messages.realSession || "GitHub and GitLab create a real Resources.co session.") : "Local architecture preview — provider authorization is simulated."}</span></div>
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

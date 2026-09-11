import { NAMESPACE_NAME } from "../hub/src/names.js";

const accountPaths = new Set(["/", "/projects", "/projects/new",
  "/organizations/new", "/profile"]);
const discoverableNamespaces = ["benatkin", "resources", "macchiato"];
const tryTemplates = new Set(["article", "hello", "clock", "mark", "chart", "ball",
  "stars", "blank", "slides"]);

// Static filenames and malformed route segments are not namespace lookups.
// Keep the stores' case-insensitive name matching, without making them handle
// validation errors for paths that simply have no dynamic route.
function routeName(value) {
  return value.length <= 63 && NAMESPACE_NAME.test(value.toLowerCase());
}

function projectRoute(pathname) {
  try {
    const match = /^\/([^/]+)\/([^/]+)(?:\/(embed))?$/.exec(decodeURIComponent(pathname));
    return match && routeName(match[1]) && routeName(match[2])
      ? { namespace: match[1], slug: match[2], embed: match[3] === "embed" } : null;
  } catch {
    return null;
  }
}

function namespaceRoute(pathname) {
  try {
    const match = /^\/([^/]+)$/.exec(decodeURIComponent(pathname));
    return match && routeName(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

export function createResourcesDocumentPlanner({ accounts, content, organizations }) {
  if (!accounts || !content || !organizations) {
    throw new TypeError("Document planner requires application stores");
  }
  return async function planDocument(input) {
    if (!input || typeof input !== "object" || typeof input.pathname !== "string") {
      throw new TypeError("Document plan input is invalid");
    }
    if (input.routeOnly === true) {
      const direct = /^\/try\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(input.pathname)?.[1] || "";
      if (direct) return tryTemplates.has(direct)
        ? { directTryTemplate: direct } : { notFound: true };
      if ((input.method === "GET" || input.method === "HEAD") &&
          input.pathname === "/try" && typeof input.template === "string") {
        return tryTemplates.has(input.template)
          ? { redirect: `/try/${input.template}` } : { notFound: true };
      }
      return { directTryTemplate: "" };
    }
    const directTryTemplate = typeof input.directTryTemplate === "string"
      ? input.directTryTemplate : "";
    const session = input.session && typeof input.session.sub === "string" ? input.session : null;
    const accountShellPath = directTryTemplate ? "/try"
      : ((input.pathname === "/" && session) || input.pathname === "/profile"
        ? "/dashboard" : input.pathname);
    if (input.shellOnly === true) return { accountShellPath };
    if (input.publicApi === true) {
      return { publicProjects: await content.listPublicProjects({
        limit: 6, namespaces: discoverableNamespaces,
      }) };
    }
    const pathname = input.pathname;
    const requestedProject = directTryTemplate ? null : projectRoute(pathname);
    const requestedNamespace = requestedProject ? null : namespaceRoute(pathname);
    const dynamicProject = requestedProject
      ? await content.getProject(requestedProject.namespace, requestedProject.slug, session?.sub)
      : null;
    const projectOwner = Boolean(dynamicProject && session &&
      dynamicProject.ownerUserId === session.sub);
    const dynamicNamespace = !input.staticShellExists && requestedNamespace
      ? await content.getNamespace(requestedNamespace, session?.sub)
      : null;
    const managedOrganization = dynamicNamespace?.kind === "organization" && session
      ? await organizations.getManagedOrganization(dynamicNamespace.namespace, session.sub)
      : null;
    const accountContent = projectOwner || session && accountPaths.has(pathname)
      ? await content.listForUser(session.sub) : null;
    const account = session && pathname === "/profile"
      ? await accounts.getAccount(session.sub) : null;
    const publicProjects = (pathname === "/" && !session) || pathname === "/browse"
      ? await content.listPublicProjects({ limit: pathname === "/" ? 6 : 48,
        namespaces: discoverableNamespaces }) : null;
    const notifications = session ? await organizations.listNotifications(session.sub) : [];
    let kind = "static";
    if (dynamicProject) kind = "project";
    else if (dynamicNamespace) kind = managedOrganization ? "managed-organization" : "namespace";
    else if (pathname === "/try" || directTryTemplate) kind = "try";
    else if (session && accountPaths.has(pathname)) {
      kind = pathname === "/" ? "dashboard" : pathname === "/projects" ? "projects"
        : pathname === "/projects/new" ? "project-form"
        : pathname === "/organizations/new" ? "organization-form" : "profile";
    }
    const csrfActions = [];
    if (projectOwner) csrfActions.push(`project:${dynamicProject.id}`);
    else if (managedOrganization) csrfActions.push(`organization:${managedOrganization.slug}`);
    else if (session && kind === "project-form") csrfActions.push("/projects");
    else if (session && kind === "organization-form") csrfActions.push("/organizations");
    else if (session && kind === "profile") csrfActions.push("profile");
    if (session) csrfActions.push("notifications");
    return {
      requestedProject, dynamicProject, projectOwner, dynamicNamespace,
      managedOrganization, accountContent, account, publicProjects, notifications,
      kind, csrfActions, accountShellPath,
      shellPath: dynamicProject || dynamicNamespace ? "/dashboard" : accountShellPath,
      focused: Boolean(dynamicProject) || pathname === "/projects/new" ||
        pathname === "/try" || Boolean(directTryTemplate),
    };
  };
}

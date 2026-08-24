const accountPaths = new Set(["/", "/projects", "/projects/new",
  "/organizations/new", "/profile"]);
const discoverableNamespaces = ["benatkin", "resources", "macchiato"];

function projectRoute(pathname) {
  try {
    const match = /^\/([^/]+)\/([^/]+)(?:\/(embed))?$/.exec(decodeURIComponent(pathname));
    return match ? { namespace: match[1], slug: match[2], embed: match[3] === "embed" } : null;
  } catch {
    return null;
  }
}

function namespaceRoute(pathname) {
  try {
    const match = /^\/([^/]+)$/.exec(decodeURIComponent(pathname));
    return match ? match[1] : null;
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
    if (input.publicApi === true) {
      return { publicProjects: await content.listPublicProjects({
        limit: 6, namespaces: discoverableNamespaces,
      }) };
    }
    const pathname = input.pathname;
    const session = input.session && typeof input.session.sub === "string" ? input.session : null;
    const requestedProject = projectRoute(pathname);
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
    return {
      requestedProject, dynamicProject, projectOwner, dynamicNamespace,
      managedOrganization, accountContent, account, publicProjects, notifications,
    };
  };
}

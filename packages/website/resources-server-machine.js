import { ACCOUNT_QUERIES } from "@macchiato-dev/hub/accounts";
import { ContentConflictError, CONTENT_QUERIES,
  ContentValidationError } from "@macchiato-dev/hub/content";
import { ORGANIZATION_QUERIES } from "@macchiato-dev/hub/organizations";
import { readSession, refreshedSessionCookie, signOut } from "./auth/github.js";
import { unseal } from "./auth/session.js";
import { ServerMachineController } from "../server-use/src/machine-controller.js";
import { ServerUse } from "../server-use/src/index.js";
import { SqlUse } from "../sql-use/src/index.js";
import { validateProjectUrlPatterns } from "./project-snapshot-validation.js";

const projectSnapshotPath = /^\/api\/projects\/([A-Za-z0-9-]+)\/snapshot$/;
const projectRestorePath = /^\/api\/projects\/([A-Za-z0-9-]+)\/restore\/([1-9][0-9]*)$/;
const projectVersionsPath = /^\/api\/projects\/([A-Za-z0-9-]+)\/versions$/;
const projectVersionPath = /^\/api\/projects\/([A-Za-z0-9-]+)\/versions\/([1-9][0-9]*)$/;
const projectWorkspacePath = /^\/-\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/workspace$/;
const notificationPath = /^\/notifications\/([A-Za-z0-9-]+)$/;
const organizationInvitationPath = /^\/organizations\/([a-z0-9-]+)\/invitations$/;
const organizationMemberPath = /^\/organizations\/([a-z0-9-]+)\/members\/([A-Za-z0-9-]+)$/;
const projectActionPath = /^\/projects\/([A-Za-z0-9-]+)$/;
const projectResponseMarker = "\u001eproject-response";
const documentResponseMarker = "\u001edocument-response";
const maximumProjectRequestBytes = 72 * 1024 * 1024;
const maximumProjectTransportBytes = 128 * 1024 * 1024;
const maximumProjectFormBytes = 70 * 1024 * 1024;
const documentResponseHeaders = ["allow", "cache-control", "content-language",
  "content-security-policy", "content-type", "cross-origin-opener-policy",
  "cross-origin-resource-policy", "location", "permissions-policy", "referrer-policy",
  "set-cookie", "vary", "x-content-type-options", "x-frame-options"];
const documentMethods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

export function isResourcesServerMachineRequest(request) {
  return documentMethods.includes(request.method);
}

async function readProjectForm(resource) {
  if (!resource) throw new Error("project form body is not available");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await resource.read(64 * 1024);
      if (!chunk.length) break;
      total += chunk.length;
      if (total > maximumProjectFormBytes) {
        return { error: [false, "form", "form is too large"] };
      }
      parts.push(decoder.decode(chunk, { stream: true }));
    }
    parts.push(decoder.decode());
  } catch (error) {
    if (String(error?.message || error).includes("byte limit")) throw error;
    return { error: [false, "form", "invalid form encoding"] };
  }
  const form = new URLSearchParams(parts.join(""));
  let snapshot;
  if (form.has("snapshot")) {
    try {
      snapshot = JSON.parse(form.get("snapshot") || "{}");
      validateProjectUrlPatterns(snapshot);
    } catch (error) {
      if (error instanceof ContentValidationError) {
        return { error: [false, error.field || "snapshot", error.message] };
      }
      return { error: [false, "snapshot", "project snapshot is invalid"] };
    }
  }
  return {
    snapshot,
    values: ["intent", "csrf", "name", "slug", "description", "namespace", "template",
      "visibility", "versionTitle"].map(name => String(form.get(name) || "")),
  };
}

async function readProjectJson(resource) {
  if (!resource) throw new Error("project request body is not available");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await resource.read(64 * 1024);
      if (!chunk.length) break;
      total += chunk.length;
      if (total > maximumProjectRequestBytes) {
        return { error: [false, "request_size", "project update is too large"] };
      }
      parts.push(decoder.decode(chunk, { stream: true }));
    }
    parts.push(decoder.decode());
  } catch (error) {
    if (String(error?.message || error).includes("byte limit")) throw error;
    return { error: [false, "request_json", "request body is not valid JSON"] };
  }
  try {
    return { value: JSON.parse(parts.join("")) };
  } catch {
    return { error: [false, "request_json", "request body is not valid JSON"] };
  }
}

function projectValidationResult(error) {
  if (error instanceof ContentValidationError) {
    return [false, error.field || "invalid", error.message];
  }
  if (error instanceof ContentConflictError) {
    return [false, error.code || "form", error.message];
  }
  throw error;
}

function refererPath(value, origin) {
  try { return value ? new URL(value, origin).pathname : "/projects"; }
  catch { return "/projects"; }
}

export function createResourcesServerMachine(module, {
  databaseClient, readDatabaseClient = databaseClient, authConfig, contentStore = null,
  now = Date.now,
}) {
  const sql = new SqlUse({ read: readDatabaseClient, write: databaseClient, operations: {
    "system.ready": { kind: "read", sql: "SELECT 1 AS ready", maxRows: 1 },
    "account.organization-slug-exists": {
      kind: "read", sql: ACCOUNT_QUERIES.organizationSlugExists,
      parameters: ["username"], maxRows: 1,
    },
    "account.update-username": {
      kind: "write", sql: ACCOUNT_QUERIES.updateUsername,
      parameters: ["username", "updated-at", "user-id"],
    },
    "account.update-project-namespace": {
      kind: "write", sql: ACCOUNT_QUERIES.updateUserProjectNamespace,
      parameters: ["username", "updated-at", "user-id"],
    },
    "account.get": {
      kind: "read", sql: ACCOUNT_QUERIES.accountById,
      parameters: ["user-id"], maxRows: 1,
    },
    "content.username-exists": {
      kind: "read", sql: CONTENT_QUERIES.usernameExists,
      parameters: ["slug"], maxRows: 1,
    },
    "content.insert-organization": {
      kind: "write", sql: CONTENT_QUERIES.insertOrganization,
      parameters: ["id", "owner-user-id", "slug", "name", "description", "created-at", "updated-at"],
    },
    "content.versions": {
      kind: "read", sql: CONTENT_QUERIES.versions,
      parameters: ["project-id", "user-id"], maxRows: 1_000,
    },
    "content.latest-version": {
      kind: "read", sql: CONTENT_QUERIES.latestVersion,
      parameters: ["project-id", "user-id"], maxRows: 1,
    },
    "content.version-patches": {
      kind: "read", sql: CONTENT_QUERIES.versionPatches,
      parameters: ["project-id", "user-id", "sequence"], maxRows: 1_000,
    },
    "organization.mark-notification-read": {
      kind: "write", sql: ORGANIZATION_QUERIES.markNotificationRead,
      parameters: ["now", "notification-id", "user-id"],
    },
    "organization.delete-pending-invitation": {
      kind: "write", sql: ORGANIZATION_QUERIES.deletePendingInvitation,
      parameters: ["notification-id", "user-id"],
    },
    "organization.delete-notification": {
      kind: "write", sql: ORGANIZATION_QUERIES.deleteNotification,
      parameters: ["notification-id", "user-id"],
    },
    "organization.invitation": {
      kind: "read", sql: ORGANIZATION_QUERIES.invitation,
      parameters: ["notification-id", "user-id"], maxRows: 1,
    },
    "organization.insert-member": {
      kind: "write", sql: ORGANIZATION_QUERIES.insertMember,
      parameters: ["organization-id", "user-id", "role", "created-at", "updated-at"],
    },
    "organization.accept-invitation": {
      kind: "write", sql: ORGANIZATION_QUERIES.acceptInvitation,
      parameters: ["updated-at", "invitation-id"],
    },
    "organization.managed": {
      kind: "read", sql: ORGANIZATION_QUERIES.managedOrganization,
      parameters: ["viewer-a", "viewer-b", "slug", "viewer-c"], maxRows: 1,
    },
    "organization.user-by-username": {
      kind: "read", sql: ORGANIZATION_QUERIES.userByUsername,
      parameters: ["username"], maxRows: 1,
    },
    "organization.existing-member": {
      kind: "read", sql: ORGANIZATION_QUERIES.existingMember,
      parameters: ["organization-id", "user-id"], maxRows: 1,
    },
    "organization.existing-admin": {
      kind: "read", sql: ORGANIZATION_QUERIES.existingAdmin,
      parameters: ["organization-id"], maxRows: 1,
    },
    "organization.insert-invitation": {
      kind: "write", sql: ORGANIZATION_QUERIES.insertInvitation,
      parameters: ["id", "organization-id", "inviter-id", "invitee-id", "role", "created-at", "updated-at"],
    },
    "organization.insert-notification": {
      kind: "write", sql: ORGANIZATION_QUERIES.insertNotification,
      parameters: ["id", "user-id", "invitation-id", "created-at"],
    },
    "organization.change-role": {
      kind: "write", sql: ORGANIZATION_QUERIES.changeRole,
      parameters: ["role", "updated-at", "organization-id", "user-id"],
    },
  } });
  const controller = new ServerMachineController(module, { devices: {
    random: async (operation, input) => {
      if (operation !== "uuid" || !Array.isArray(input) || input.length) {
        throw new Error("random operation is not available");
      }
      return crypto.randomUUID();
    },
    session: async (operation, input) => {
      if (operation === "sign-out" && Array.isArray(input) && !input.length) {
        return signOut(authConfig).headers.get("set-cookie") || "";
      }
      if (operation === "refresh-username" && Array.isArray(input) && input.length === 3) {
        const previous = authConfig && await readSession(new Request(authConfig.publicOrigin, {
          headers: { cookie: String(input[0] || "") },
        }), authConfig, now);
        if (!previous || String(previous.sub) !== String(input[1])) {
          throw new Error("session is not available");
        }
        return refreshedSessionCookie({ id: String(input[1]), login: String(input[2]),
          name: String(previous.name || "") }, previous, authConfig, now);
      }
      if (operation !== "current" || !Array.isArray(input) || input.length !== 1) {
        if (operation === "csrf" && Array.isArray(input) && input.length === 3) {
          const token = authConfig && await unseal(String(input[0] || ""), authConfig.sessionSecret);
          return Boolean(token?.v === 1 && token.sub === String(input[1]) &&
            token.action === String(input[2]) && token.exp >= now());
        }
        throw new Error("session operation is not available");
      }
      const session = authConfig && await readSession(new Request(authConfig.publicOrigin, {
        headers: { cookie: String(input[0] || "") },
      }), authConfig, now);
      return session ? [String(session.sub), String(session.login || "")] : null;
    },
    sql: async (operation, input) => {
      if (operation === "system.ready") {
        const result = await sql.call(operation);
        return result.rows.map(row => [row.ready]);
      }
      if (operation === "content.versions") {
        const result = await sql.callValues(operation, input);
        return result.rows.map(row => [
          Number(row.sequence), String(row.reason), Number(row.created_at), String(row.title || ""),
          row.saved_at == null ? null : Number(row.saved_at), Boolean(row.latest),
        ]);
      }
      if (operation === "account.organization-slug-exists") {
        const result = await sql.callValues(operation, input);
        return result.rows.length ? [1] : [];
      }
      if (operation === "content.username-exists") {
        const result = await sql.callValues(operation, input);
        return result.rows.length ? [1] : [];
      }
      if (operation === "account.get") {
        const result = await sql.callValues(operation, input);
        return result.rows.map(row => [String(row.id), String(row.display_name),
          String(row.username)]);
      }
      if (operation === "content.latest-version") {
        const result = await sql.callValues(operation, input);
        return result.rows.map(row => [Number(row.last_version_sequence),
          String(row.checkpoint_snapshot_json)]);
      }
      if (operation === "content.version-patches") {
        const result = await sql.callValues(operation, input);
        return result.rows.map(row => [Number(row.sequence), String(row.patch_json)]);
      }
      if (operation === "organization.invitation") {
        const result = await sql.callValues(operation, input);
        return result.rows.map(row => [String(row.invitation_id), String(row.organization_id),
          String(row.role), String(row.status), String(row.slug)]);
      }
      if (operation === "organization.managed") {
        const result = await sql.callValues(operation, input);
        return result.rows.map(row => [String(row.id), String(row.slug),
          String(row.owner_user_id), String(row.viewer_role)]);
      }
      if (operation === "organization.user-by-username") {
        const result = await sql.callValues(operation, input);
        return result.rows.map(row => [String(row.id), String(row.username)]);
      }
      if (operation === "organization.existing-member" || operation === "organization.existing-admin") {
        const result = await sql.callValues(operation, input);
        return result.rows.length ? [1] : [];
      }
      if (operation === "batch") {
        const result = await sql.batchValues(input.map(call => ({ name: call[0], values: call[1] })));
        return result.map(item => Number(item.rowsAffected) || 0);
      }
      if (operation.startsWith("organization.")) {
        const result = await sql.callValues(operation, input);
        return [Number(result.rowsAffected) || 0];
      }
      if (operation === "content.insert-organization") {
        const result = await sql.callValues(operation, input);
        return [Number(result.rowsAffected) || 0];
      }
      throw new Error(`SQL operation ${operation} is not available`);
    },
  } });
  return new ServerUse({
    routes: [
      { name: "health", method: "GET", path: "/health",
        responseHeaders: ["cache-control", "content-type"] },
      { name: "project.versions", method: "GET",
        pathPattern: projectVersionsPath,
        requestHeaders: ["cookie"], responseHeaders: ["cache-control", "content-type"] },
      { name: "project.version", method: "GET",
        pathPattern: projectVersionPath,
        requestHeaders: ["cookie"], responseHeaders: ["cache-control", "content-type"] },
      { name: "project.workspace", method: "GET",
        pathPattern: projectWorkspacePath, maxResponseBytes: maximumProjectRequestBytes,
        requestHeaders: ["cookie"], responseHeaders: ["cache-control", "content-type"] },
      { name: "project.snapshot", method: "POST",
        pathPattern: projectSnapshotPath, requestBody: "resource",
        maxRequestBytes: maximumProjectTransportBytes, maxResponseBytes: maximumProjectRequestBytes,
        requestHeaders: ["cookie", "content-length", "content-type", "origin", "x-resources-csrf"],
        responseHeaders: ["cache-control", "content-type"] },
      { name: "project.restore", method: "POST",
        pathPattern: projectRestorePath, requestBody: "resource",
        maxRequestBytes: maximumProjectTransportBytes, maxResponseBytes: maximumProjectRequestBytes,
        requestHeaders: ["cookie", "content-length", "content-type", "origin", "x-resources-csrf"],
        responseHeaders: ["cache-control", "content-type"] },
      { name: "notification.action", method: "POST", pathPattern: notificationPath,
        requestBody: "text", maxRequestBytes: 16_384,
        requestHeaders: ["cookie", "content-type", "origin"],
        responseHeaders: ["cache-control", "content-type", "location"] },
      { name: "organization.invite", method: "POST", pathPattern: organizationInvitationPath,
        requestBody: "text", maxRequestBytes: 16_384,
        requestHeaders: ["cookie", "content-type", "origin"],
        responseHeaders: ["cache-control", "content-type", "location"] },
      { name: "organization.role", method: "POST", pathPattern: organizationMemberPath,
        requestBody: "text", maxRequestBytes: 16_384,
        requestHeaders: ["cookie", "content-type", "origin"],
        responseHeaders: ["cache-control", "content-type", "location"] },
      { name: "profile.update", method: "POST", path: "/profile",
        requestBody: "text", maxRequestBytes: 16_384,
        requestHeaders: ["cookie", "content-type", "origin"],
        responseHeaders: ["cache-control", "content-type", "location", "set-cookie"] },
      { name: "session.logout", method: "POST", path: "/logout",
        responseHeaders: ["cache-control", "content-type", "location", "set-cookie"] },
      { name: "organization.create", method: "POST", path: "/organizations",
        requestBody: "text", maxRequestBytes: 16_384,
        requestHeaders: ["cookie", "content-type", "origin"],
        responseHeaders: ["cache-control", "content-type", "location"] },
      { name: "project.create", method: "POST", path: "/projects",
        requestBody: "resource", maxRequestBytes: maximumProjectTransportBytes,
        requestHeaders: ["cookie", "content-length", "content-type", "origin", "referer"],
        responseHeaders: ["cache-control", "content-type", "location"] },
      { name: "project.action", method: "POST", pathPattern: projectActionPath,
        requestBody: "resource", maxRequestBytes: maximumProjectTransportBytes,
        requestHeaders: ["cookie", "content-length", "content-type", "origin", "referer"],
        responseHeaders: ["cache-control", "content-type", "location"] },
      ...documentMethods.map(method => ({ name: `document.${method.toLowerCase()}`, method,
        pathPattern: /^\/.*$/, maxResponseBytes: maximumProjectTransportBytes,
        requestHeaders: ["cookie"], responseHeaders: documentResponseHeaders })),
    ],
    dispatch: async ({ route, request, resources, context }) => {
      let projectResponse = null;
      let documentResponse = null;
      const projectApiRoute = route === "project.snapshot" || route === "project.restore";
      const projectFormRoute = route === "project.create" || route === "project.action";
      const projectWorkspaceRoute = route === "project.workspace";
      let projectForm = null;
      const documentRoute = route.startsWith("document.");
      const devices = {
        ...(documentRoute ? { document: async (operation, input) => {
          if (operation !== "handle" || !Array.isArray(input) || input.length ||
              typeof context?.documentHandler !== "function") {
            throw new Error("document operation is not available");
          }
          documentResponse = await context.documentHandler();
          return [documentResponse.status, [...documentResponse.headers.entries()]];
        } } : {}),
        ...(projectApiRoute || projectFormRoute || projectWorkspaceRoute ? {
        project: async (operation, input) => {
          if (!contentStore || !Array.isArray(input)) {
            throw new Error("project capability is not available");
          }
          if (operation === "form") {
            if (input.length) throw new Error("project form input is invalid");
            projectForm ||= await readProjectForm(resources.body);
            return projectForm.error || [true, ...projectForm.values];
          }
          if (projectWorkspaceRoute) {
            if (operation === "lookup" && input.length === 3) {
              const found = await contentStore.getProject(String(input[0]), String(input[1]),
                String(input[2] || "") || null);
              return found ? [true, found.id, found.ownerUserId, found.visibility] : [true, false];
            }
            let workspace;
            if (operation === "workspace-owned" && input.length === 3) {
              workspace = await contentStore.getProjectWorkspace(String(input[0]),
                String(input[1]), String(input[2]));
            } else if (operation === "workspace-public" && input.length === 2) {
              workspace = await contentStore.getPublicProjectWorkspace(String(input[0]),
                String(input[1]));
            } else throw new Error("project workspace operation is not available");
            if (!workspace) return [true, false];
            projectResponse = JSON.stringify({
              snapshot: workspace.snapshot, versionCount: workspace.versionCount,
              updatedAt: workspace.updatedAt,
              hasUnpublishedChanges: Boolean(workspace.hasUnpublishedChanges),
            });
            return [true, true];
          }
          if (input.length < 2) throw new Error("project capability input is invalid");
          const [userId, projectId] = input.map(String);
          try {
            let result;
            if (projectApiRoute) {
              const decoded = await readProjectJson(resources.body);
              if (decoded.error) return decoded.error;
              if (operation === "save" && input.length === 2) {
                validateProjectUrlPatterns(decoded.value?.snapshot);
                result = await contentStore.saveProjectSnapshot(userId, projectId,
                  decoded.value?.snapshot, {
                    reason: decoded.value?.manual ? "manual" : "periodic",
                    destructive: decoded.value?.destructive === true,
                  });
              } else if (operation === "restore" && input.length === 3) {
                result = await contentStore.restoreProjectVersion(userId, projectId,
                  Number(input[2]));
              } else throw new Error("project operation is not available");
              if (!result) return [true, false];
              projectResponse = JSON.stringify(result);
              return [true, true];
            }
            if (!projectForm || projectForm.error) {
              throw new Error("project form has not been parsed");
            }
            const values = projectForm.values;
            const fields = {
              name: values[2], slug: values[3], description: values[4],
              namespace: values[5], template: values[6], visibility: values[7],
            };
            if (operation === "create" && input.length === 2) {
              if (projectForm.snapshot === undefined) {
                throw new ContentValidationError("snapshot", "project snapshot is invalid");
              }
              result = await contentStore.createProject(userId, {
                ...fields, userSlug: projectId, snapshot: projectForm.snapshot,
              });
              return [true, result.namespace, result.slug];
            }
            if (operation === "update" && input.length === 3) {
              result = await contentStore.updateProject(userId, projectId,
                { ...fields, userSlug: String(input[2]) });
              return result ? [true, result.namespace, result.slug] : [true, false];
            }
            if (operation === "save" && input.length === 2) {
              if (projectForm.snapshot === undefined) {
                throw new ContentValidationError("snapshot", "project snapshot is invalid");
              }
              result = await contentStore.saveProjectSnapshot(userId, projectId,
                projectForm.snapshot, { reason: "manual" });
            } else if (operation === "publish" && input.length === 2) {
              result = await contentStore.publishProject(userId, projectId,
                { title: values[8] });
            } else if (operation === "delete" && input.length === 2) {
              result = await contentStore.deleteProject(userId, projectId);
            } else if (operation === "revert" && input.length === 2) {
              result = await contentStore.revertProjectToPublished(userId, projectId);
            } else throw new Error("project operation is not available");
            if (!result) return [true, false];
            return [true, true];
          } catch (error) {
            return projectValidationResult(error);
          }
        },
      } : {}),
      };
      const [status, headerEntries, body] = await controller.request([
        route, request.method, request.path, request.query, request.params,
        request.headers.cookie || "", request.headers["content-type"] || "",
        request.headers.origin || "", request.origin,
        typeof request.body === "string" ? request.body : "", now(),
        request.headers["x-resources-csrf"] || "",
        request.headers["content-length"] || "",
        refererPath(request.headers.referer, request.origin),
      ], { devices });
      if (body === projectResponseMarker) {
        if (projectResponse === null) throw new Error("project response body is not available");
        return { status, headers: Object.fromEntries(headerEntries), body: projectResponse };
      }
      if (body === documentResponseMarker) {
        if (!(documentResponse instanceof Response)) {
          throw new Error("document response is not available");
        }
        const bytes = request.method === "HEAD" || documentResponse.body === null
          ? new Uint8Array()
          : new Uint8Array(await documentResponse.arrayBuffer());
        return { status, headers: Object.fromEntries(headerEntries), body: bytes };
      }
      return { status, headers: Object.fromEntries(headerEntries), body };
    },
  });
}

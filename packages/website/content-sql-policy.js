import { CONTENT_QUERIES, CONTENT_SCHEMA } from "@macchiato-dev/hub/content";
import { ORGANIZATION_SCHEMA } from "@macchiato-dev/hub/organizations";
import { createSqlUseClient } from "../sql-use/src/client.js";

const definitions = [
  ["content.project-by-namespace", "projectByNamespace", "read", 2],
  ["content.owned-workspace", "ownedWorkspace", "read", 3],
  ["content.public-workspace", "publicWorkspace", "read", 2],
  ["content.public-projects", "publicProjects", "read", 3],
  ["content.namespace-identity", "namespaceIdentity", "read", 2],
  ["content.namespace-projects", "namespaceProjects", "read", 2],
  ["content.versions", "versions", "read", 2],
  ["content.latest-version", "latestVersion", "read", 2],
  ["content.version-patches", "versionPatches", "read", 3],
  ["content.organizations-for-user", "organizationsForUser", "read", 2],
  ["content.projects-for-user", "projectsForUser", "read", 1],
  ["content.username-exists", "usernameExists", "read", 1],
  ["content.insert-organization", "insertOrganization", "write", 7],
  ["content.owned-organization", "ownedOrganization", "read", 2],
  ["content.insert-project", "insertProject", "write", 12],
  ["content.insert-state", "insertState", "write", 5],
  ["content.insert-version", "insertVersion", "write", 5],
  ["content.insert-initial-label", "insertInitialLabel", "write", 2],
  ["content.insert-publication", "insertPublication", "write", 3],
  ["content.update-project", "updateProject", "write", 11],
  ["content.project-by-id", "projectById", "read", 1],
  ["content.project-state", "projectState", "read", 2],
  ["content.checkpoint-state", "checkpointState", "write", 4],
  ["content.update-state", "updateState", "write", 6],
  ["content.touch-project", "touchProject", "write", 4],
  ["content.publish", "publish", "write", 6],
  ["content.label-version", "labelVersion", "write", 4],
  ["content.delete-project", "deleteProject", "write", 2],
  ["content.published-snapshot", "publishedSnapshot", "read", 2],
];

export const contentSqlOperations = Object.freeze(Object.fromEntries([
  ...[...CONTENT_SCHEMA, ...ORGANIZATION_SCHEMA].map((sql, index) => [`content.schema-${index}`, {
    kind: "write", sql, parameterCount: 0,
  }]),
  ...definitions.map(([name, query, kind, parameterCount]) => [name, {
    kind, sql: CONTENT_QUERIES[query], parameterCount,
  }]),
]));

export function createContentSqlUseClient({ read, write = read }) {
  return createSqlUseClient({ read, write, operations: contentSqlOperations });
}

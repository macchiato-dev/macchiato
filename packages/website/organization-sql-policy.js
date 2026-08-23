import { ORGANIZATION_QUERIES, ORGANIZATION_SCHEMA } from "@macchiato-dev/hub/organizations";
import { createSqlUseClient } from "../sql-use/src/client.js";

const definitions = [
  ["organization.managed", "managedOrganization", "read", 4],
  ["organization.members", "members", "read", 1],
  ["organization.user-by-username", "userByUsername", "read", 1],
  ["organization.existing-member", "existingMember", "read", 2],
  ["organization.existing-admin", "existingAdmin", "read", 1],
  ["organization.insert-invitation", "insertInvitation", "write", 7],
  ["organization.insert-notification", "insertNotification", "write", 4],
  ["organization.notifications", "notifications", "read", 1],
  ["organization.mark-notification-read", "markNotificationRead", "write", 3],
  ["organization.delete-pending-invitation", "deletePendingInvitation", "write", 2],
  ["organization.delete-notification", "deleteNotification", "write", 2],
  ["organization.invitation", "invitation", "read", 2],
  ["organization.insert-member", "insertMember", "write", 5],
  ["organization.accept-invitation", "acceptInvitation", "write", 2],
  ["organization.change-role", "changeRole", "write", 4],
];

export const organizationSqlOperations = Object.freeze(Object.fromEntries([
  ...ORGANIZATION_SCHEMA.map((sql, index) => [`organization.schema-${index}`, {
    kind: "write", sql, parameterCount: 0,
  }]),
  ...definitions.map(([name, query, kind, parameterCount]) => [name, {
    kind, sql: ORGANIZATION_QUERIES[query], parameterCount,
  }]),
]));

export function createOrganizationSqlUseClient({ read, write = read }) {
  return createSqlUseClient({ read, write, operations: organizationSqlOperations });
}

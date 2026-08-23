import { namespaceName } from "./names.js";

export const ORGANIZATION_SCHEMA = Object.freeze([
  `CREATE TABLE IF NOT EXISTS resource_organization_members (
    organization_id TEXT NOT NULL REFERENCES resource_organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (organization_id, user_id)
  ) STRICT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS resource_organization_single_admin
    ON resource_organization_members(organization_id) WHERE role = 'admin'`,
  `CREATE TABLE IF NOT EXISTS resource_organization_invitations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES resource_organizations(id) ON DELETE CASCADE,
    inviter_user_id TEXT NOT NULL REFERENCES users(id),
    invitee_user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS resource_organization_pending_invitation
    ON resource_organization_invitations(organization_id, invitee_user_id) WHERE status = 'pending'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS resource_organization_pending_admin
    ON resource_organization_invitations(organization_id) WHERE status = 'pending' AND role = 'admin'`,
  `CREATE TABLE IF NOT EXISTS resource_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('organization_invitation')),
    invitation_id TEXT REFERENCES resource_organization_invitations(id) ON DELETE CASCADE,
    read_at INTEGER,
    created_at INTEGER NOT NULL
  ) STRICT`,
  `CREATE INDEX IF NOT EXISTS resource_notifications_user
    ON resource_notifications(user_id, created_at DESC)`,
]);

export const ORGANIZATION_QUERIES = Object.freeze({
  managedOrganization: `SELECT o.id, o.slug, o.name, o.description, o.owner_user_id,
                   CASE WHEN o.owner_user_id = ? THEN 'owner' ELSE m.role END AS viewer_role
            FROM resource_organizations o
            LEFT JOIN resource_organization_members m
              ON m.organization_id = o.id AND m.user_id = ?
            WHERE o.slug = ? COLLATE NOCASE
              AND (o.owner_user_id = ? OR m.role = 'admin')`,
  members: `SELECT m.user_id, u.username, u.display_name, m.role, m.created_at
              FROM resource_organization_members m JOIN users u ON u.id = m.user_id
              WHERE m.organization_id = ? ORDER BY m.role, u.username COLLATE NOCASE`,
  userByUsername: "SELECT id, username FROM users WHERE username = ? COLLATE NOCASE",
  existingMember: "SELECT 1 FROM resource_organization_members WHERE organization_id = ? AND user_id = ?",
  existingAdmin: "SELECT 1 FROM resource_organization_members WHERE organization_id = ? AND role = 'admin' LIMIT 1",
  insertInvitation: `INSERT INTO resource_organization_invitations
                  (id, organization_id, inviter_user_id, invitee_user_id, role, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
  insertNotification: `INSERT INTO resource_notifications (id, user_id, kind, invitation_id, read_at, created_at)
                VALUES (?, ?, 'organization_invitation', ?, NULL, ?)`,
  notifications: `SELECT n.id, n.kind, n.invitation_id, n.read_at, n.created_at,
                     i.organization_id, i.role, i.status,
                     o.slug AS organization_slug, o.name AS organization_name,
                     inviter.username AS inviter_username
              FROM resource_notifications n
              JOIN resource_organization_invitations i ON i.id = n.invitation_id
              JOIN resource_organizations o ON o.id = i.organization_id
              JOIN users inviter ON inviter.id = i.inviter_user_id
              WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 100`,
  markNotificationRead: "UPDATE resource_notifications SET read_at = ? WHERE id = ? AND user_id = ?",
  deletePendingInvitation: `DELETE FROM resource_organization_invitations
              WHERE status = 'pending' AND id = (
                SELECT invitation_id FROM resource_notifications WHERE id = ? AND user_id = ?
              )`,
  deleteNotification: "DELETE FROM resource_notifications WHERE id = ? AND user_id = ?",
  invitation: `SELECT n.id, i.id AS invitation_id, i.organization_id, i.role, i.status, o.slug
              FROM resource_notifications n
              JOIN resource_organization_invitations i ON i.id = n.invitation_id
              JOIN resource_organizations o ON o.id = i.organization_id
              WHERE n.id = ? AND n.user_id = ?`,
  insertMember: `INSERT INTO resource_organization_members (organization_id, user_id, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
  acceptInvitation: "UPDATE resource_organization_invitations SET status = 'accepted', updated_at = ? WHERE id = ? AND status = 'pending'",
  changeRole: `UPDATE resource_organization_members SET role = ?, updated_at = ?
                WHERE organization_id = ? AND user_id = ?`,
});

export class OrganizationAccessError extends Error {
  constructor(message = "Organization administration is not available") {
    super(message);
    this.name = "OrganizationAccessError";
  }
}

export class OrganizationInputError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "OrganizationInputError";
    this.field = field;
  }
}

function role(value) {
  const result = String(value || "member");
  if (result !== "member" && result !== "admin") throw new OrganizationInputError("role", "Role must be member or admin");
  return result;
}

function invitationConflict(error) {
  const value = String(error?.message || error);
  if (/resource_organization_single_admin|resource_organization_pending_admin|unique constraint/i.test(value)) {
    return new OrganizationInputError("role", "This organization already has or is inviting an admin");
  }
  return null;
}

function notification(row) {
  return Object.freeze({
    id: String(row.id), kind: String(row.kind), read: row.read_at != null,
    invitationId: String(row.invitation_id), organizationId: String(row.organization_id),
    organizationSlug: String(row.organization_slug), organizationName: String(row.organization_name),
    inviter: String(row.inviter_username), role: String(row.role), status: String(row.status),
    createdAt: Number(row.created_at),
  });
}

export function createOrganizationStore(client, { now = Date.now, randomId = () => crypto.randomUUID() } = {}) {
  if (!client?.execute || !client?.batch) throw new Error("Organization store requires a libSQL-compatible client");
  let initialized;
  const initialize = () => (initialized ||= client.batch(ORGANIZATION_SCHEMA.map((sql) => ({ sql, args: [] }))));

  async function managedOrganization(slugValue, userId) {
    const slug = namespaceName(slugValue, { field: "organization name" });
    const result = await client.execute({
      sql: ORGANIZATION_QUERIES.managedOrganization,
      args: [String(userId), String(userId), slug, String(userId)],
    });
    return result.rows[0] || null;
  }

  return Object.freeze({
    initialize,
    async getManagedOrganization(slugValue, userId) {
      await initialize();
      const org = await managedOrganization(slugValue, userId);
      if (!org) return null;
      const members = await client.execute({
        sql: ORGANIZATION_QUERIES.members,
        args: [org.id],
      });
      return Object.freeze({
        id: String(org.id), slug: String(org.slug), name: String(org.name), description: String(org.description),
        ownerUserId: String(org.owner_user_id), viewerRole: String(org.viewer_role),
        members: Object.freeze(members.rows.map((row) => Object.freeze({
          userId: String(row.user_id), username: String(row.username), name: String(row.display_name),
          role: String(row.role), createdAt: Number(row.created_at),
        }))),
      });
    },
    async invite(slugValue, actorUserId, { username, role: requestedRole }) {
      await initialize();
      const org = await managedOrganization(slugValue, actorUserId);
      if (!org) throw new OrganizationAccessError();
      const targetName = namespaceName(username, { field: "username" });
      const target = (await client.execute({
        sql: ORGANIZATION_QUERIES.userByUsername,
        args: [targetName],
      })).rows[0];
      if (!target) throw new OrganizationInputError("username", "No existing user has that username");
      if (String(target.id) === String(org.owner_user_id)) throw new OrganizationInputError("username", "The organization owner is already part of the organization");
      const existing = await client.execute({
        sql: ORGANIZATION_QUERIES.existingMember,
        args: [org.id, target.id],
      });
      if (existing.rows[0]) throw new OrganizationInputError("username", "That user is already a member");
      const invitationRole = role(requestedRole);
      if (invitationRole === "admin") {
        const admin = await client.execute({
          sql: ORGANIZATION_QUERIES.existingAdmin,
          args: [org.id],
        });
        if (admin.rows[0]) throw new OrganizationInputError("role", "This organization already has or is inviting an admin");
      }
      const timestamp = now();
      const invitationId = randomId();
      const notificationId = randomId();
      try {
        await client.batch([{
          sql: ORGANIZATION_QUERIES.insertInvitation,
          args: [invitationId, org.id, String(actorUserId), target.id, invitationRole, timestamp, timestamp],
        }, {
          sql: ORGANIZATION_QUERIES.insertNotification,
          args: [notificationId, target.id, invitationId, timestamp],
        }]);
      } catch (error) {
        throw invitationConflict(error) || error;
      }
      return Object.freeze({ id: invitationId, notificationId, username: String(target.username) });
    },
    async listNotifications(userId) {
      await initialize();
      const result = await client.execute({
        sql: ORGANIZATION_QUERIES.notifications,
        args: [String(userId)],
      });
      return Object.freeze(result.rows.map(notification));
    },
    async markNotificationRead(userId, notificationId) {
      await initialize();
      const result = await client.execute({ sql: ORGANIZATION_QUERIES.markNotificationRead, args: [now(), String(notificationId), String(userId)] });
      return Boolean(result.rowsAffected);
    },
    async deleteNotification(userId, notificationId) {
      await initialize();
      const results = await client.batch([{
        sql: ORGANIZATION_QUERIES.deletePendingInvitation,
        args: [String(notificationId), String(userId)],
      }, {
        sql: ORGANIZATION_QUERIES.deleteNotification,
        args: [String(notificationId), String(userId)],
      }]);
      return Boolean(results[0]?.rowsAffected || results[1]?.rowsAffected);
    },
    async acceptInvitation(userId, notificationId) {
      await initialize();
      const found = await client.execute({
        sql: ORGANIZATION_QUERIES.invitation,
        args: [String(notificationId), String(userId)],
      });
      const invite = found.rows[0];
      if (!invite || invite.status !== "pending") return null;
      const timestamp = now();
      try {
        await client.batch([{
          sql: ORGANIZATION_QUERIES.insertMember,
          args: [invite.organization_id, String(userId), invite.role, timestamp, timestamp],
        }, {
          sql: ORGANIZATION_QUERIES.acceptInvitation,
          args: [timestamp, invite.invitation_id],
        }, {
          sql: ORGANIZATION_QUERIES.markNotificationRead,
          args: [timestamp, String(notificationId), String(userId)],
        }]);
      } catch (error) {
        throw invitationConflict(error) || error;
      }
      return String(invite.slug);
    },
    async changeRole(slugValue, actorUserId, memberUserId, requestedRole) {
      await initialize();
      const org = await managedOrganization(slugValue, actorUserId);
      if (!org) throw new OrganizationAccessError();
      try {
        const result = await client.execute({
          sql: ORGANIZATION_QUERIES.changeRole,
          args: [role(requestedRole), now(), org.id, String(memberUserId)],
        });
        return Boolean(result.rowsAffected);
      } catch (error) {
        throw invitationConflict(error) || error;
      }
    },
  });
}

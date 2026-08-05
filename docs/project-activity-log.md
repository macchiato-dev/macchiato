# Project activity log

Project versioning and debugging should appear as one chat-like activity log.
The log remains useful when no LLM or other person is present: a user can write
a note to the project, explain an intention, record a decision, or leave a
question for a later participant.

“Chat-like” describes the interface, not an assumption that every entry is a
message between people. The underlying model is an append-oriented project
activity stream whose entries can refer to authoritative versions, errors, and
component runs without copying those records into prose.

## Participants

A participant has a stable project-scoped identity and a displayed name, icon,
and kind. Initial kinds are:

- `user`: a person writing or acting through an authenticated account;
- `guest`: a local or anonymous author when the project permits it;
- `agent`: an LLM or other automated collaborator;
- `component`: an editor, preview, terminal, backend, container, or sandbox;
- `system`: the host activity service for lifecycle and policy events.

A component appearing as a participant does not make it a person or grant it
chat authority. Its participant record identifies the component configuration,
container, guest instance, and relevant package versions. Messages from a
component must be emitted through a declared activity capability; arbitrary
guest text cannot impersonate the host, another component, or an error finding.

Presence is optional. A note does not require an addressed participant or an
expected response. Replies and mentions can be added later without changing
the basic chronological model.

## Entries and references

Every entry has an immutable ID, project ID, sequence position, creation time,
author/participant ID, kind, and bounded payload. Useful initial kinds are:

- `note`: user-authored Markdown;
- `reply`: a note linked to an earlier entry;
- `version`: a reference to a project version and its producing action;
- `error`: a reference to a host-owned diagnostic record;
- `component`: a bounded lifecycle or result summary;
- `decision`: a conclusion that can be found separately from discussion; and
- `system`: publish, revert, restore, permission, and retention events.

Version entries contain `version_id`, not a second snapshot or diff. The version
store remains authoritative for files and configuration. An editing turn may
produce no version, one version, or several checkpoint versions; the activity
entry can refer to the relevant range. Selecting or restoring a version appends
a new system/version entry rather than rewriting history.

Error entries refer to a diagnostic owned by the host. Production entries may
contain only a stable category and correlation ID; development entries may show
the bounded details described in [the QuickJS DOM runtime](quickjs-dom-runtime.md).
Guest-supplied context remains explicitly marked as untrusted.

Edits to human notes should be represented by a bounded revision record. The UI
may display only the latest text while retaining “edited” provenance. Deletion
is normally a tombstone/redaction event, with separate policy for legally or
operationally required hard deletion.

## Unread and pinned errors

Chronology and attention are separate. An error keeps its original place in the
log but also appears in a pinned attention area until it has been read. Reading
is per user (or per local viewer), so one participant cannot clear another
participant's unread state.

The minimum read record is `(user_id, entry_id, read_at)`. A later distinction
may add `acknowledged_at` or `resolved_by_entry_id`; reading an error must not
claim that it was fixed. Repeated equivalent errors can be grouped for display
using a host-produced fingerprint, while retaining each occurrence and its
version/component context. A new occurrence after acknowledgement becomes
unread again.

Errors should be pinned until the reader explicitly opens or marks them read,
not merely because the log scrolled past them. The pinned UI must remain small:
show a count and the highest-severity recent items, with an action to open the
complete filtered log. Errors may coexist with saving and editing; a component
failure should not erase authored input or stop unrelated components.

## Minimal storage shape

The first SQLite/Bunny-compatible schema can stay deliberately small:

```text
project_participants
  id, project_id, kind, subject_id, display_name, metadata_json, created_at

project_activity
  id, project_id, sequence, participant_id, kind, body_markdown,
  version_id, diagnostic_id, reply_to_id, metadata_json, created_at

project_activity_reads
  project_id, activity_id, user_id, read_at, acknowledged_at
```

`metadata_json` is validated by entry kind and size-limited; it is not an escape
hatch for arbitrary component state. Diagnostics and versions have their own
tables and retention rules. Sequence allocation must be transactional per
project. IDs should be stable enough for offline drafts and later synchronization
without relying on wall-clock ordering.

## Capability and privacy boundary

Components receive a narrow `activity.append` capability scoped by project,
allowed entry kinds, payload size, and rate. A code editor may announce a saved
version; a sandbox broker may report a diagnostic; neither can create user notes
or mark errors read. The host assigns participant identity and timestamps.

Activity visibility follows project authorization but may be narrower. Private
diagnostics, prompts, model context, secrets, and rejected source fragments must
not leak merely because a public version exists. Export and deletion need an
explicit policy for the activity log and its referenced records.

## User and organization containers

Projects and their activity live within an owning container. The initial owner
containers are:

- a **user container**, representing a person's private/personal namespace and
  the capabilities issued in that scope; and
- an **organization container**, representing a shared namespace, membership,
  roles, invitations, and organization-scoped capabilities.

These are runtime and security containers, not merely rows used to group a UI.
Their effective environment includes the authenticated actor, owner/container
ID, membership and role, declared components, storage bindings, limits, and
row-level data policy. A project container is created beneath one of them and
can narrow inherited authority but cannot silently broaden it.

The same context should figure into `database-use`/`sqlite-use`. Guest code does
not submit a trusted `user_id`, `organization_id`, or authorization predicate.
It invokes a named database capability; the host binds the actor and owning
container and applies the row policy to every read and mutation. Public reads,
organization-member reads, owner writes, invitations, and administrative
operations are distinct grants rather than boolean flags supplied by a query.

“Row-level security” is the portable contract even when a backend lacks native
RLS. A database adapter may enforce it with native policies, constrained views,
or host-generated prepared predicates, but it must fail closed and test the same
policy matrix. Where practical, native database policy and capability-layer
filtering can provide defense in depth. Raw database handles remain outside the
guest container.

Activity entries inherit the project's owner container. Participant identity is
separate from ownership: a user may write in an organization project because a
membership capability permits it, but the entry and referenced version remain
organization-owned. Moving a project between containers is therefore a
privileged migration with an auditable activity event, not an update to an
untrusted namespace field.

## Proposed implementation sequence

1. Define user, organization, and project container contexts plus the portable
   row-policy matrix. Add participant, activity, and per-user read tables with
   constraints, transactional project sequence allocation, and repository
   tests under both personal and organization ownership.
2. Add a host activity service with `appendNote`, `recordVersion`,
   `recordDiagnostic`, `markRead`, and paginated chronological queries. Keep
   component writes behind a separate capability adapter.
3. Render a read-only activity panel on project pages. Give people, agents, and
   components visibly different treatments; add pinned unread errors and
   version links.
4. Enable user notes without requiring a recipient. Add replies only after the
   flat log, pagination, authorization, and offline retry behavior are sound.
5. Connect current draft/publish/restore operations to version entries, then
   connect sandbox diagnostics. Verify that errors remain pinned across reloads
   until that viewer reads them.
6. Add optional human/LLM responders as participants. They consume the same log
   contract rather than defining it, so projects remain useful without either.
7. Add grouping, decisions, mentions, search, retention controls, and export
   based on observed use instead of expanding the first schema prematurely.

The first vertical slice should be: write a project note, make an edit that
creates a referenced version, trigger a sandbox error, reload, see the error
pinned, open it to mark it read, and restore the referenced version. That tests
the model without requiring an LLM, real-time presence, or multi-user delivery.

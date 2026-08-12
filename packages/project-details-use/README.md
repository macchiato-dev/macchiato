# `@macchiato-dev/project-details-use`

`project-details-use` is the focused project view's settings and details area.
It presents a project's environment, authority, and identity without making
the entire area a permanent form.

This package is at the design stage. The first implementation should preserve
the existing Resources.co project view while extracting each major section
behind a small module boundary.

## Interaction model

The pane opens in a quiet reading mode. Values look like information, not a
stack of enabled inputs. A user with permission can explicitly edit one section
or field; saving or cancelling returns it to reading mode. A project the viewer
cannot administer has the same information hierarchy without inert or disabled
form controls.

Editing authority belongs to the host application. A section may describe and
request a change, but it must not infer ownership or persistence permissions
from the rendered DOM.

## Section order

### Container

The Container section identifies the configured container and summarizes the
environment it assembles: WebAssembly machines, guest runtimes, `*-use`
capabilities, and their relevant budgets.

An authorized user can freeze the container using a snowflake icon. Freezing
pins the effective container configuration so later changes to a named
container do not silently change this project. The UI must distinguish:

- following the named container;
- frozen to a resolved container configuration;
- a frozen configuration whose named source has since changed.

Unfreezing is an explicit change with a preview of the configuration that will
be adopted. The snowflake is a stateful control, not decoration, and needs an
accessible state label in addition to its icon.

### Constraints

The Constraints section describes the authority granted inside the container.
Its modules can include DOM and CSS surfaces, element and attribute bounds,
storage, gas, memory, and other capability-specific limits.

DOM constraints show the allowed tree shape, parents, attributes, quantities,
and portal-like surfaces where present. This section can also be frozen. A
frozen constraint set records the resolved schemas and budgets rather than only
their mutable names. Container and Constraints freezing are independent: a
project may follow improvements to a container while retaining reviewed DOM
limits, or pin the whole container while deliberately revising one constraint.

### Network

The Network section inventories every route by which the project can contact or
navigate to an external resource. Empty access is shown clearly rather than
omitting the section.

Entries distinguish at least:

- resources loaded automatically;
- resources loaded after a program action;
- links that require a person's click;
- links that program code may activate directly;
- navigation allowed in the same window;
- navigation allowed in a new window.

Each entry shows the applicable URL or URL pattern and the capability that uses
it. “Clickable with a click” and “programmatically clickable” are different
authorities even when they share a URL rule. The UI should not collapse loading,
clicking, opening a new window, and replacing the current window into a generic
“network allowed” state.

Network authority can be frozen with its own snowflake control. Freezing stores
the resolved rules, including redirects, target behavior, and resource types.
It does not cache or vendor the referenced resource unless another explicit
feature does so.

### Project identity

Identity and catalog information comes after the execution and authority
sections:

- name;
- title and description where applicable;
- organization or owner;
- public or private visibility.

Owner and organization changes are security-sensitive transfers, not ordinary
text edits. Visibility changes should state their effect before applying them.
Read-only viewers do not receive disabled ownership or visibility inputs; they
receive the relevant published information.

## Module boundaries

The pane coordinates section order, reading/editing state, focus, responsive
layout, and shared save/cancel behavior. It should not absorb each section's
domain model. Initial module boundaries are expected to be:

- container details and freeze state;
- constraints summary, inspectors, and freeze state;
- network inventory and freeze state;
- project identity;
- ownership and visibility.

These can begin as internal modules and become packages only when they have a
useful independent contract. Freeze state should use one shared primitive so
the snowflake, labels, confirmation flow, and resolved-versus-following model do
not drift between Container, Constraints, and Network.

## Host contract

The host supplies a normalized snapshot, resolved configuration evidence,
viewer capabilities, and explicit mutation functions. The pane emits narrow
intent events such as “freeze these resolved network rules” rather than sending
an opaque form payload.

Every accepted change participates in project dirty checking, drafts, and
version history. Merely opening an editor, expanding a section, or inspecting a
freeze control must not create a draft. Destructive or authority-expanding
changes should create a recoverable version before they are applied.

## Workspace placement

Details is project-scoped rather than owned by either tabbed half. Project-wide
icons are aligned on the far right with this area while it is open. If Details
is closed, those controls remain to the right of the rightmost visible half,
separated from that half's active-tab controls by a divider. Opening, closing,
or changing a tab must not make project-wide controls appear to belong to it.

The right half is not reserved for Output View or Details. It has ordinary
tabs, just like the left half. Details may be opened as the project's dedicated
settings area without weakening that two-sided tab model.

## Responsive behavior

On desktop this occupies the project settings area at the far right. It may be
hidden without disposing the editor or project runtime. On narrow screens it
is selected explicitly rather than squeezed beside project content. Returning
to desktop restores the two tabbed halves and the settings-area placement.

Section modules must tolerate being mounted only while visible. Their durable
state belongs to the project snapshot or host session, not incidental DOM
state.

## Initial implementation sequence

1. Extract the current project fields into a read-first pane without changing
   persistence.
2. Introduce the shared freeze-state primitive and the Container section.
3. Render resolved DOM constraints in the Constraints section.
4. Add the explicit network authority inventory.
5. Move ownership and visibility into the final identity sections.
6. Connect section-level edits to drafts and version history.

The package should remain dependency-light. Icons may be inline SVG with their
source recorded in the website credit ledger; the snowflake must be audited for
recognizability at toolbar and section-header sizes.

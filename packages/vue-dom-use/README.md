# `@macchiato-dev/vue-dom-use`

`vue-dom-use` is an experimental bridge for components whose virtual DOM and
event model are naturally expressed as reactive state. A Vue application runs
inside a dedicated QuickJS WebAssembly guest. It owns a serializable reactive
object rather than browser nodes. A separate Vue component on the host renders
that state into a bounded DOM surface.

The experiment starts with a small code editor. It is intentionally not a
second CodeMirror adapter: the first goal is to discover a useful protocol for
reactive components before deciding which editor should sit behind it.

## Candidate boundary

The guest owns:

- component state and derived state;
- named event handlers;
- ordered, revisioned state transitions;
- the decision about what the component means.

The host owns:

- the real DOM and browser event listeners;
- a Vue component constrained to a declared element and attribute shape;
- input, selection, focus, and measurement normalization;
- validation, operation budgets, and lifecycle disposal.

The guest sends snapshots initially and compact transition batches afterward.
The host applies a batch only when its base revision matches. It returns events
as small actions such as `{ type: "input", value, selection }`; browser event
objects and host Vue proxies never cross the boundary. A rejected transition
stops or reports the component according to the container's development mode.

## Questions for the prototype

- Whether Vue's reactivity can remain entirely guest-side while the host uses
  ordinary Vue props, or whether mirroring a reactive store on both sides is
  clearer.
- Whether transition batches should describe state paths, semantic actions, or
  a constrained virtual-node patch format.
- How selection and composition events can remain responsive without making
  text editing a privileged direct bridge.
- Which budgets belong to guest state, transitions, rendered nodes, and event
  frequency independently.
- How much of the protocol remains useful for non-JavaScript guests that emit
  the same serializable transitions without Vue.

This package is exploratory. Its protocol is not stable and must not yet be
treated as a security boundary for untrusted code.

## First prototype

The first prototype runs at `vue-dom-editor.localhost` when the
`vue-dom-editor` declarative app plugin is installed. It uses a plain textarea
so the experiment tests the boundary rather than an editor library:

1. Vue's reactivity runtime is bundled into and evaluated by QuickJS.
2. The guest owns content, selection, derived line/character counts, undo/redo
   history, and a small computed view description.
3. Each browser event becomes a semantic action with the guest's base revision.
4. The guest accepts or rejects the action, mutates its reactive object, and
   returns a validated computed view.
5. A separate native Vue application mirrors that view and renders the only
   real textarea, toolbar, and status elements.

The two Vue graphs deliberately do not share proxies, effects, schedulers, or
virtual nodes. A Vue proxy is runtime-local authority and is not a wire format.
The useful boundary is a revisioned semantic state projection. This also leaves
the protocol open to a guest written without JavaScript or Vue later.

Event transport belongs to a component boundary. In the prototype the host's
top-level `editor-root` component receives browser events from its descendants,
normalizes them, and sends one component/action envelope. The guest's matching
top-level component routes those actions into the reactive object. Individual
buttons and the textarea do not each establish their own host/guest protocol.

That boundary need not always be the application root. A substantial editor,
sidebar, document canvas, or terminal can use an intermediate component as its
boundary. Its parent then delegates a bounded subtree, event vocabulary, state
projection, and budget to it. This supports separate WebAssembly machines or
QuickJS contexts without requiring every leaf component to know that a runtime
boundary exists. A host may therefore have one application-level receiver and
several intermediate receivers, but each event crosses through the nearest
declared boundary rather than through an ad hoc listener bridge.

The default event direction is therefore:

```text
browser descendant → host boundary component → semantic action
semantic action → guest boundary component → reactive transition
computed projection → host boundary component → browser descendants
```

Events that are entirely local to one side remain local. Crossing the boundary
is a component-level capability, not an automatic consequence of registering a
Vue event handler.

The next experiment should replace whole computed views with bounded transition
batches while retaining periodic snapshots for recovery. Text composition,
selection churn, and rapid typing need explicit coalescing rules before this is
appropriate for a full editor. The host also needs a declared surface schema;
the current hard-coded Vue component is narrow, but it is validation code rather
than a reusable security contract.

Run the focused browser test with:

```bash
node --test packages/app/test/vue-dom-editor.browser.test.js
```

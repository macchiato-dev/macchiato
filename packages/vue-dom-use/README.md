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

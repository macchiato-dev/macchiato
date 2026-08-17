# Sandboxed editor

The editor state belongs to QuickJS. The browser receives a constrained DOM
projection and returns only explicitly supported events and measurements.

## Goals

- Preserve familiar CodeMirror behavior.
- Keep the browser host generic.
- Measure before adding specialized batching.

# canvas-use

`canvas-use` grants a QuickJS browser guest a deliberately small Canvas 2D
surface. The host resolves only canvas handles already owned by `browser-use`,
accepts finite numeric arguments, validates colors, enforces a command budget,
and rejects unlisted properties, methods, context types, and image sources.

The initial surface supports fills, paths, lines, arcs, clearing, and simple
transforms. Add an operation only with a corresponding policy decision and
negative test; APIs such as `drawImage` can introduce fetching, decoding, or
cross-origin data and are not implied by access to a canvas.

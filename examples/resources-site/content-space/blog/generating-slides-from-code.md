# Generating Slides From Code
- Slug: generating-slides-from-code
- Published: 2026-08-07

## Body

Reading a codebase and presenting a codebase are different jobs. A directory tree gives orientation and a source browser gives access, but neither decides what a reader should understand first, which invariants deserve explanation, or where one file answers a question raised by another.

I have been experimenting with a generated code tour that treats slides as a separate, versioned reading of a source directory. It snapshots the files, divides canonical reading into chapters, and places selected excerpts beside a narrative written from a broader source analysis. Preview excerpts can introduce an idea, while canonical excerpts account for every relevant line without pretending every line is equally important.

- Example: [Explore the exported dom-use code tour](/-/blog-examples/dom-use-tour/index.html)
- Project: [benatkin / DOM use code tour](/benatkin/dom-use-tour)

The embedded example is an export, not the authoring application. It has no server dependency and stores notes, reading progress, and slide history in session storage. That makes it useful as a portable artifact: it can be hosted as a static page, downloaded, or opened inside a constrained project container.

The notes are part of the refinement loop. A confusing slide may reveal weak prose, a missing architectural explanation, or even a source invariant that deserves a concise code comment. The source remains authoritative; regenerating the tour updates its immutable reading copy and resets revision-scoped progress instead of silently mixing notes from different versions.

This approach is still experimental. The interesting question is not whether an AI can place code on slides, but whether a generated tour can help someone build a durable mental model of a package while remaining exhaustive, inspectable, and responsive to careful reading.

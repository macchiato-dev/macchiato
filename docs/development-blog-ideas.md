# Development blog post ideas

These are working outlines, not publication commitments.

- **A sandbox that does not eat your work.** Start with a productivity app that
  emits invalid DOM because of its own bug. Explain why the container omits the
  denied output without rewriting the user's input, why history belongs outside
  the guest, and how this connects to the recoverability goals of Jef Raskin's
  [The Humane Environment/Archy](https://raskincenter.org/rchi/demos/).
- **Blocked is not stopped.** Walk through an allowed document containing one
  denied subtree: the subtree disappears from the capability output, allowed
  content and guest code continue, and development diagnostics remain visible.
- **One policy, two diagnostic distributions.** Compare development containers
  with source-aware, guest-assisted explanations against production containers
  with stable error categories and protected logs. Show how policy hashes keep
  their enforcement equivalent.
- **Why the host has the final word.** Contrast instructions rejected before
  QuickJS with mutations rejected at the host/guest capability bridge, including
  why guest diagnostic context is useful but never authoritative.
- **History as a capability.** Explore character-level editing history, periodic
  project versions, destructive-operation checkpoints, retention budgets, and
  swappable Markdown and SQLite storage backends.

# macchiato

A monorepo.

## Dependency Policy

Packages in this monorepo specify **exact versions** for all dependencies.
Nested dependencies may technically be pulled in by npm during installation,
but the project does not serve files from nested `node_modules` packages.
Each package is responsible for its own runtime surface and should not
expose its transitive dependency tree over the network.

This policy is pragmatic, not dogmatic — exceptions may exist where
strict exact-version pinning would create unnecessary friction.

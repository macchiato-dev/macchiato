# `@macchiato-dev/hub`

Shared application models behind macchiato.dev, Resources.co, and other
Macchiato installations.

The first boundary contains provider-neutral accounts, projects,
organizations, version history, project archives, container descriptions, and
allowed-URL patterns. It deliberately does not contain Resources.co copy,
colors, fonts, authored posts, or Bunny publication code; those belong to the
private `@macchiato-dev/website` build package.

`hub` is an application package rather than a new platform runtime. Macchiato's
runtime and capability packages remain independently usable, and the website
is one runnable composition of Hub with a theme, content, and deployment
adapters.

The package API is still provisional at `0.0.0`. Existing database table names
retain their `resource_` prefix during the first extraction so modularization
does not become a risky production migration.

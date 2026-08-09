# `@macchiato-dev/hub`

Shared application models and APIs behind the Hub applications at
macchiato.dev, Resources.co, and other Macchiato installations.

The first boundary contains provider-neutral accounts, projects,
organizations, version history, project archives, container descriptions, and
allowed-URL patterns. It deliberately does not contain Resources.co copy,
colors, fonts, authored posts, or Bunny publication code; those belong to the
private `@macchiato-dev/website` build package.

`hub` is an important application within the platform, not the name of the
whole platform runtime. The platform also includes runtimes, capability
packages, storage, publishing, APIs, hosting, and other clients. A server
composition such as `@resources-co/app` may run Hub alongside several other
declarative applications.

Using an app host does not imply operating the whole platform. An installation
may run one local tool, a few independently configured apps, or a static-focused
composition without accounts, publishing, discovery, organizations, or hosted
services. Hub is a key optional tool for inspecting, configuring, authoring, and
navigating those apps. It becomes more central as an installation adopts the
broader platform, but the app host and its declarative apps remain useful without
it.

Hub is the first-party interface for accounts, authoring, organizations,
projects, discovery, and administration. Its models and APIs must not assume it
is the only interface. Operators and third parties can build other applications
that manage the same installation through authorized APIs, and headless or CLI
workflows remain valid. The Resources.co website is one runnable composition of
Hub with a theme, content, other apps, and deployment adapters.

The package API is still provisional at `0.0.0`. Existing database table names
retain their `resource_` prefix during the first extraction so modularization
does not become a risky production migration.

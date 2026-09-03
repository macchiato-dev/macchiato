# Nested Server Workspace

A development-authenticated declarative server app with a compact application
frame, activity/chat rail, content view, and a real PTY-backed Bash terminal.

Install it with `--app-plugin nested-server-workspace`; it is also included in
the `development` preset. The gateway protects every page and API route with the
app's independent development key.

## Process layout

The existing declarative-app gateway remains the public authentication and
routing boundary. This app's handler is a second, deliberately separate proxy:

```text
declarative-app gateway -> workspace wrapper -> restartable app child
                                      |-------> PTY terminal children
                                      `-------> workspace.sqlite
```

The detached workspace wrapper owns the terminals and SQLite database. It
survives gateway restarts, automatically reloads the app child when app source
files change, and keeps terminal sessions intact during those reloads. Activity
entries and terminal run metadata use WAL-backed SQLite in the Macchiato data
directory.

Useful local control commands are:

```bash
node scripts/workspace-terminal.js status
node scripts/workspace-terminal.js restart-app
node scripts/workspace-terminal.js active
node scripts/workspace-terminal.js activity
```

## Credits

Icons are copied inline so the workspace remains self-contained and does not
acquire an icon-font or runtime network dependency.

| Source | Icon | Interface use |
| --- | --- | --- |
| [Lucide](https://lucide.dev/) (ISC) | [`refresh-cw`](https://lucide.dev/icons/refresh-cw) | Content preview reload control |

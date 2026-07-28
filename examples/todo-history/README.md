# Character History TODO

A proof of concept for one event model stored in either SQLite or a
Markdown-list dialect. Install the `todo-history` app plugin (the
`development` preset includes it), then open:

```text
http://todo-history.localhost:8765
```

The backend selector changes stores; it does not translate or copy data. This
makes behavioral parity visible while keeping each representation inspectable.
SQLite shares the Macchiato database. Markdown is written to
`<data-dir>/todo-history/history.md`.

## Canonical history

Every event has an ID, TODO ID, kind, and millisecond timestamp. Create, toggle,
and delete events are small envelopes. An edit adds a starting cursor and
compact Vim-like actions:

```json
{
  "kind": "edit",
  "cursor": 0,
  "actions": [
    { "op": "move", "by": 5, "delayMs": 400 },
    { "op": "insert", "text": "il", "delaysMs": [120, 180] }
  ]
}
```

Insert and delete actions retain one delay per character. Runs are not stored
as repeated events: `insert "milk"` is one action and expands to four playback
frames when the history viewer needs them. Cursor movement is also an action,
so the example above replays as “move five positions, wait 400 ms, type `i`,
wait 120 ms, type `l` after another 180 ms.”

## Markdown dialect: `todo-history/v1`

The file is ordinary Markdown. `## List` contains the current checkbox view,
and `## History` contains event headings with nested lists:

```markdown
# TODO character history

## List

- [ ] Get milk — `t1`

## History

### Edit `e2`
- TODO: `t1`
- At: `2000`
- Cursor: `0`
- Actions:
  1. Move: `5`
     - After: `400ms`
  2. Insert: il
     - Delays: `120ms`, `180ms`

## Format

- Dialect: `todo-history/v1`.
- **List** is materialized; **History** is authoritative in document order.
```

Normal text stays normal Markdown. Values needing lossless escaping use an
inline-code `json:` value. Durations are integer milliseconds. The adapter
validates the complete history, renders the current list, and atomically
replaces the document. It caches the parsed stream for efficient reads during
one process.

## SQLite dialect

- `todo_history_events` stores the ordered event envelope.
- `todo_history_edit_actions` stores ordered cursor/move/insert/delete actions.
- `todo_history_current` materializes current TODO state, so rendering the live
  list does not replay the full log.

An append validates the event and updates the event log, normalized actions,
and current state in one `BEGIN IMMEDIATE` transaction. History loading joins
the compact actions only for edit events.

Both adapters implement `append`, `listEvents`, and `state`. The model owns
validation, edit application, replay, and expansion into character frames, so
storage representations cannot quietly acquire different semantics.

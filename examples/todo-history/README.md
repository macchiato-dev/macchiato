# Character History TODO

A proof of concept for one event model stored in either SQLite or an
append-only Markdown dialect. Install the `todo-history` app plugin (the
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

The file is ordinary Markdown with append-only fenced records:

````markdown
# TODO character history

Format: `todo-history/v1`

```todo-history
event e2
at 2000
todo t1
edit
cursor 0
move 5 after 400
insert "il" delays 120,180
```
````

Text uses JSON string quoting. Durations are integer milliseconds. Records are
replayed in file order, and an invalid append is rejected before it is written.
The adapter caches its parsed stream for efficient reads during one process.

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

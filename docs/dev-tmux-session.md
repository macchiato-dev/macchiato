# Restoring the `vibe` tmux session

This recreates the development tmux session that runs inside the
`macchiato-vibe` container, as it was set up on 2026-10-25.

## Before shutting down

Everything lives in the container's own filesystem: the repository, local
commits, `~/.macchiato` (the app's SQLite data), `~/.claude` (Claude Code
history) and `/root/macchiato-work`. None of it is a mounted volume.

- `podman stop macchiato-vibe` keeps all of it; `podman start` brings it back.
- `podman rm` (or recreating the container) loses it. When this was written
  the repository had no git remote configured, so the history existed only
  here. Before removing the container, push to a remote or copy a bundle out:

  ```sh
  git -C /root/macchiato bundle create /root/macchiato-work/macchiato.bundle --all
  podman cp macchiato-vibe:/root/macchiato-work/macchiato.bundle .   # on the host
  ```

## Windows

| # | Name | Directory | Command | Address |
|---|------|-----------|---------|---------|
| 0 | claude | `/root/macchiato` | `claude --continue` | |
| 1 | nvim | `/root/macchiato` | `nvim packages/website/rust-container/sandbox.rs` | |
| 2 | fish | `/root/macchiato` | shell | |
| 3 | fish | `/root` | shell | |
| 4 | workflow | `dev/workflow` | `deno run --allow-read=dist --allow-net=0.0.0.0:8787 build/server.ts` | `:8787` |
| 5 | canvas-lite | `dev/canvas-lite` | `deno task start` | `127.0.0.1:8788` |
| 6 | rust-compiler | `packages/website/rust-container` | `deno task serve` | `127.0.0.1:8791` |
| 9 | server | `/root/macchiato` | `node packages/app/src/index.js --host 0.0.0.0 --port 3030 --app-plugin development` | `:3030` |
| 10 | evm | `/root/macchiato` | `node dev/evm/server.js` | `:3042` |

None of these needs extra environment variables. The app server uses the
default data directory, `~/.macchiato/default`.

## Build outputs

`dev/workflow/build`, `dev/workflow/dist`, `dev/canvas-lite/dist` and
`packages/website/rust-container/dist` are gitignored. They survive a stop and
start, but in a fresh container they must be rebuilt before windows 4 and 5
will start:

```sh
cd /root/macchiato/dev/workflow && deno task build
cd /root/macchiato/dev/canvas-lite && deno task build
```

## Recreate the session

Run this from a shell inside the container that is not already in tmux:

```sh
cd /root/macchiato
tmux new-session -d -s vibe -n claude -c /root/macchiato
tmux new-window -t vibe:1 -n nvim -c /root/macchiato
tmux new-window -t vibe:2 -n fish -c /root/macchiato
tmux new-window -t vibe:3 -n fish -c /root
tmux new-window -t vibe:4 -n workflow -c /root/macchiato/dev/workflow
tmux new-window -t vibe:5 -n canvas-lite -c /root/macchiato/dev/canvas-lite
tmux new-window -t vibe:6 -n rust-compiler -c /root/macchiato/packages/website/rust-container
tmux new-window -t vibe:9 -n server -c /root/macchiato
tmux new-window -t vibe:10 -n evm -c /root/macchiato

tmux send-keys -t vibe:0 'claude --continue' Enter
tmux send-keys -t vibe:1 'nvim packages/website/rust-container/sandbox.rs' Enter
tmux send-keys -t vibe:4 'deno run --allow-read=dist --allow-net=0.0.0.0:8787 build/server.ts' Enter
tmux send-keys -t vibe:5 'deno task start' Enter
tmux send-keys -t vibe:6 'deno task serve' Enter
tmux send-keys -t vibe:9 'node packages/app/src/index.js --host 0.0.0.0 --port 3030 --app-plugin development' Enter
tmux send-keys -t vibe:10 'node dev/evm/server.js' Enter

tmux attach -t vibe
```

The commands are typed into interactive shells with `send-keys`, rather than
given as the window command, so that each window drops back to a shell when its
server stops or is interrupted. That makes a crashed server easy to restart
with the up arrow.

`claude --continue` resumes the most recent Claude Code conversation in
`/root/macchiato`. To choose a different one, use `claude --resume`. The
conversation in use when this was written was
`51951612-f19b-4cfb-90f5-80a4035fd31a`; `claude --resume <id>` opens it
directly.

## Leftover processes

The app server starts nested workspace servers
(`examples/nested-server-workspace/wrapper-server.js` and `app-server.js` on
`~/.macchiato/default/workspace-wrapper.sock*`). These run detached from any
tmux window and are started again on demand. After a container restart,
remove stale sockets only if the app server complains that they are in use.

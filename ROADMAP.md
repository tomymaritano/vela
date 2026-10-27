# Roadmap

This is the order of work. Behavior lives in
[`docs/superpowers/specs/2026-10-26-vela-design.md`](docs/superpowers/specs/2026-10-26-vela-design.md).
Module ownership lives in [`AGENTS.md`](AGENTS.md).

The plans under `docs/superpowers/plans/` dated 2026-10-26 describe an older
shape. Do not execute them. Before building a slice, rewrite its plan from the
spec.

v1 is done when a large folder stays responsive, a normal file can be edited
and saved, and the agent streams an answer about that file without changing it.

## Done

The editor slice runs.

- Open a folder, list one level, edit, and save. Save is a temp file plus rename.
- The path jail, the size caps, and the binary check are in Rust.
- One ignore filter exists. The shell does not keep a second copy.
- Command palette, file palette, go to line, and the tree toggle.
- The agent column is a fixed placeholder. It does not call the model.
- `open_workspace` returns walk id `0` and `watchOk: false`. The status bar says
  the index and the watcher are not running.
- Brand, tokens, and the mark are in `docs/brand.md` and `src/brand/tokens.json`.
  The running theme is Noche. User-facing strings are English.

## Next

Build these in order. Each one is a branch off `main`.

### 1. Index

Next slice. This is the "large folder stays responsive" goal.

Rewrite the index plan from the spec, then build it. The walker runs on a
worker thread. `open_workspace` lists the root before it bumps the generation,
returns the walk id it started, and emits progress about four times a second.
`search_files` is a linear scan of that index: 30 ms debounce, 50 hits,
consecutive match ahead of a scattered one. An empty Cmd+P query shows the
last ten opened files. While the walk is unfinished, search uses the partial
index.

`filter.rs` already owns nested gitignore, dotfiles, no symlinks, and never
descending into `.git`, `node_modules`, `target`, or `dist`. The walker calls
that same configure function. Do not copy the rules.

Done when Cmd+P searches a real checkout, gitignored dependency directories
stay out, and the window stays usable while the walk runs.

### 2. Watcher

After the index, because the watcher updates the index.

Use `notify` 8. Coalesce bursts for about 100 ms. Apply the same filter.
Refresh only directories that are expanded. A clean tab reloads when the file
changes on disk. A dirty tab keeps the buffer and the status bar says the
disk changed. A clean deleted file closes the tab. A dirty deleted file stays,
Reload is disabled, and Cmd+S creates the file. If the watcher cannot start,
the folder still opens.

Done when an external edit updates an expanded tree and a clean open file,
and a dirty buffer is left alone.

### 3. Agent

After the editor file is trustworthy. It does not need the watcher.

Read-only. Model `grok-4.7` at `https://api.x.ai/v1/chat/completions`, stream
on, no server-side search. `XAI_API_KEY` stays in the Rust process. The
snapshot rides on the current user turn: the whole file up to 100 KB; path,
language, and up to 200 lines around the cursor above that, with the word
`cut`; path and reason only for binary or above 5 MB. The last 20 messages.
Stop or a new send cancels, and a late delta is ignored. A missing key
disables the composer. A network failure keeps the user message for retry.
The agent does not write, rename, delete, or run commands. CI does not call
`api.x.ai`.

Done when a real key streams an answer about the open file and the file on
disk is unchanged.

## Later

Each of these is its own design. v1 does not include them.

- A bottom terminal.
- A language server.
- Git, diff review, and find-in-files.
- A settings screen and theme switching. Día is already defined for Vela Kids.
- Vela Kids: the Día theme, Nunito, Compa, and missions. No points, streaks, or badges.
- An agent that can edit. That design still needs a diff a person can reject.

## How to work

`main` is the default branch. Feature work branches off `main`. The repository
is English, including the sentences in the window. MIT. Do not commit
`XAI_API_KEY`, patient documents, or report text.

```bash
pnpm install
pnpm tauri dev
source "$HOME/.cargo/env"
cargo test --manifest-path src-tauri/Cargo.toml
pnpm exec tsc --noEmit
```

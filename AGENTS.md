# AGENTS.md — Vela

Instructions for agents working in this repository. Product behavior lives in
[`docs/superpowers/specs/2026-10-26-vela-design.md`](docs/superpowers/specs/2026-10-26-vela-design.md).
This file says which module owns each decision. If a change needs a second
module to learn the same fact, the boundary is wrong.

The plans under `docs/superpowers/plans/` dated 2026-10-26 are stale. Do not
execute them. Rewrite a plan from the spec before building that slice.

## Product

Vela is a desktop IDE shell for learning. Tauri 2 owns the window. Rust owns
the disk. React owns what is on screen. CodeMirror 6 owns the text buffer.
MIT. Do not commit, push, or add a public remote unless Tomás asks.

The running app opens a folder, edits, and saves. The index, the watcher, and
the agent are specified and not built. `open_workspace` returns walk id `0`
and `watchOk: false` until those slices exist. Do not pretend they are running.

Do not put API keys, patient documents, or report text in the tree or the logs.
`XAI_API_KEY` is read in the Tauri process. It is never a `VITE_` variable and
never enters the webview.

## Where a decision lives

One owner per decision. Other modules consume the result.

| Decision | Owner | What the others do |
|---|---|---|
| Ignore rules, symlink policy, never-descend names | `src-tauri/src/filter.rs` | Do not copy `.git`, `node_modules`, `target`, or `dist` into TypeScript or a second Rust module |
| Path jail, size caps, binary test, atomic save | `src-tauri/src/files.rs` | Trust `ReadOutcome`. Do not re-measure the file in the shell |
| Which folder is open, and its generation | `Workspace` in `src-tauri/src/lib.rs` | A command that touches the folder takes the generation and no walk id |
| Walk progress | Index, inside Workspace, when built | Progress events carry the walk id. List, search, read, and write do not |
| Save identity | The editor tab (`saveId`) | `write_file` does not take it and does not return it |
| Extension to language | `src/editor/languages.ts` | Rust sends `highlight: bool`. The shell passes a language name into an agent snapshot. Rust does not grow a second table |
| Highlight, wrap, fold | CodeMirror, from the `highlight` flag | All three stay off when the flag is false |
| Color, type, space, radii, the mark | `src/brand/tokens.json` and `docs/brand.md` | Components use the CSS variables. They do not write a hex value. The mark is the SVG in `public/brand/`, not a redrawn path |
| Product voice | `src/shell/copy.ts` for the window, the Rust status strings for disk errors | English. Do not match UI behavior on the sentence. Match on the error code |
| Transcript, snapshot shape, model, API key | Agent module, when built | No write function is passed in |
| On-screen state | Shell | The webview does not hold the path index |

## Backend

Draw boundaries around knowledge, not around steps.

Workspace is the disk. It opens a folder, lists, reads, writes, and will watch
and index. It does not know tabs, pixels, the transcript, or the model.

Keep read and write in `files.rs`. Do not split them into a reader, a writer,
and a validator. Callers would have to know the order, which is the knowledge
those types were meant to hide.

`filter.rs` configures `ignore::WalkBuilder` and lists one directory. The
index walk calls that same configure function. A parallel copy of the rules
is a bug.

`lib.rs` is a dispatcher. It checks the generation, calls into Workspace, and
maps failures to `{ code, message }`. Policy does not start in the dispatcher.
`open_workspace` lists the directory before it bumps the generation, so a
folder that cannot be read does not replace the open one.

The index stays inside Workspace. It shares the root and the filter. A sibling
crate that reimplements ignore duplicates that knowledge.

The agent is a separate module because it knows the model, the key, and the
transcript cap. It may ask Workspace for a gated read. The command layer does
not hand it `write_file`. Snapshot limits (100 KB, 200 lines, the word `cut`)
stay in the agent. Byte caps (highlight at 1 MB, body at 5 MB, NUL in the
first 8 KB) stay in `files.rs`. Do not merge the two policies behind a boolean.

Tauri capabilities allow the folder dialog and the Vela commands. They do not
allow the filesystem plugin.

Logs record an error code and, for the agent, the HTTP status. They do not
record a path, a prompt, the transcript, or file bytes.

## Frontend

React renders the window. It is not an IDE toolkit. Do not add MUI, Radix,
shadcn, or a home-grown widget layer. VS Code's workbench and Zed's GPUI are
toolkits because those products are the toolkit. Vela's chrome is the tree,
the tabs, the editor, the palette, and the status bar, written here.
CodeMirror is the only third-party UI dependency, and it is the buffer.

The window is Noche. Día tokens exist for Vela Kids and are not a switcher.
`accent-100` is the active tab, the caret, the agent, and the primary button.
Syntax colors are the `syntax-*` tokens and are not the accent. An unsaved
file name is italic. Comments are not.

Do not add a hook per step (`useOpenFolder`, `useSave`, `useRead`). Those
steps are one session, owned by `useWorkspace`.

```text
src/brand/tokens.json       color, type, space, radii
src/brand/applyTheme.ts     writes the CSS variables before paint
public/brand/               the four mark files
src/editor/                 one document: buffer, dirty flag, save id, languages
src/shell/App.tsx           columns and the status bar
src/shell/useWorkspace.ts   folder, generation, tabs, expansion, status
src/shell/copy.ts           the sentences the window says
src/shell/commands.ts       palette entries and Command shortcuts
src/shell/api.ts            the only module that calls invoke
src/shell/Tree.tsx
src/shell/Tabs.tsx
src/shell/Palette.tsx
src/shell/StatusBar.tsx
src/shell/AgentPanel.tsx    placeholder until the agent slice
src/shell/shell.css         layout only, variables only
src/agent/                  transcript and composer, when that slice exists
```

A surface receives data and callbacks. It does not call `invoke` and it does
not import another surface. `useWorkspace` is the only writer of folder,
generation, tabs, and expansion. Do not add Zustand or Redux while there is
one writer.

Keystrokes inside a buffer stay in CodeMirror. Shell shortcuts are macOS
Command only. The folder picker is the only dialog. Cancelling it changes
nothing. Failures go to the status bar. The agent panel reports its own
missing-key and network errors.

## IPC

Two clocks. The generation is the open folder. The walk id is one background
walk. Reindex keeps the generation, the watcher, the tabs, and the transcript,
and starts a new walk id. Switching folders bumps the generation and drops
the rest.

Paths that cross IPC are relative and use `/`.

An error that crosses IPC is a code plus a short status string:
`stale_workspace`, `outside_root`, `too_large`, `binary`, `io`, `no_key`,
`provider`. The shell shows the string. It does not match on the wording.
It drops `stale_workspace` without changing the status bar. A debug dump does
not cross the boundary.

A few failures are not user-facing errors. A failed walk leaves the partial
index usable. A watcher that cannot start still opens the folder. A failed
save leaves the buffer dirty and deletes the temporary file. The temporary
name is `.{filename}.vela-tmp` in the same directory.

## Checks

From this directory. Non-interactive bash needs the cargo env line. The login
shell is fish.

```bash
source "$HOME/.cargo/env"
cargo test --manifest-path src-tauri/Cargo.toml
pnpm exec tsc --noEmit
pnpm tauri dev
```

CI must not call `api.x.ai`.

## Rejected shapes

Recorded so they are not reopened inside a patch. The spec's alternatives
section has the fork comparison.

- A fork of Code-OSS, Theia, Zed, or Lapce. Vela is a shell. A Zed fork is GPL-3.0-or-later.
- Streaming the path list into the webview.
- A component library or a widget toolkit for the chrome.
- A walk id argument on list, search, read, or write.
- A save id argument on `write_file`.
- A second copy of the ignore rules.
- An agent that can write, rename, or delete.
- A second accent, a literal hex in a component, or a redrawn mark.

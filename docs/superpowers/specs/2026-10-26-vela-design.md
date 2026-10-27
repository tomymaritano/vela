# Vela v1

Date: 2026-10-26
Status: the editor slice is in the tree. The index, the watcher, and the agent are specified and not built. The order of that work is [`ROADMAP.md`](../../../ROADMAP.md). The three plans dated 2026-10-26 are stale and must be rewritten before those slices. Module ownership for agents lives in `AGENTS.md` at the repository root.

Vela is a desktop IDE shell for learning. Version 1 opens a large folder, edits files, and talks about the file that is open. The text engine, the ignore walker, and the file watcher are libraries. The window, the index, and the agent wiring are ours.

## Goals

- Open a large folder and stay responsive while a background index is built.
- Edit and save text files, including files up to 5 MB.
- Ask the agent about the active file and get a streamed answer.
- Keep file bytes and prompts out of logs.

## Non-goals

Terminal, language server, git UI, diff review, debugger, extensions, split editors, find-in-files, a settings screen, theme switching, and an agent that edits the disk. Those are later projects. ripgrep is not in v1. File search is a linear scan in Rust.

## Stack

| Piece | Choice |
|---|---|
| Window | Tauri 2, developed on macOS |
| UI | React, Vite, TypeScript |
| Editor | CodeMirror 6 |
| Walk and ignore | Rust `ignore` crate |
| Watch | Rust `notify` crate |
| Agent | xAI chat completions, model `grok-4.7`, base `https://api.x.ai/v1` |

`grok-4.7` is the code model named in the xAI docs on 2026-10-26. The call does not enable server-side search tools.

The Tauri capability set allows the folder dialog and the Vela commands. It does not allow the filesystem plugin. The webview reaches the disk only through those commands. `XAI_API_KEY` is read in the Tauri process. It is not a `VITE_` variable, and Vite does not use the Tauri directory as its env directory.

The repository lives outside psynth-stack. This document is the design for that repository.

## License

Vela is open source under MIT. Tauri, CodeMirror, `ignore`, and `notify` are permissive, so MIT matches the dependencies. The first commit adds a `LICENSE` file. The repository never contains `XAI_API_KEY`, patient documents, or report text. A public remote waits until Tomás asks for one.

## Modules

Five modules. Workspace owns the disk. Index, inside it, owns the path list. Agent owns the model call. Shell owns the window. Editor owns the open documents.

**Workspace (Rust).** Opens a folder, reads and writes files, watches the disk, and owns the index and the ignore filter. It does not know about tabs, pixels, the transcript, or the model.

**Index (Rust, inside Workspace).** A background walk that records file paths. Directory listings come from the disk, not from the index. The index answers search and progress.

**Agent (Rust).** Builds the snapshot through the same read policy, holds the API key, and streams the chat completion. It can ask Workspace for a gated read. It has no write, rename, or delete. The command layer does not hand it a write function.

**Shell (TypeScript).** Tree, tabs, command palette, file palette, status bar, and the agent panel. Workspace view, editor tabs, and the transcript are three pieces of state. Editing the transcript does not require editing the tree. The shell stores only what is on screen, plus the transcript and the last ten opened paths.

**Editor (TypeScript).** One CodeMirror document per open path, a dirty flag, the save id for that tab, and the language map. The read result carries the highlight boolean. The editor does not re-check the byte cap. The extension-to-language table lives only here.

The webview never holds the full path list. Rust does.

## Layout

Three columns and a status bar.

- Left: file tree. Cmd+B hides and shows it.
- Center: tab strip and the editor.
- Right: agent transcript and composer.
- Bottom: status text. There is no bottom panel and no terminal process.

The running theme is Noche. Día is defined for Vela Kids and is not switched from this window. Colors, type, and the mark live in `docs/brand.md` and `src/brand/tokens.json`. User-facing strings are English. No settings page.

The screen starts empty, with an Open Folder action. With a folder open and no file, the editor column stays blank and the agent still accepts messages.

## IPC

Two clocks, because a reindex is not a folder switch. The workspace generation identifies the open folder session. The walk id identifies one background walk. One number cannot mean both: reindex must keep the tabs, the watcher, and the transcript.

Commands that touch the open folder carry the workspace generation and no walk id. `open_workspace` returns the generation. `list_children`, `search_files`, `read_file`, and `write_file` take it. Rust drops the call when the generation is not the open workspace. The shell drops a result whose generation is not the one on screen.

The walk id is not an argument of list, search, read, or write. `open_workspace` returns the id of the walk it started. Later progress events carry that id. The shell ignores a progress event whose walk id is not the current walk.

The save id stays in the editor. `write_file` does not take it and does not return it. The shell ignores a finished save that is not the latest save it started for that tab.

Switching folders increments the workspace generation, cancels the walk, drops the watcher, closes every tab, clears recents, cancels the agent stream, and clears the transcript.

Reindex keeps the workspace generation, the watcher, the tabs, and the transcript. It starts a new walk id.

| Call | Result |
|---|---|
| `open_workspace(path)` | Workspace generation, walk id, root entries, whether the watcher started |
| `list_children(workspace_generation, path)` | Directory entries, or an error for that directory |
| `search_files(workspace_generation, query)` | At most 50 matches |
| `read_file(workspace_generation, path)` | Text with a highlight boolean, too-large, binary, or an error code |
| `write_file(workspace_generation, path, text)` | Ok, or an error code. The original file is unchanged on error |
| Agent channel | Text deltas, then done, or an error code. A newer send or Stop cancels the previous stream |

An entry is a name, a relative path using `/`, and a kind of file or directory. Failures that cross this boundary are a stable code plus a short status string. Examples: `stale_workspace`, `outside_root`, `too_large`, `binary`, `io`, `no_key`, `provider`. A debug dump of an IO error does not cross IPC.

## Opening a folder

The system folder picker is the only dialog. Cancelling it changes nothing.

If the path is missing, not a directory, or not readable, the current workspace stays and the status bar shows the reason. If nothing was open, the empty screen stays.

`open_workspace` returns the root listing immediately. A worker thread walks the tree. Progress events fire about four times a second with the file count, the skipped-directory count, and whether the walk is finished. The walk does not run on the Tauri main thread.

## What gets indexed

`list_children` and the walker share one filter. That filter is one Rust module. The shell does not keep a second copy of the skipped directory names or the gitignore rules.

- Nested `.gitignore` files apply, including when the root itself is not a git repository.
- Dotfiles are shown unless a gitignore excludes them.
- Symlinks are omitted.
- These directory names are never descended into: `.git`, `node_modules`, `target`, `dist`.

The index stores files only, as relative paths with `/`. Directories come from live `list_children` calls, so the root paints before the walk finishes.

An unreadable directory during the walk is skipped and counted. The walk continues. Expanding that directory shows an error on the row. Collapsing and expanding it tries again.

If the walk stops unexpectedly, the partial index remains usable and the status bar says the index stopped. Reindex starts a new walk on the same folder.

## Tree and search

Expanding a directory calls `list_children` once and caches the entries. Only visible rows are mounted. Collapsed directories have no children in the DOM.

Cmd+P waits about 30 ms after the last key and calls `search_files`. Rust scans the index linearly with a subsequence score: a tighter, consecutive match ranks above a scattered one. Ties break by shorter path, then by path text. The palette shows at most 50 hits.

An empty query shows the last ten opened files, newest first. While the index is unfinished, search uses what is already indexed and the status bar says so.

## Reading and saving

Rust checks the size before reading the body.

| File | Result |
|---|---|
| Text up to 1 MB | UTF-8 bytes, syntax highlighting on |
| Text above 1 MB up to 5 MB | UTF-8 bytes, highlighting off, wrap off, folding off |
| Above 5 MB | Size only. The body is not read and there is no override |
| Binary | A notice. Save is disabled |

A file is binary if the first 8 KB contains a NUL byte, or if the bytes are not valid UTF-8. Invalid UTF-8 is not decoded lossily.

Highlighting is on only under 1 MB, and only for these extensions:

| Extensions | Language |
|---|---|
| `js`, `jsx`, `mjs`, `cjs` | JavaScript |
| `ts`, `tsx`, `mts`, `cts` | TypeScript |
| `json` | JSON |
| `md`, `mdx` | Markdown |
| `rs` | Rust |
| `py` | Python |
| `css` | CSS |
| `html`, `htm` | HTML |

Every other extension is plain text.

Opening a path that is already open focuses that tab. A tab is dirty when the document text differs from the last saved text.

Cmd+S writes a temporary file in the same directory and renames it over the target. Each save the shell starts has an id that stays in the editor. Only the latest id for that tab can clear the dirty flag. Rust is not told the id. If a save fails, the tab stays dirty, the temporary file is removed, and the status bar shows the error.

There is no New File command. The one create path is a dirty tab whose file was deleted: Cmd+S creates it again.

## Watcher

`notify` watches the workspace root. Events are filtered with the same ignore rules, then coalesced for about 100 ms. Rust updates the index. The shell re-lists only directories that are expanded.

When the open file changes on disk:

- A clean tab reloads.
- A dirty tab keeps the buffer. The status bar says the file changed on disk. Reload from Disk discards the buffer.
- A clean tab whose file was deleted closes, and the status bar names the file.
- A dirty tab whose file was deleted stays open. Reload from Disk is disabled. Cmd+S creates the file.

If the watcher cannot start, the folder still opens. The status bar says disk changes will not update the tree. Expanding a directory still reads the disk.

## Agent

The transcript lives in the shell, not on disk. The panel header can start a new conversation, which clears the transcript. The command palette can do the same.

Each send includes the last 20 messages. The agent module enforces that cap. The shell may send fewer. It does not send a different cap.

The snapshot rides on the current user turn: the text the user just sent, plus the snapshot of the active file. It is not a later user message after the turns. The model must not see the file as a new question.

Rust calls `https://api.x.ai/v1` with `XAI_API_KEY` from the process environment and model `grok-4.7`. The key never enters the webview. Logs record the error code and, when the provider responds, the HTTP status. Logs do not record the path, the prompt, the transcript, or file bytes.

| Active file | Snapshot |
|---|---|
| Text up to 100 KB | The whole file |
| Text above 100 KB up to 5 MB | Path, language, and up to 200 lines centered on the cursor. Shorter files send every line. The snapshot says the file was cut |
| Binary or above 5 MB | Path and the reason. No body |
| None open | No attachment |

The system prompt tells the model that it is inside Vela, that it can see only the attached snapshot, that it cannot modify files or run commands, and that it should answer in the language of the latest user message.

Deltas append to the current assistant message. Stop, or a new send, cancels the in-flight stream. A delta that arrives after cancel is ignored.

If `XAI_API_KEY` is missing, the composer is disabled and the panel says the key is missing. If the request fails, the user message remains and can be retried.

The agent does not write files, apply patches, or choose other files.

## Commands

File palette: Cmd+P.
Command palette: Cmd+Shift+P.
Save: Cmd+S.
Toggle the tree: Cmd+B.

Command palette entries:

- Open Folder
- Save. Enabled only when the active tab has a text document, or when a dirty tab's file was deleted.
- Close Tab. Closes notice tabs as well as text tabs.
- Go to Line. Enabled only when the active tab has a text document. The line number is 1-based and clamped to the document.
- Toggle Sidebar
- Reload from Disk. Enabled when the active tab has a text document and the file still exists.
- Reindex
- New Conversation

CodeMirror's own find-in-file shortcut stays. Find across files is out of scope.

Shortcuts use the Command key. v1 is for macOS.

## Errors

The user's text changes only when they save or when they choose Reload from Disk. A disk failure does not empty the buffer and does not switch folders.

Failures use the status bar, except the agent panel reports its own key and network errors. The status text comes from the error code. v1 has no custom modal dialogs.

Reads and writes reject a normalized path that is not inside the workspace root (`outside_root`).

A list, search, save, or read whose workspace generation does not match the open workspace is ignored (`stale_workspace`).

## Testing

CI does not call `api.x.ai`.

Rust tests use temporary directories:

- The walker and `list_children` apply the same filter: nested gitignore, no descent into `.git`, `node_modules`, `target`, or `dist`, and no symlinks.
- Raising the generation stops the walk, and events from the old generation are dropped.
- `search_files` returns at most 50 paths and ranks a consecutive match above a scattered one.
- `read_file` returns the three size classes and the binary class, and does not read the body above 5 MB.
- `write_file` replaces the file. On failure the original remains and the temporary file is gone.
- A normalized path outside the root is rejected.
- The agent snapshot builder follows the snapshot table above.

Vitest covers the shell:

- An event from an old generation does not change the visible workspace.
- A watch burst refreshes only expanded directories.
- An older save result does not clear a dirty tab that has newer edits.
- A binary or too-large file shows a notice and does not offer save.
- Agent deltas append, a delta after Stop is ignored, and New Conversation leaves the transcript empty.

One fixture workspace contains a nested gitignore, a `node_modules` directory, a text file of about 2 MB, a binary file, and a small source file. Opening it shows the root immediately, the index excludes `node_modules`, the small file is editable, the 2 MB file opens with highlighting off, and the binary file is a notice.

One manual check, outside CI: with a real `XAI_API_KEY`, ask about the open file, watch tokens arrive, and confirm the file on disk is unchanged.

## Acceptance

v1 is done when all of the following are true.

- A large local checkout opens, the window stays responsive while the index runs, and gitignored dependency directories stay out of the tree and out of Cmd+P.
- A normal source file can be edited and saved. A file over 5 MB does not load its body. A binary file does not open as text.
- The agent streams an answer about the active file and does not modify that file.
- The automated tests above pass.

## Alternatives considered

Compared on 2026-10-26. The chosen design is the rest of this document.

A fork of Code-OSS, Eclipse Theia, Zed, or Lapce was rejected. Those are whole applications. Vela is MIT, and a Zed-based fork would ship under GPL-3.0-or-later. The edit loop here is Vite for the window and `cargo test` for the disk.

Streaming the whole file tree into the webview was rejected. The path list stays in Rust. The window keeps tabs, Cmd+P, and highlighting under 1 MB.

Kept from that comparison: the agent module has no write path, the snapshot rides on the current user turn, the save id stays in the shell, IPC errors are codes, logs omit paths, Tauri exposes no filesystem plugin, and the walk id is not a parameter of every command.

## Later

A bottom terminal, language intelligence, git review, find-in-files, a settings screen, and an agent that can edit. Each of those is its own design. This spec does not include them.

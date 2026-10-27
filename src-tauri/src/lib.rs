mod files;
mod filter;

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::State;

use files::FileError;
use filter::Entry;

struct Workspace {
    generation: u64,
    root: Option<PathBuf>,
}

struct AppState {
    workspace: Mutex<Workspace>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Opened {
    generation: u64,
    walk_id: u64,
    entries: Vec<Entry>,
    watch_ok: bool,
}

#[derive(Debug, Serialize)]
struct CommandError {
    code: String,
    message: String,
}

impl CommandError {
    fn from_file(err: FileError) -> Self {
        Self {
            code: err.code().to_string(),
            message: err.message().to_string(),
        }
    }

    fn code(code: &str, message: &str) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
        }
    }
}

fn require_workspace(workspace: &Workspace, generation: u64) -> Result<&Path, CommandError> {
    if workspace.generation != generation {
        return Err(CommandError::code(
            "stale_workspace",
            "That folder is no longer open.",
        ));
    }
    workspace.root.as_deref().ok_or_else(|| {
        CommandError::code("stale_workspace", "That folder is no longer open.")
    })
}

#[tauri::command]
fn open_workspace(path: String, state: State<AppState>) -> Result<Opened, CommandError> {
    let picked = PathBuf::from(&path);
    if !picked.is_dir() {
        return Err(CommandError::code(
            "io",
            "That is not a folder.",
        ));
    }
    let root = picked.canonicalize().map_err(|_| {
        CommandError::code("io", "Could not read that folder. Try another.")
    })?;
    let entries = files::list_children(&root, "").map_err(CommandError::from_file)?;

    let mut workspace = state.workspace.lock().map_err(|_| {
        CommandError::code("io", "The folder session stopped. Open it again.")
    })?;
    workspace.generation = workspace.generation.saturating_add(1);
    workspace.root = Some(root);
    Ok(Opened {
        generation: workspace.generation,
        walk_id: 0,
        entries,
        watch_ok: false,
    })
}

#[tauri::command]
fn list_children(
    generation: u64,
    path: String,
    state: State<AppState>,
) -> Result<Vec<Entry>, CommandError> {
    let workspace = state.workspace.lock().map_err(|_| {
        CommandError::code("io", "The folder session stopped. Open it again.")
    })?;
    let root = require_workspace(&workspace, generation)?;
    files::list_children(root, &path).map_err(CommandError::from_file)
}

#[tauri::command]
fn read_file(
    generation: u64,
    path: String,
    state: State<AppState>,
) -> Result<files::ReadOutcome, CommandError> {
    let workspace = state.workspace.lock().map_err(|_| {
        CommandError::code("io", "The folder session stopped. Open it again.")
    })?;
    let root = require_workspace(&workspace, generation)?;
    files::read_file(root, Path::new(&path)).map_err(CommandError::from_file)
}

#[tauri::command]
fn write_file(
    generation: u64,
    path: String,
    text: String,
    state: State<AppState>,
) -> Result<(), CommandError> {
    let workspace = state.workspace.lock().map_err(|_| {
        CommandError::code("io", "The folder session stopped. Open it again.")
    })?;
    let root = require_workspace(&workspace, generation)?;
    files::write_file(root, Path::new(&path), &text).map_err(CommandError::from_file)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            workspace: Mutex::new(Workspace {
                generation: 0,
                root: None,
            }),
        })
        .invoke_handler(tauri::generate_handler![
            open_workspace,
            list_children,
            read_file,
            write_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

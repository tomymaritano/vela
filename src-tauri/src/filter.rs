use std::path::{Path, PathBuf};

use ignore::WalkBuilder;
use serde::Serialize;

const SKIP_DIRS: &[&str] = &[".git", "node_modules", "target", "dist"];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub kind: EntryKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EntryKind {
    File,
    Directory,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FilterError {
    Io,
    OutsideWorkspace,
}

pub fn configure(builder: &mut WalkBuilder) {
    builder
        .standard_filters(false)
        .hidden(false)
        .git_ignore(true)
        .git_global(false)
        .git_exclude(true)
        .parents(true)
        .follow_links(false)
        .require_git(false)
        .filter_entry(|entry| keep(entry));
}

fn keep(entry: &ignore::DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    if entry.path_is_symlink() {
        return false;
    }
    let is_dir = entry.file_type().is_some_and(|kind| kind.is_dir());
    if !is_dir {
        return true;
    }
    let name = entry.file_name().to_string_lossy();
    !SKIP_DIRS.contains(&name.as_ref())
}

pub fn list_dir(workspace: &Path, directory: &Path) -> Result<Vec<Entry>, FilterError> {
    let workspace = workspace
        .canonicalize()
        .map_err(|_| FilterError::Io)?;
    let directory = directory
        .canonicalize()
        .map_err(|_| FilterError::Io)?;
    if !directory.starts_with(&workspace) {
        return Err(FilterError::OutsideWorkspace);
    }

    let mut builder = WalkBuilder::new(&directory);
    configure(&mut builder);
    builder.max_depth(Some(1));

    let mut entries = Vec::new();
    for item in builder.build() {
        match item {
            Ok(dent) => {
                if dent.depth() == 0 {
                    continue;
                }
                let relative = dent
                    .path()
                    .strip_prefix(&workspace)
                    .map_err(|_| FilterError::OutsideWorkspace)?;
                entries.push(Entry {
                    name: dent.file_name().to_string_lossy().into_owned(),
                    path: relative_slash(relative),
                    kind: if dent.file_type().is_some_and(|kind| kind.is_dir()) {
                        EntryKind::Directory
                    } else {
                        EntryKind::File
                    },
                });
            }
            Err(err) => {
                if err.depth() == Some(0) {
                    return Err(FilterError::Io);
                }
            }
        }
    }

    entries.sort_by(|left, right| {
        let rank = |kind: &EntryKind| match kind {
            EntryKind::Directory => 0,
            EntryKind::File => 1,
        };
        rank(&left.kind)
            .cmp(&rank(&right.kind))
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(entries)
}

fn relative_slash(path: &Path) -> String {
    path.components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

pub fn workspace_join(root: &Path, relative: &str) -> PathBuf {
    let mut out = root.to_path_buf();
    if !relative.is_empty() {
        out.push(relative);
    }
    out
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::os::unix::fs::symlink;

    use super::*;
    use tempfile::tempdir;

    #[test]
    fn lists_with_the_shared_filter() {
        let root = tempdir().unwrap();
        fs::write(root.path().join(".gitignore"), "secret.txt\npkg/\n").unwrap();
        fs::write(root.path().join("secret.txt"), "nope").unwrap();
        fs::write(root.path().join(".env"), "visible").unwrap();
        fs::write(root.path().join("keep.rs"), "fn keep() {}\n").unwrap();
        fs::create_dir(root.path().join("pkg")).unwrap();
        fs::write(root.path().join("pkg").join("skip.ts"), "nope").unwrap();
        fs::create_dir(root.path().join("node_modules")).unwrap();
        fs::write(root.path().join("node_modules").join("left.js"), "nope").unwrap();
        symlink(root.path().join("keep.rs"), root.path().join("link.rs")).unwrap();

        let names: Vec<_> = list_dir(root.path(), root.path())
            .unwrap()
            .into_iter()
            .map(|entry| entry.name)
            .collect();
        assert!(names.contains(&".env".to_string()));
        assert!(names.contains(&"keep.rs".to_string()));
        assert!(!names.iter().any(|name| name == "secret.txt"));
        assert!(!names.iter().any(|name| name == "pkg"));
        assert!(!names.iter().any(|name| name == "node_modules"));
        assert!(!names.iter().any(|name| name == "link.rs"));
    }
}

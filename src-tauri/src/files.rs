use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};

use serde::Serialize;

use crate::filter::{self, Entry, FilterError};

const HIGHLIGHT_MAX: u64 = 1024 * 1024;
const READ_MAX: u64 = 5 * 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FileError {
    OutsideWorkspace,
    Io,
}

impl FileError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::OutsideWorkspace => "outside_root",
            Self::Io => "io",
        }
    }

    pub fn message(&self) -> &'static str {
        match self {
            Self::OutsideWorkspace => "That path is outside the folder.",
            Self::Io => "Could not read the disk. Try again.",
        }
    }
}

impl From<FilterError> for FileError {
    fn from(err: FilterError) -> Self {
        match err {
            FilterError::OutsideWorkspace => Self::OutsideWorkspace,
            FilterError::Io => Self::Io,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ReadOutcome {
    Text { text: String, highlight: bool },
    TooLarge { size: u64 },
    Binary,
}

pub fn normalize_inside(root: &Path, path: &Path) -> Result<PathBuf, FileError> {
    let root = fs::canonicalize(root).map_err(|_| FileError::Io)?;
    let joined = if path.is_absolute() {
        path.to_path_buf()
    } else {
        root.join(path)
    };
    // `/var` is a symlink to `/private/var`. An absolute path can name the same
    // folder with either spelling. Follow ancestors until the canonical root,
    // then refuse any symlink at or below that root.
    let lexical = normalize_lexical(&joined);
    let components: Vec<_> = lexical.components().collect();
    let mut prefix = PathBuf::new();
    let mut index = 0;
    let mut reached_root = false;
    while index < components.len() {
        prefix.push(components[index]);
        index += 1;
        match fs::canonicalize(&prefix) {
            Ok(canonical) if canonical == root => {
                reached_root = true;
                break;
            }
            Ok(canonical) if root.starts_with(&canonical) => {}
            Ok(_) => return Err(FileError::OutsideWorkspace),
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                return Err(FileError::OutsideWorkspace);
            }
            Err(_) => return Err(FileError::Io),
        }
    }
    if !reached_root {
        return Err(FileError::OutsideWorkspace);
    }

    let mut cursor = root;
    let rest = &components[index..];
    for (offset, component) in rest.iter().enumerate() {
        let Component::Normal(name) = component else {
            return Err(FileError::OutsideWorkspace);
        };
        cursor.push(name);
        let last = offset + 1 == rest.len();
        match fs::symlink_metadata(&cursor) {
            Ok(meta) if meta.file_type().is_symlink() => {
                return Err(FileError::OutsideWorkspace);
            }
            Ok(_) => {}
            Err(err) if err.kind() == std::io::ErrorKind::NotFound && last => {
                return Ok(cursor);
            }
            Err(_) => return Err(FileError::Io),
        }
    }
    Ok(cursor)
}

fn normalize_lexical(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

pub fn read_file(root: &Path, path: &Path) -> Result<ReadOutcome, FileError> {
    let path = normalize_inside(root, path)?;
    let meta = fs::symlink_metadata(&path).map_err(|_| FileError::Io)?;
    if meta.file_type().is_symlink() || meta.is_dir() {
        return Err(FileError::Io);
    }
    let len = meta.len();
    if len > READ_MAX {
        return Ok(ReadOutcome::TooLarge { size: len });
    }

    let mut file = File::open(&path).map_err(|_| FileError::Io)?;
    let mut probe = [0_u8; 8192];
    let read = file.read(&mut probe).map_err(|_| FileError::Io)?;
    if probe[..read].contains(&0) {
        return Ok(ReadOutcome::Binary);
    }
    let mut bytes = probe[..read].to_vec();
    file.read_to_end(&mut bytes).map_err(|_| FileError::Io)?;
    match String::from_utf8(bytes) {
        Ok(text) => Ok(ReadOutcome::Text {
            highlight: len <= HIGHLIGHT_MAX,
            text,
        }),
        Err(_) => Ok(ReadOutcome::Binary),
    }
}

pub fn write_file(root: &Path, path: &Path, text: &str) -> Result<(), FileError> {
    let path = normalize_inside(root, path)?;
    if path.is_dir() {
        return Err(FileError::Io);
    }
    let name = path
        .file_name()
        .ok_or(FileError::Io)?
        .to_string_lossy()
        .into_owned();
    let temporary = path.with_file_name(format!(".{name}.vela-tmp"));
    if let Err(err) = write_temporary(&temporary, text) {
        let _ = fs::remove_file(&temporary);
        let _ = err;
        return Err(FileError::Io);
    }
    if fs::rename(&temporary, &path).is_err() {
        let _ = fs::remove_file(&temporary);
        return Err(FileError::Io);
    }
    Ok(())
}

fn write_temporary(path: &Path, text: &str) -> std::io::Result<()> {
    let mut file = File::create(path)?;
    file.write_all(text.as_bytes())?;
    file.sync_all()?;
    Ok(())
}

pub fn list_children(root: &Path, relative: &str) -> Result<Vec<Entry>, FileError> {
    let directory = filter::workspace_join(root, relative);
    Ok(filter::list_dir(root, &directory)?)
}

#[cfg(test)]
mod tests {
    use std::fs::{self, File};
    use std::io::Write;

    use super::*;
    use tempfile::tempdir;

    #[test]
    fn rejects_a_path_outside_the_workspace() {
        let root = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let err = read_file(root.path(), &outside.path().join("a.txt")).unwrap_err();
        assert_eq!(err, FileError::OutsideWorkspace);
    }

    #[test]
    fn reads_small_utf8_with_highlight() {
        let root = tempdir().unwrap();
        let file = root.path().join("main.rs");
        fs::write(&file, "fn main() {}\n").unwrap();
        let got = read_file(root.path(), &file).unwrap();
        assert_eq!(
            got,
            ReadOutcome::Text {
                text: "fn main() {}\n".to_string(),
                highlight: true,
            }
        );
    }

    #[test]
    fn reads_between_1mb_and_5mb_without_highlight() {
        let root = tempdir().unwrap();
        let file = root.path().join("big.txt");
        let mut handle = File::create(&file).unwrap();
        let chunk = vec![b'a'; 1024];
        for _ in 0..(1024 + 1) {
            handle.write_all(&chunk).unwrap();
        }
        match read_file(root.path(), &file).unwrap() {
            ReadOutcome::Text { highlight, text } => {
                assert!(!highlight);
                assert!(text.len() > 1024 * 1024);
            }
            other => panic!("expected text, got {other:?}"),
        }
    }

    #[test]
    fn does_not_read_a_body_over_5mb() {
        let root = tempdir().unwrap();
        let file = root.path().join("huge.txt");
        let handle = File::create(&file).unwrap();
        let size = READ_MAX + 1;
        handle.set_len(size).unwrap();
        match read_file(root.path(), &file).unwrap() {
            ReadOutcome::TooLarge { size: got } => assert_eq!(got, size),
            other => panic!("expected too large, got {other:?}"),
        }
    }

    #[test]
    fn treats_nul_and_invalid_utf8_as_binary() {
        let root = tempdir().unwrap();
        let nul = root.path().join("a.bin");
        fs::write(&nul, b"hello\0world").unwrap();
        assert_eq!(read_file(root.path(), &nul).unwrap(), ReadOutcome::Binary);

        let bad = root.path().join("b.bin");
        fs::write(&bad, [0xff, 0xfe]).unwrap();
        assert_eq!(read_file(root.path(), &bad).unwrap(), ReadOutcome::Binary);
    }

    #[test]
    fn replaces_a_file_and_leaves_no_temporary() {
        let root = tempdir().unwrap();
        let file = root.path().join("note.txt");
        fs::write(&file, "old").unwrap();
        write_file(root.path(), &file, "new").unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "new");
        assert!(!root.path().join(".note.txt.vela-tmp").exists());
    }

    #[test]
    fn a_failed_write_keeps_the_original() {
        let root = tempdir().unwrap();
        let directory = root.path().join("folder");
        fs::create_dir(&directory).unwrap();
        let err = write_file(root.path(), &directory, "nope").unwrap_err();
        assert_eq!(err, FileError::Io);
        assert!(directory.is_dir());
        let leftovers: Vec<_> = fs::read_dir(root.path())
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .filter(|name| name.contains("vela-tmp"))
            .collect();
        assert!(leftovers.is_empty());
    }
}

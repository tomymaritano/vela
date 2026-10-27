import { invoke } from "@tauri-apps/api/core"

import { copy } from "./copy"
import type { CommandFailure, Entry, Opened, ReadOutcome } from "./types"

function asFailure(error: unknown): CommandFailure {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    const failure = error as { code: unknown; message: unknown }
    if (typeof failure.code === "string" && typeof failure.message === "string") {
      return { code: failure.code, message: failure.message }
    }
  }
  return { code: "io", message: copy.ioFallback }
}

export async function openWorkspace(path: string): Promise<Opened> {
  try {
    return await invoke<Opened>("open_workspace", { path })
  } catch (error) {
    throw asFailure(error)
  }
}

export async function listChildren(generation: number, path: string): Promise<Entry[]> {
  try {
    return await invoke<Entry[]>("list_children", { generation, path })
  } catch (error) {
    throw asFailure(error)
  }
}

export async function readFile(generation: number, path: string): Promise<ReadOutcome> {
  try {
    return await invoke<ReadOutcome>("read_file", { generation, path })
  } catch (error) {
    throw asFailure(error)
  }
}

export async function writeFile(generation: number, path: string, text: string): Promise<void> {
  try {
    await invoke("write_file", { generation, path, text })
  } catch (error) {
    throw asFailure(error)
  }
}

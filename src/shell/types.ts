export type Entry = {
  name: string
  path: string
  kind: "file" | "directory"
}

export type ReadOutcome =
  | { kind: "text"; text: string; highlight: boolean }
  | { kind: "too_large"; size: number }
  | { kind: "binary" }

export type Opened = {
  generation: number
  walkId: number
  entries: Entry[]
  watchOk: boolean
}

export type CommandFailure = {
  code: string
  message: string
}

export type TextTab = {
  kind: "text"
  path: string
  name: string
  text: string
  saved: string
  saveId: number
  documentId: number
  highlight: boolean
}

export type NoticeTab = {
  kind: "notice"
  path: string
  name: string
  notice: string
}

export type Tab = TextTab | NoticeTab

export function fileName(path: string): string {
  const slash = path.lastIndexOf("/")
  return slash === -1 ? path : path.slice(slash + 1)
}

export function isDirty(tab: TextTab): boolean {
  return tab.text !== tab.saved
}

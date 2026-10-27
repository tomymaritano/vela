export const commands = [
  { id: "open-folder", label: "Open Folder" },
  { id: "save", label: "Save" },
  { id: "close-tab", label: "Close Tab" },
  { id: "go-to-line", label: "Go to Line" },
  { id: "toggle-sidebar", label: "Show or Hide the Tree" },
  { id: "reload", label: "Reload from Disk" },
  { id: "reindex", label: "Reindex" },
  { id: "new-conversation", label: "New Conversation" },
] as const

export type CommandId = (typeof commands)[number]["id"]

export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

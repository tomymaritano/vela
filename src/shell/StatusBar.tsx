import { copy } from "./copy"

export function StatusBar({ status, folderName }: { status: string; folderName: string | null }) {
  return (
    <footer className="status">
      <span>{status}</span>
      <span className="status-folder">{folderName ?? copy.statusNoFolder}</span>
    </footer>
  )
}

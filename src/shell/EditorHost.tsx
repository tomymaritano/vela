import { EditorPane } from "../editor/EditorPane"
import { copy } from "./copy"
import type { TextTab } from "./types"

export function EditorHost({
  tab,
  notice,
  jumpToken,
  jumpLine,
  onChange,
}: {
  tab: TextTab | null
  notice: string | null
  jumpToken: number
  jumpLine: number
  onChange: (text: string) => void
}) {
  if (notice) return <div className="notice">{notice}</div>
  if (!tab) return <div className="notice">{copy.pickFile}</div>
  return (
    <EditorPane
      path={tab.path}
      text={tab.text}
      highlight={tab.highlight}
      documentId={tab.documentId}
      jumpToken={jumpToken}
      jumpLine={jumpLine}
      onChange={onChange}
    />
  )
}

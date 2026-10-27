import type { Entry } from "./types"
import { Chevron } from "./icons"

type Props = {
  entries: Entry[]
  depth: number
  expanded: Set<string>
  childrenByPath: Record<string, Entry[]>
  activePath: string | null
  onFile: (path: string) => void
  onDirectory: (path: string) => void
}

export function Tree({ entries, depth, expanded, childrenByPath, activePath, onFile, onDirectory }: Props) {
  return (
    <>
      {entries.map((entry) => {
        const isOpen = expanded.has(entry.path)
        const directory = entry.kind === "directory"
        return (
          <div key={entry.path}>
            <button
              type="button"
              className={entry.path === activePath ? "tree-row active" : "tree-row"}
              style={{ paddingLeft: `calc(var(--space-2) + ${depth} * var(--space-3))` }}
              onClick={() => (directory ? onDirectory(entry.path) : onFile(entry.path))}
            >
              {directory ? <Chevron open={isOpen} /> : <span className="icon-slot" />}
              <span className="tree-name">{entry.name}</span>
            </button>
            {directory && isOpen && childrenByPath[entry.path] && (
              <Tree
                entries={childrenByPath[entry.path]}
                depth={depth + 1}
                expanded={expanded}
                childrenByPath={childrenByPath}
                activePath={activePath}
                onFile={onFile}
                onDirectory={onDirectory}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

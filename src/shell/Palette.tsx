import { copy } from "./copy"
import type { CommandId } from "./commands"

type Props = {
  mode: "commands" | "files"
  lineMode: boolean
  query: string
  commands: { id: CommandId; label: string }[]
  onQuery: (value: string) => void
  onClose: () => void
  onRun: (id: CommandId) => void
  onLine: (line: number) => void
}

export function Palette({ mode, lineMode, query, commands, onQuery, onClose, onRun, onLine }: Props) {
  const placeholder = lineMode ? copy.paletteLine : mode === "files" ? copy.paletteFiles : copy.paletteCommands
  return (
    <div
      className="palette-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="palette"
        role="dialog"
        aria-label={placeholder}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          placeholder={placeholder}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose()
            if (event.key === "Enter" && lineMode) {
              const line = Number.parseInt(query, 10)
              if (Number.isFinite(line)) onLine(line)
              onClose()
            }
            if (event.key === "Enter" && mode === "commands" && !lineMode && commands[0]) {
              onRun(commands[0].id)
            }
          }}
        />
        {mode === "files" ? (
          <div className="hint">{copy.indexMissing}</div>
        ) : lineMode ? null : (
          commands.map((command) => (
            <button key={command.id} type="button" onClick={() => onRun(command.id)}>
              {command.label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

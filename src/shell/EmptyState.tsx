import { copy } from "./copy"
import { Lockup } from "./Lockup"

export function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="empty">
      <div className="empty-stack">
        <Lockup />
        <p>{copy.statusIdle}</p>
        <button className="button-primary" type="button" onClick={onOpen}>
          {copy.openFolder}
        </button>
      </div>
    </div>
  )
}

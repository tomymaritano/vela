import { copy } from "./copy"
import { Mark } from "./Lockup"

export function AgentPanel() {
  return (
    <aside className="agent">
      <h2 className="agent-label">
        <Mark />
        {copy.agentTitle}
      </h2>
      <p>{copy.agentBody}</p>
    </aside>
  )
}

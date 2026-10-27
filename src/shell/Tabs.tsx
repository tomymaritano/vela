import { isDirty, type Tab } from "./types"

export function Tabs({
  tabs,
  activePath,
  onSelect,
}: {
  tabs: Tab[]
  activePath: string | null
  onSelect: (path: string) => void
}) {
  return (
    <div className="tabs">
      {tabs.map((tab) => {
        const dirty = tab.kind === "text" && isDirty(tab)
        return (
          <button
            key={tab.path}
            type="button"
            className={tab.path === activePath ? "tab active" : "tab"}
            onClick={() => onSelect(tab.path)}
          >
            <span className={dirty ? "tab-name dirty" : "tab-name"}>{tab.name}</span>
          </button>
        )
      })}
    </div>
  )
}

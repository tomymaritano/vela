import { AgentPanel } from "./AgentPanel"
import { EditorHost } from "./EditorHost"
import { EmptyState } from "./EmptyState"
import { Palette } from "./Palette"
import { StatusBar } from "./StatusBar"
import { Tabs } from "./Tabs"
import { Tree } from "./Tree"
import { useWorkspace } from "./useWorkspace"
import "./shell.css"

export default function App() {
  const workspace = useWorkspace()
  return (
    <div className="app">
      <div className="columns">
        {workspace.showTree && (
          <aside className="tree">
            {workspace.folderName !== null && (
              <Tree
                entries={workspace.rootEntries}
                depth={0}
                expanded={workspace.expanded}
                childrenByPath={workspace.children}
                activePath={workspace.activePath}
                onFile={(path) => void workspace.openPath(path)}
                onDirectory={(path) => void workspace.toggleDirectory(path)}
              />
            )}
          </aside>
        )}
        <section className="editor-column">
          {workspace.folderName === null ? (
            <EmptyState onOpen={() => void workspace.openFolder()} />
          ) : (
            <>
              <Tabs
                tabs={workspace.tabs}
                activePath={workspace.activePath}
                onSelect={workspace.setActivePath}
              />
              <EditorHost
                tab={workspace.active?.kind === "text" ? workspace.active : null}
                notice={workspace.active?.kind === "notice" ? workspace.active.notice : null}
                jumpToken={workspace.jump.token}
                jumpLine={workspace.jump.line}
                onChange={workspace.updateActiveText}
              />
            </>
          )}
        </section>
        <AgentPanel />
      </div>
      <StatusBar status={workspace.status} folderName={workspace.folderName} />
      {workspace.palette && (
        <Palette
          mode={workspace.palette}
          lineMode={workspace.lineMode}
          query={workspace.query}
          commands={workspace.shownCommands}
          onQuery={workspace.setQuery}
          onClose={workspace.closePalette}
          onRun={workspace.runCommand}
          onLine={workspace.goToLine}
        />
      )}
    </div>
  )
}

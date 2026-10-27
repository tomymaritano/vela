import { open } from "@tauri-apps/plugin-dialog"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { listChildren, openWorkspace, readFile, writeFile } from "./api"
import { commands, fold, type CommandId } from "./commands"
import { copy } from "./copy"
import { fileName, type CommandFailure, type Entry, type Tab } from "./types"

type Palette = "commands" | "files" | null

export function useWorkspace() {
  const [folderName, setFolderName] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)
  const [showTree, setShowTree] = useState(true)
  const [rootEntries, setRootEntries] = useState<Entry[]>([])
  const [children, setChildren] = useState<Record<string, Entry[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [status, setStatus] = useState(copy.statusIdle)
  const [palette, setPalette] = useState<Palette>(null)
  const [query, setQuery] = useState("")
  const [lineMode, setLineMode] = useState(false)
  const [jump, setJump] = useState({ token: 0, line: 1 })
  const generationRef = useRef(0)
  generationRef.current = generation

  const active = tabs.find((tab) => tab.path === activePath) ?? null

  const fail = useCallback((failure: CommandFailure) => {
    if (failure.code === "stale_workspace") return
    setStatus(failure.message)
  }, [])

  const openFolder = useCallback(async () => {
    const picked = await open({ directory: true, multiple: false })
    if (picked === null || Array.isArray(picked)) return
    try {
      const opened = await openWorkspace(picked)
      setFolderName(fileName(picked))
      setGeneration(opened.generation)
      setRootEntries(opened.entries)
      setChildren({})
      setExpanded(new Set())
      setTabs([])
      setActivePath(null)
      setStatus(opened.watchOk ? copy.statusOpen : copy.statusOpenNoWatch)
    } catch (error) {
      fail(error as CommandFailure)
    }
  }, [fail])

  const closeTab = useCallback((path: string) => {
    setTabs((current) => {
      const next = current.filter((tab) => tab.path !== path)
      setActivePath((activeNow) => {
        if (activeNow !== path) return activeNow
        return next[next.length - 1]?.path ?? null
      })
      return next
    })
  }, [])

  const openPath = useCallback(
    async (path: string) => {
      const existing = tabs.find((tab) => tab.path === path)
      if (existing) {
        setActivePath(path)
        return
      }
      const requested = generation
      try {
        const outcome = await readFile(requested, path)
        if (requested !== generationRef.current) return
        const name = fileName(path)
        const tab: Tab =
          outcome.kind === "text"
            ? {
                kind: "text",
                path,
                name,
                text: outcome.text,
                saved: outcome.text,
                saveId: 0,
                documentId: 1,
                highlight: outcome.highlight,
              }
            : {
                kind: "notice",
                path,
                name,
                notice:
                  outcome.kind === "binary"
                    ? copy.binary
                    : copy.tooLarge((outcome.size / (1024 * 1024)).toFixed(1)),
              }
        setTabs((current) => [...current, tab])
        setActivePath(path)
      } catch (error) {
        fail(error as CommandFailure)
      }
    },
    [fail, generation, tabs],
  )

  const toggleDirectory = useCallback(
    async (path: string) => {
      if (expanded.has(path)) {
        setExpanded((current) => {
          const next = new Set(current)
          next.delete(path)
          return next
        })
        return
      }
      if (!children[path]) {
        const requested = generation
        try {
          const entries = await listChildren(requested, path)
          if (requested !== generationRef.current) return
          setChildren((current) => ({ ...current, [path]: entries }))
        } catch (error) {
          fail(error as CommandFailure)
          return
        }
      }
      setExpanded((current) => new Set(current).add(path))
    },
    [children, expanded, fail, generation],
  )

  const saveActive = useCallback(async () => {
    if (!active || active.kind !== "text") return
    const requested = generation
    const saveId = active.saveId + 1
    const text = active.text
    const path = active.path
    setTabs((current) =>
      current.map((tab) => (tab.path === path && tab.kind === "text" ? { ...tab, saveId } : tab)),
    )
    try {
      await writeFile(requested, path, text)
      if (requested !== generationRef.current) return
      setTabs((current) =>
        current.map((tab) => {
          if (tab.path !== path || tab.kind !== "text") return tab
          if (tab.saveId !== saveId || tab.text !== text) return tab
          return { ...tab, saved: text }
        }),
      )
      setStatus(copy.statusSaved)
    } catch (error) {
      fail(error as CommandFailure)
    }
  }, [active, fail, generation])

  const reloadActive = useCallback(async () => {
    if (!active || active.kind !== "text") return
    const requested = generation
    const path = active.path
    try {
      const outcome = await readFile(requested, path)
      if (requested !== generationRef.current) return
      if (outcome.kind !== "text") {
        setStatus(copy.statusNotText)
        return
      }
      setTabs((current) =>
        current.map((tab) =>
          tab.path === path && tab.kind === "text"
            ? {
                ...tab,
                text: outcome.text,
                saved: outcome.text,
                highlight: outcome.highlight,
                documentId: tab.documentId + 1,
              }
            : tab,
        ),
      )
      setStatus(copy.statusReloaded)
    } catch (error) {
      fail(error as CommandFailure)
    }
  }, [active, fail, generation])

  const closePalette = useCallback(() => {
    setPalette(null)
    setLineMode(false)
  }, [])

  const runCommand = useCallback(
    (id: CommandId) => {
      if (id === "open-folder") void openFolder()
      if (id === "save") void saveActive()
      if (id === "close-tab" && activePath) closeTab(activePath)
      if (id === "toggle-sidebar") setShowTree((current) => !current)
      if (id === "reload") void reloadActive()
      if (id === "go-to-line") {
        setLineMode(true)
        setQuery("")
        return
      }
      if (id === "reindex") setStatus(copy.statusIndexOff)
      if (id === "new-conversation") setStatus(copy.statusAgentOff)
      closePalette()
    },
    [activePath, closePalette, closeTab, openFolder, reloadActive, saveActive],
  )

  const updateActiveText = useCallback(
    (text: string) => {
      if (!active || active.kind !== "text") return
      const path = active.path
      setTabs((current) =>
        current.map((tab) => (tab.path === path && tab.kind === "text" ? { ...tab, text } : tab)),
      )
    },
    [active],
  )

  const goToLine = useCallback((line: number) => {
    setJump((current) => ({ token: current.token + 1, line }))
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.metaKey) return
      const key = event.key.toLowerCase()
      if (key === "s") {
        event.preventDefault()
        void saveActive()
      } else if (key === "b") {
        event.preventDefault()
        setShowTree((current) => !current)
      } else if (key === "p" && event.shiftKey) {
        event.preventDefault()
        setPalette("commands")
        setQuery("")
        setLineMode(false)
      } else if (key === "p") {
        event.preventDefault()
        setPalette("files")
        setQuery("")
        setLineMode(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [saveActive])

  const shownCommands = useMemo(() => {
    const needle = fold(query.trim())
    return commands.filter((command) => fold(command.label).includes(needle))
  }, [query])

  return {
    folderName,
    showTree,
    rootEntries,
    children,
    expanded,
    tabs,
    active,
    activePath,
    status,
    palette,
    query,
    lineMode,
    jump,
    shownCommands,
    setActivePath,
    setQuery,
    openFolder,
    openPath,
    toggleDirectory,
    updateActiveText,
    runCommand,
    closePalette,
    goToLine,
  }
}

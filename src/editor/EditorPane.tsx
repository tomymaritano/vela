import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { HighlightStyle, bracketMatching, syntaxHighlighting } from "@codemirror/language"
import { searchKeymap } from "@codemirror/search"
import { EditorState } from "@codemirror/state"
import { EditorView, drawSelection, keymap, lineNumbers } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import { useEffect, useRef } from "react"

import { languageFor } from "./languages"

const theme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "var(--bg-000)",
      color: "var(--ink-100)",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--size-ui)",
      lineHeight: "1.5",
    },
    ".cm-content": { caretColor: "var(--accent-100)" },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent-100)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
      { backgroundColor: "var(--bg-400)" },
    ".cm-gutters": {
      backgroundColor: "var(--bg-000)",
      color: "var(--ink-400)",
      border: "none",
    },
    ".cm-activeLine": { backgroundColor: "var(--bg-100)" },
    ".cm-activeLineGutter": { backgroundColor: "var(--bg-100)", color: "var(--ink-300)" },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--syntax-keyword)" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.comment, color: "var(--syntax-comment)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--syntax-function)" },
  { tag: [tags.typeName, tags.className, tags.tagName], color: "var(--syntax-type)" },
])

type Props = {
  path: string
  text: string
  highlight: boolean
  documentId: number
  jumpToken: number
  jumpLine: number
  onChange: (text: string) => void
}

export function EditorPane({ path, text, highlight: highlightOn, documentId, jumpToken, jumpLine, onChange }: Props) {
  const parent = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const host = parent.current
    if (!host) return
    const language = highlightOn ? languageFor(path) : null
    const extensions = [
      lineNumbers(),
      drawSelection(),
      history(),
      bracketMatching(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
    ]
    if (highlightOn) {
      extensions.push(EditorView.lineWrapping)
    }
    if (language) {
      extensions.push(language, syntaxHighlighting(highlight, { fallback: true }))
    }
    const state = EditorState.create({ doc: text, extensions })
    const editor = new EditorView({ state, parent: host })
    view.current = editor
    return () => {
      editor.destroy()
      view.current = null
    }
  }, [path, highlightOn, documentId])

  useEffect(() => {
    const editor = view.current
    if (!editor || jumpToken === 0) return
    const line = Math.min(Math.max(jumpLine, 1), editor.state.doc.lines)
    const position = editor.state.doc.line(line).from
    editor.dispatch({
      selection: { anchor: position },
      scrollIntoView: true,
    })
    editor.focus()
  }, [jumpToken, jumpLine])

  return <div className="editor-surface" ref={parent} />
}

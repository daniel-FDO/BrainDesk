import { useCallback, useEffect, useRef, useState } from 'react'
import { createNote, deleteNote, listNotes, plainPreview, updateNote, type NotePatch } from '../lib/workspaceApi.ts'
import type { Note, Subject } from '../types.ts'

export type LoadStatus = 'loading' | 'ready' | 'failed'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** What the editor can change on a note. */
export type NoteEdit = Partial<Pick<Note, 'title' | 'subject' | 'body' | 'tags' | 'favorite'>>

/** How long typing must pause before an edit is sent to the API. */
const SAVE_DELAY_MS = 700
const EXCERPT_LENGTH = 160

function excerptOf(body: string) {
  const flat = plainPreview(body.split(/\s+/).filter(Boolean).join(' '))
  return flat.length <= EXCERPT_LENGTH ? flat : `${flat.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`
}

function toPatch(edit: NoteEdit): NotePatch {
  const patch: NotePatch = {}
  // The API rejects an empty title; keep it local until the user types one.
  if (edit.title !== undefined && edit.title.trim()) patch.title = edit.title
  if (edit.subject !== undefined) patch.subject = edit.subject
  if (edit.body !== undefined) patch.content = edit.body
  if (edit.tags !== undefined) patch.tags = edit.tags
  if (edit.favorite !== undefined) patch.is_favorite = edit.favorite
  return patch
}

/**
 * The signed-in user's notes. Edits show instantly and are batched into one PATCH
 * per note after a short pause in typing (the editor's "Autosaved" badge).
 */
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const pending = useRef(new Map<string, { patch: NotePatch; timer: number }>())

  useEffect(() => {
    const controller = new AbortController()
    listNotes(controller.signal)
      .then((loaded) => {
        setNotes(loaded)
        setStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('failed')
      })
    return () => controller.abort()
  }, [])

  const flush = useCallback(async (id: string) => {
    const entry = pending.current.get(id)
    if (!entry) return
    window.clearTimeout(entry.timer)
    pending.current.delete(id)
    if (Object.keys(entry.patch).length === 0) return
    setSaveState('saving')
    try {
      await updateNote(id, entry.patch)
      if (pending.current.size === 0) setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [])

  // Send anything still waiting when the workspace unmounts (e.g. on sign out).
  useEffect(() => {
    const waiting = pending.current
    return () => {
      for (const id of [...waiting.keys()]) void flush(id)
    }
  }, [flush])

  const update = useCallback(
    (id: string, edit: NoteEdit) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                ...edit,
                excerpt: edit.body !== undefined ? excerptOf(edit.body) : n.excerpt,
                updatedAt: new Date().toISOString(),
              }
            : n,
        ),
      )
      const entry = pending.current.get(id)
      if (entry) window.clearTimeout(entry.timer)
      const patch = { ...entry?.patch, ...toPatch(edit) }
      const timer = window.setTimeout(() => void flush(id), SAVE_DELAY_MS)
      pending.current.set(id, { patch, timer })
      setSaveState('saving')
    },
    [flush],
  )

  const create = useCallback(async (subject: Subject = 'Computer Science') => {
    const note = await createNote({ title: 'Untitled note', subject })
    setNotes((prev) => [note, ...prev])
    return note
  }, [])

  const remove = useCallback(async (id: string) => {
    const entry = pending.current.get(id)
    if (entry) window.clearTimeout(entry.timer)
    pending.current.delete(id)
    await deleteNote(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return { notes, status, saveState, update, create, remove }
}

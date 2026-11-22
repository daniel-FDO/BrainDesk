import { useCallback, useEffect, useState } from 'react'
import { listUpcomingSessions } from '../lib/workspaceApi.ts'
import type { StudySession } from '../types.ts'

/**
 * Sessions that haven't started yet, soonest first. Shared by the Dashboard, the
 * notifications menu and the assistant; the Planner calls `refresh` after changes.
 */
export function useUpcomingSessions() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listUpcomingSessions(controller.signal)
      .then(setSessions)
      .catch(() => {
        // Leave the last good list; a 401 has already sent the user to login.
      })
    return () => controller.abort()
  }, [version])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  return { sessions, refresh }
}

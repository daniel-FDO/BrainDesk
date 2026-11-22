import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ZenOverlay } from '../components/ZenOverlay.tsx'
import { autoBreakMinutes } from '../lib/breaks.ts'
import { useFocusTimer } from './FocusTimer.tsx'

interface BreakSession {
  id: number
  minutes: number
  /** Where the reveal circle grows from (the button that was pressed). */
  x: number
  y: number
}

interface MindfulBreakValue {
  active: boolean
  /** Starts a break; `from` is the element it should visually grow out of. */
  open: (minutes: number, from?: Element | null) => void
  close: () => void
}

const MindfulBreakContext = createContext<MindfulBreakValue | null>(null)
const EXIT_MS = 550

function isTyping() {
  const el = document.activeElement
  return el instanceof HTMLElement && (el.isContentEditable || el.matches('input, textarea, select'))
}

export function MindfulBreakProvider({ children }: { children: ReactNode }) {
  const timer = useFocusTimer()
  const [session, setSession] = useState<BreakSession | null>(null)
  const [leaving, setLeaving] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  const open = useCallback((minutes: number, from?: Element | null) => {
    const rect = from?.getBoundingClientRect()
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setLeaving(false)
    setSession({
      id: Date.now(),
      minutes,
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    })
  }, [])

  const close = useCallback(() => setLeaving(true), [])

  // Let the exit animation play, then unmount.
  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => {
      setSession(null)
      setLeaving(false)
    }, EXIT_MS)
    return () => window.clearTimeout(id)
  }, [leaving])

  // The desk behind blurs away while the break is showing…
  const showing = session !== null && !leaving
  useEffect(() => {
    if (!showing) return
    document.documentElement.classList.add('is-zen')
    return () => document.documentElement.classList.remove('is-zen')
  }, [showing])

  // …and can't be tabbed into until the break is fully gone.
  const mounted = session !== null
  useEffect(() => {
    if (!mounted) return
    const shell = document.querySelector('.app')
    shell?.setAttribute('inert', '')
    return () => {
      shell?.removeAttribute('inert')
      returnFocus.current?.focus({ preventScroll: true })
    }
  }, [mounted])

  // When a Pomodoro finishes, maybe roll straight into a break.
  const focusDone = timer.mode === 'pomodoro' && timer.remaining === 0
  const shortBreak = timer.durations.short
  useEffect(() => {
    if (!focusDone) return
    const id = window.setTimeout(() => {
      const minutes = autoBreakMinutes({
        shortBreak,
        tabVisible: document.visibilityState === 'visible',
        typing: isTyping(),
      })
      if (minutes !== null) open(minutes)
    }, 1200)
    return () => window.clearTimeout(id)
  }, [focusDone, shortBreak, open])

  const value = useMemo<MindfulBreakValue>(() => ({ active: showing, open, close }), [showing, open, close])

  return (
    <MindfulBreakContext.Provider value={value}>
      {children}
      {session && (
        <ZenOverlay
          key={session.id}
          minutes={session.minutes}
          originX={session.x}
          originY={session.y}
          leaving={leaving}
          onClose={close}
        />
      )}
    </MindfulBreakContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMindfulBreak() {
  const ctx = useContext(MindfulBreakContext)
  if (!ctx) throw new Error('useMindfulBreak must be used inside <MindfulBreakProvider>')
  return ctx
}

/**
 * Light / dark / system appearance. The choice lives in localStorage and is
 * applied as <html data-theme="light|dark">; tokens.css swaps every colour from
 * that one attribute. index.html runs the same logic before first paint so a
 * dark-mode user never sees a white flash.
 */
import { readJson, writeJson } from './storage.ts'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'braindesk.theme'
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readChoice(): ThemeChoice {
  const saved = readJson(KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

let choice: ThemeChoice = readChoice()

const resolve = (c: ThemeChoice): ResolvedTheme => (c === 'system' ? (systemDark.matches ? 'dark' : 'light') : c)

function apply() {
  document.documentElement.dataset.theme = resolve(choice)
  listeners.forEach((listener) => listener())
}

// Following the OS only matters while the user hasn't picked a side.
systemDark.addEventListener('change', () => choice === 'system' && apply())
apply()

export const getThemeChoice = () => choice
export const getResolvedTheme = () => resolve(choice)

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setThemeChoice(next: ThemeChoice) {
  choice = next
  if (next === 'system') writeJson(KEY, null)
  else writeJson(KEY, next)
  apply()
}

/**
 * Changes theme with a circular "ink spill" growing out of `origin`, using the
 * View Transitions API where the browser has it. Elsewhere, or with reduced
 * motion, the swap is instant.
 */
export function switchTheme(next: ThemeChoice, origin?: Element | null) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!origin || reduce || resolve(next) === getResolvedTheme() || !document.startViewTransition) {
    setThemeChoice(next)
    return
  }
  const rect = origin.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = document.startViewTransition(() => setThemeChoice(next))
  transition.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {})
}

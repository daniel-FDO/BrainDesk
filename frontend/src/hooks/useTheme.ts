import { useSyncExternalStore } from 'react'
import { getResolvedTheme, getThemeChoice, subscribeTheme } from '../lib/theme.ts'

/** The saved choice ("system" included) and what it currently resolves to. */
export function useTheme() {
  const choice = useSyncExternalStore(subscribeTheme, getThemeChoice)
  const resolved = useSyncExternalStore(subscribeTheme, getResolvedTheme)
  return { choice, resolved }
}

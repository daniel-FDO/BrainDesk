import { useSyncExternalStore } from 'react'
import { getToken, subscribeToAuth } from '../lib/api.ts'

/** True while an access token is stored; re-renders on login, logout and forced logout (401). */
export function useIsLoggedIn() {
  return useSyncExternalStore(subscribeToAuth, () => getToken() !== null, () => false)
}

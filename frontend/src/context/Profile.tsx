import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMe, updateMe } from '../lib/api.ts'

export interface Profile {
  name: string
  track: string
}

interface ProfileValue extends Profile {
  firstName: string
  /** Saves to the backend; rejects with the server's message if that fails. */
  update: (profile: Profile) => Promise<void>
}

const ProfileContext = createContext<ProfileValue | null>(null)

/**
 * The signed-in user's profile, loaded from GET /users/me. It only mounts after login,
 * and unmounts on logout, so the next account never sees the previous one's name.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ name: '', track: '' })

  useEffect(() => {
    const controller = new AbortController()
    getMe(controller.signal)
      .then((me) => setProfile({ name: me.name, track: me.track }))
      .catch(() => {
        // A 401 already sent the user back to login; anything else leaves the profile blank.
      })
    return () => controller.abort()
  }, [])

  const value = useMemo<ProfileValue>(
    () => ({
      ...profile,
      firstName: profile.name.trim().split(/\s+/)[0],
      update: async (next) => {
        const me = await updateMe(next)
        setProfile({ name: me.name, track: me.track })
      },
    }),
    [profile],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>')
  return ctx
}

/** Date helpers for turning the API's ISO timestamps into the UI's short labels. */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Local calendar day as "2026-11-22" (used for agenda due dates and day grouping). */
export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Monday 00:00 (local) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7 // Monday = 0
  return addDays(day, -offset)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes())
}

export const clock = (date: Date) => date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })

export const monthDay = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** "Just now", "24m ago", "2h ago", "Yesterday", "3d ago", "12 Oct". */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  if (diff < MINUTE) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY && new Date(then).getDate() === new Date(now).getDate()) return `${Math.floor(diff / HOUR)}h ago`
  const days = Math.round((startOfDay(new Date(now)).getTime() - startOfDay(new Date(then)).getTime()) / DAY)
  if (days <= 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return monthDay(new Date(then))
}

/** "Today, 16:00", "Tomorrow, 10:00", "Thursday, 14:30", "3 Dec, 09:00". */
export function sessionWhen(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY)
  const time = clock(date)
  if (days === 0) return `Today, ${time}`
  if (days === 1) return `Tomorrow, ${time}`
  if (days > 1 && days < 7) return `${date.toLocaleDateString('en-GB', { weekday: 'long' })}, ${time}`
  return `${monthDay(date)}, ${time}`
}

export const isToday = (iso: string) => dateKey(new Date(iso)) === dateKey(new Date())

/** The user's IANA zone, so the backend buckets study hours into the right local days. */
export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

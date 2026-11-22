/**
 * Typed calls for the signed-in user's workspace data, plus mappers from the
 * API's snake_case records to the shapes the pages render. Every call goes
 * through apiRequest, so it carries the Bearer token and logs out on 401.
 */
import type {
  AgendaTask,
  BlockStatus,
  LearningBlock,
  Note,
  Resource,
  ResourceType,
  StudySession,
  Subject,
  Tone,
} from '../types.ts'
import { apiRequest } from './api.ts'
import { dateKey, monthDay, clock, relativeTime, sessionWhen, timeZone } from './time.ts'

const json = (body: unknown) => JSON.stringify(body)

/** Card previews show prose, not Markdown syntax: drops heading hashes, quote markers, bold markers and backticks (a lone * as in “A*” stays). */
export const plainPreview = (text: string) => text.replace(/(^|\s)(#{1,6}|>)\s+/g, '$1').replace(/\*\*|__|`/g, '').trim()

// ---------------------------------------------------------------------------
// Notes

interface ApiNote {
  id: number
  title: string
  subject: Subject
  content: string
  excerpt: string
  tags: string[]
  is_favorite: boolean
  updated_at: string
}

const toNote = (n: ApiNote): Note => ({
  id: String(n.id),
  subject: n.subject,
  title: n.title,
  body: n.content,
  excerpt: plainPreview(n.excerpt),
  tags: n.tags,
  favorite: n.is_favorite,
  updatedAt: n.updated_at,
})

/** The fields a note edit can change, in the API's names. */
export interface NotePatch {
  title?: string
  subject?: Subject
  content?: string
  tags?: string[]
  is_favorite?: boolean
}

export const listNotes = (signal?: AbortSignal) =>
  apiRequest<ApiNote[]>('/notes?sort=updated&limit=200', { signal }).then((notes) => notes.map(toNote))

export const createNote = (input: { title?: string; subject: Subject }) =>
  apiRequest<ApiNote>('/notes', { method: 'POST', body: json(input) }).then(toNote)

export const updateNote = (id: string, patch: NotePatch) =>
  apiRequest<ApiNote>(`/notes/${id}`, { method: 'PATCH', body: json(patch) }).then(toNote)

export const deleteNote = (id: string) => apiRequest<void>(`/notes/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Study sessions (Dashboard "Upcoming", notifications, Planner blocks)

interface ApiSession {
  id: number
  title: string
  subject: Subject
  starts_at: string
  duration_minutes: number
  goal: string | null
  detail: string | null
  status: BlockStatus
  reminder: boolean
  tag: string
  tone: Tone
}

const toSession = (s: ApiSession, index: number): StudySession => ({
  id: String(s.id),
  subject: s.subject,
  tag: s.tag,
  tone: s.tone,
  title: s.title,
  minutes: s.duration_minutes,
  goal: s.goal ?? s.detail ?? '',
  startsAt: s.starts_at,
  when: sessionWhen(s.starts_at),
  isNext: index === 0,
})

const toBlock = (s: ApiSession): LearningBlock => {
  const start = new Date(s.starts_at)
  return {
    id: String(s.id),
    startsAt: s.starts_at,
    dateKey: dateKey(start),
    when: `${start.toLocaleDateString('en-GB', { weekday: 'short' })}, ${monthDay(start)} • ${clock(start)}`,
    subject: s.subject,
    tag: s.tag,
    minutes: s.duration_minutes,
    tone: s.tone,
    status: s.status,
    title: s.title,
    detail: s.goal ?? s.detail ?? '',
    reminder: s.reminder,
  }
}

export const listUpcomingSessions = (signal?: AbortSignal) =>
  apiRequest<ApiSession[]>('/study-sessions?upcoming=true&limit=20', { signal }).then((list) => list.map(toSession))

export function listWeekBlocks(weekStart: Date, signal?: AbortSignal) {
  const end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
  const params = new URLSearchParams({
    starts_from: weekStart.toISOString(),
    starts_before: end.toISOString(),
    limit: '200',
  })
  return apiRequest<ApiSession[]>(`/study-sessions?${params}`, { signal }).then((list) => list.map(toBlock))
}

export interface NewSession {
  title: string
  subject: Subject
  starts_at: string
  duration_minutes: number
  goal?: string
}

export const createSession = (input: NewSession) =>
  apiRequest<ApiSession>('/study-sessions', { method: 'POST', body: json(input) }).then(toBlock)

export const updateSession = (id: string, patch: { status?: BlockStatus; reminder?: boolean }) =>
  apiRequest<ApiSession>(`/study-sessions/${id}`, { method: 'PATCH', body: json(patch) }).then(toBlock)

export const deleteSession = (id: string) => apiRequest<void>(`/study-sessions/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Weekly hours chart

export interface DayHours {
  date: string
  label: string
  hours: number
}

export function weeklyHours(weekStart: Date, signal?: AbortSignal) {
  const params = new URLSearchParams({ week_start: dateKey(weekStart), tz: timeZone() })
  return apiRequest<DayHours[]>(`/stats/weekly-hours?${params}`, { signal })
}

// ---------------------------------------------------------------------------
// Agenda (today's rapid tasks)

interface ApiTask {
  id: number
  title: string
  detail: string | null
  is_done: boolean
  completed_at: string | null
  created_at: string
}

const toTask = (t: ApiTask): AgendaTask => ({
  id: String(t.id),
  title: t.title,
  detail: t.detail ?? (t.is_done && t.completed_at ? `Done ${clock(new Date(t.completed_at))}` : `Added ${clock(new Date(t.created_at))}`),
  done: t.is_done,
})

export const listTodayTasks = (signal?: AbortSignal) =>
  apiRequest<ApiTask[]>(`/agenda-tasks?due_date=${dateKey(new Date())}`, { signal }).then((list) => list.map(toTask))

export const createTask = (title: string) =>
  apiRequest<ApiTask>('/agenda-tasks', { method: 'POST', body: json({ title, due_date: dateKey(new Date()) }) }).then(
    toTask,
  )

export const setTaskDone = (id: string, done: boolean) =>
  apiRequest<ApiTask>(`/agenda-tasks/${id}`, { method: 'PATCH', body: json({ is_done: done }) }).then(toTask)

export const deleteTask = (id: string) => apiRequest<void>(`/agenda-tasks/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Resources

interface ApiResource {
  id: number
  title: string
  type: ResourceType
  subject: Subject
  source: string
  detail: string | null
  url: string | null
  is_pinned: boolean
  created_at: string
}

const toResource = (r: ApiResource): Resource => ({
  id: String(r.id),
  title: r.title,
  type: r.type,
  subject: r.subject,
  source: r.source,
  detail: r.detail ?? undefined,
  added: relativeTime(r.created_at),
  url: r.url ?? undefined,
  pinned: r.is_pinned,
})

export const listResources = (signal?: AbortSignal) =>
  apiRequest<ApiResource[]>('/resources?limit=200', { signal }).then((list) => list.map(toResource))

export const createResource = (input: { title: string; type: ResourceType; subject: Subject; url?: string }) =>
  apiRequest<ApiResource>('/resources', { method: 'POST', body: json(input) }).then(toResource)

export const setResourcePinned = (id: string, pinned: boolean) =>
  apiRequest<ApiResource>(`/resources/${id}`, { method: 'PATCH', body: json({ is_pinned: pinned }) }).then(toResource)

export const deleteResource = (id: string) => apiRequest<void>(`/resources/${id}`, { method: 'DELETE' })

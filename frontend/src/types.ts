export type Route = 'dashboard' | 'notes' | 'topics' | 'planner' | 'assistant' | 'resources' | 'settings'

/** Colour family used for subject chips, legends and progress bars. */
export type Tone = 'blue' | 'teal' | 'violet' | 'slate' | 'amber'

export type Subject = 'Computer Science' | 'Cellular Biology' | 'Mathematics' | 'Neuroscience'

/** A study session as the Dashboard and notifications show it. */
export interface StudySession {
  id: string
  subject: Subject
  tag: string
  tone: Tone
  title: string
  minutes: number
  goal: string
  /** ISO timestamp from the API. */
  startsAt: string
  /** Display label such as "Today, 16:00". */
  when: string
  isNext?: boolean
}

export interface Note {
  id: string
  subject: Subject
  title: string
  /** Full Markdown body (the API's `content`). */
  body: string
  /** First ~160 characters of the body, flattened. */
  excerpt: string
  tags: string[]
  /** ISO timestamp of the last edit. */
  updatedAt: string
  favorite: boolean
}

export interface Topic {
  id: string
  title: string
  summary: string
  badge: string
  meta: string
  /** Highlighted state badge such as "Today" or "Mastery High". */
  metaEmphasis?: boolean
  progress: number
  notes: number
  resources: number
  footnote: string
}

export interface TopicDomain {
  id: 'cs' | 'bio' | 'math'
  label: string
  shortLabel: string
  icon: string
  tone: Tone
  topics: Topic[]
}

export interface TopicNote {
  id: string
  icon: string
  title: string
  excerpt: string
  edited: string
  kind: string
  words: string
}

export type BlockStatus = 'completed' | 'in-progress' | 'upcoming'

export interface LearningBlock {
  id: string
  /** ISO start time from the API. */
  startsAt: string
  /** Local calendar day, "2026-11-22", for the week strip. */
  dateKey: string
  when: string
  subject: Subject
  tag: string
  minutes: number
  tone: Tone
  status: BlockStatus
  title: string
  detail: string
  reminder?: boolean
}

export interface AgendaTask {
  id: string
  title: string
  detail: string
  done: boolean
}

export type ResourceType = 'pdf' | 'video' | 'link' | 'slides'

export interface Resource {
  id: string
  title: string
  type: ResourceType
  subject: Subject
  /** Where it came from — author, site or course. */
  source: string
  /** Size-ish detail: page count, runtime, etc. */
  detail?: string
  added: string
  /** External resources open in a new tab; uploaded files have no URL yet. */
  url?: string
  pinned: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Notes the answer drew on, shown as clickable chips. */
  sources?: { id: string; title: string }[]
}

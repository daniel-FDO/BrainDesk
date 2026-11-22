import type { TopicDomain, TopicNote } from './types.ts'

/**
 * Static configuration only — no user data lives here. Notes, sessions,
 * resources, tasks and topics all come from the API, so a new account starts empty.
 */

/** The three topic groups on the Topics page; their topics are filled from GET /topics. */
export const topicDomains: TopicDomain[] = [
  { id: 'cs', label: 'Computer Science & AI', shortLabel: 'CS & AI', icon: 'memory', tone: 'blue', topics: [] },
  { id: 'bio', label: 'Biological Sciences', shortLabel: 'Biology', icon: 'biotech', tone: 'teal', topics: [] },
  { id: 'math', label: 'Mathematics & Logic', shortLabel: 'Math & Logic', icon: 'calculate', tone: 'violet', topics: [] },
]

/**
 * Extra detail-panel stats per topic id. The API doesn't serve these yet, so the
 * panel falls back to its defaults ("—") for every topic.
 */
export const topicDetails: Record<
  string,
  { linkedNotes: number; studyHours: string; quizScore: string; coverage: number; embeddings: number; recent: TopicNote[] }
> = {}

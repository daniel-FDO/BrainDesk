import { topicDomains } from '../data.ts'
import type { Topic, TopicDomain } from '../types.ts'
import { apiRequest } from './api.ts'

const TOPICS_URL = '/topics'

/** A topic exactly as the FastAPI backend sends it. */
export interface ApiTopic {
  id: number
  title: string
  domain: string
  summary: string
}

export type TopicInput = Omit<ApiTopic, 'id'>

export function listTopics(signal?: AbortSignal) {
  return apiRequest<ApiTopic[]>(TOPICS_URL, { signal })
}

export function createTopic(input: TopicInput) {
  return apiRequest<ApiTopic>(TOPICS_URL, { method: 'POST', body: JSON.stringify(input) })
}

export function updateTopic(id: number, patch: Partial<TopicInput>) {
  return apiRequest<ApiTopic>(`${TOPICS_URL}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteTopicById(id: number) {
  return apiRequest<void>(`${TOPICS_URL}/${id}`, { method: 'DELETE' })
}

/** The backend stores four fields; the rest of a card is display defaults. */
function toCard(topic: ApiTopic, domain: TopicDomain): Topic {
  return {
    id: String(topic.id),
    title: topic.title,
    summary: topic.summary,
    badge: domain.shortLabel,
    meta: '',
    progress: 0,
    notes: 0,
    resources: 0,
    footnote: 'Not started',
  }
}

export function groupByDomain(topics: ApiTopic[]): TopicDomain[] {
  const domains = topicDomains.map((domain) => ({ ...domain, topics: [] as Topic[] }))

  for (const topic of topics) {
    const domain = domains.find((d) => d.id === topic.domain)

    // TODO: decide what happens when topic.domain isn't 'cs', 'bio' or 'math'.
    if (!domain) continue

    domain.topics.push(toCard(topic, domain))
  }

  return domains
}

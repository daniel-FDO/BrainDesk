import { useState } from 'react'
import { Menu } from '../components/Menu.tsx'
import { Chip, EmptyState, Icon, Tag } from '../components/ui.tsx'
import { useFocusTimer } from '../context/FocusTimer.tsx'
import { useProfile } from '../context/Profile.tsx'
import type { LoadStatus } from '../hooks/useNotes.ts'
import { SUBJECTS, SUBJECT_TONE } from '../lib/subjects.ts'
import { isToday, relativeTime } from '../lib/time.ts'
import type { Note, Route, StudySession, Subject } from '../types.ts'

const SUBJECT_ICON: Record<Subject, string> = {
  'Computer Science': 'terminal',
  'Cellular Biology': 'biotech',
  Mathematics: 'functions',
  Neuroscience: 'psychology',
}

const SETUP_STEPS = [
  { href: '#/settings', icon: 'person', label: 'Set your name and study track' },
  { href: '#/resources', icon: 'upload_file', label: 'Add your syllabus to Resources' },
  { href: '#/planner', icon: 'event_available', label: 'Schedule your first study session' },
]

interface DashboardProps {
  notes: Note[]
  notesStatus: LoadStatus
  upcoming: StudySession[]
  onNavigate: (route: Route) => void
  onCreateNote: () => void
  onOpenNote: (id: string) => void
  onAskAssistant: (prompt: string) => void
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard({
  notes,
  notesStatus,
  upcoming,
  onNavigate,
  onCreateNote,
  onOpenNote,
  onAskAssistant,
}: DashboardProps) {
  const timer = useFocusTimer()
  const profile = useProfile()
  const [showSetup, setShowSetup] = useState(true)
  const [showSteps, setShowSteps] = useState(false)
  const [now] = useState(() => new Date())

  const todayCount = upcoming.filter((s) => isToday(s.startsAt)).length
  const latest = notes[0] // notes arrive sorted by last edit
  const recent = notes.slice(0, 3)
  const favorites = notes.filter((n) => n.favorite).length

  function startFocus() {
    timer.setMode('pomodoro')
    timer.start()
    onNavigate('planner')
  }

  return (
    <div className="dashboard">
      <section className="hello">
        <div>
          <Chip mono>
            <span className="dot dot--blue" aria-hidden="true" />
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Chip>
          <h1 className="h1">
            {greeting(now.getHours())}
            {profile.firstName ? `, ${profile.firstName}` : ''} <span aria-hidden="true">👋</span>
          </h1>
          <p className="muted">
            {todayCount > 0
              ? `You’ve got ${todayCount} study ${todayCount === 1 ? 'session' : 'sessions'} today. Protect your momentum.`
              : 'Nothing scheduled today — a good moment to get ahead.'}
          </p>
        </div>
        <div className="hello__actions">
          <button type="button" className="btn btn--outline" onClick={startFocus}>
            <Icon name="bolt" />
            Start Focus Session
            <span className="kbd mono">{timer.durations.pomodoro}m</span>
          </button>
          <button type="button" className="btn btn--primary" onClick={onCreateNote}>
            <Icon name="edit_square" />
            Create note
          </button>
        </div>
      </section>

      <section className="card hero" aria-labelledby="hero-title">
        {latest ? (
          <div className="hero__body">
            <div className="row gap-8 wrap">
              <Chip tone={SUBJECT_TONE[latest.subject]} mono>
                {latest.subject}
              </Chip>
              <span className="meta mono">
                <Icon name="schedule" /> Edited {relativeTime(latest.updatedAt).toLowerCase()}
              </span>
            </div>
            <p className="label hero__module">Pick up where you left off</p>
            <h2 id="hero-title" className="h2">
              {latest.title}
            </h2>
            <p className="muted clamp-2">{latest.excerpt || 'This note is empty — open it and start writing.'}</p>
            <div className="row gap-8 wrap hero__actions">
              <button type="button" className="btn btn--primary" onClick={() => onOpenNote(latest.id)}>
                <Icon name="menu_book" />
                Resume
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => onAskAssistant(`Quiz me on ${latest.subject}`)}
              >
                <Icon name="quiz" />
                Quiz me
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => onAskAssistant(`Summarize ${latest.title}`)}
              >
                <Icon name="summarize" />
                Summarize
              </button>
            </div>
          </div>
        ) : (
          <div className="hero__body">
            <p className="label hero__module">Your desk is ready</p>
            <h2 id="hero-title" className="h2">
              Welcome to BrainDesk{profile.firstName ? `, ${profile.firstName}` : ''}
            </h2>
            <p className="muted">
              Everything here is yours: notes, study sessions and resources are saved to your account and follow you
              to any device. Start with one note.
            </p>
            <div className="row gap-8 wrap hero__actions">
              <button type="button" className="btn btn--primary" onClick={onCreateNote}>
                <Icon name="edit_square" /> Write your first note
              </button>
              <button type="button" className="btn btn--outline" onClick={() => onNavigate('planner')}>
                <Icon name="event_available" /> Plan a session
              </button>
            </div>
          </div>
        )}

        <aside className="stats" aria-label="Your workspace at a glance">
          <span className="label">At a glance</span>
          <dl className="stats__grid">
            <div className="stat">
              <dt className="meta">Notes</dt>
              <dd>{notesStatus === 'loading' ? '–' : notes.length}</dd>
            </div>
            <div className="stat">
              <dt className="meta">Favourites</dt>
              <dd>{favorites}</dd>
            </div>
            <div className="stat">
              <dt className="meta">Today</dt>
              <dd>{todayCount}</dd>
            </div>
            <div className="stat">
              <dt className="meta">Upcoming</dt>
              <dd>{upcoming.length}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section aria-labelledby="subjects-title">
        <div className="section-head">
          <h2 id="subjects-title" className="h3">
            Your Subjects
          </h2>
          <a className="link" href="#/topics">
            Manage Topics <Icon name="arrow_forward" />
          </a>
        </div>
        <ul className="grid-4">
          {SUBJECTS.map((subject) => {
            const count = notes.filter((n) => n.subject === subject).length
            const next = upcoming.find((s) => s.subject === subject)
            return (
              <li key={subject} className="card course">
                <span className={`tile tile--${SUBJECT_TONE[subject]}`} aria-hidden="true">
                  <Icon name={SUBJECT_ICON[subject]} />
                </span>
                <h3 className="course__name">{subject}</h3>
                <p className="course__counts meta mono">
                  <span>
                    <Icon name="description" /> {count} {count === 1 ? 'note' : 'notes'}
                  </span>
                </p>
                <div className="course__next">
                  {next ? (
                    <>
                      <p className="label text-primary">Next: {next.when}</p>
                      <p className="course__next-title">{next.title}</p>
                    </>
                  ) : (
                    <p className="meta">No session planned</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="split-2">
        <section className="card panel" aria-labelledby="sessions-title">
          <div className="section-head">
            <h2 id="sessions-title" className="h3">
              <Icon name="calendar_today" className="text-primary" /> Upcoming Study Sessions
            </h2>
            <span className="meta mono">{todayCount} today</span>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon="event_available" title="No sessions planned">
              Block out time in the planner and it shows up here.
            </EmptyState>
          ) : (
            <ul className="stack-8">
              {upcoming.slice(0, 4).map((s) => (
                <li key={s.id} className="session">
                  <span className="session__check" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <div className="session__body">
                    <Chip tone={s.tone} mono>
                      {s.tag}
                    </Chip>
                    <p className="session__title">{s.title}</p>
                    <p className="meta mono">
                      <Icon name="schedule" /> {s.minutes} min{s.goal ? ` · ${s.goal}` : ''}
                    </p>
                  </div>
                  <span className={`when mono ${s.isNext ? 'when--next' : ''}`}>{s.when}</span>
                  <Menu
                    label={`More options for ${s.title}`}
                    trigger={<Icon name="more_horiz" />}
                    items={[
                      { label: 'Start focus session', icon: 'bolt', onSelect: startFocus },
                      { label: 'Open in planner', icon: 'calendar_month', onSelect: () => onNavigate('planner') },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn--soft btn--block" onClick={() => onNavigate('planner')}>
            <Icon name="add_circle" />
            Schedule New Session
          </button>
        </section>

        <section className="card panel" aria-labelledby="recent-title">
          <div className="section-head">
            <h2 id="recent-title" className="h3">
              <Icon name="description" className="text-primary" /> Recently Edited Notes
            </h2>
            <a className="link" href="#/notes">
              View all
            </a>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="edit_note" title={notesStatus === 'loading' ? 'Loading…' : 'No notes yet'}>
              {notesStatus === 'loading' ? null : 'Your latest notes will appear here.'}
            </EmptyState>
          ) : (
            <ul className="stack-8">
              {recent.map((n) => (
                <li key={n.id}>
                  <button type="button" className="recent" onClick={() => onOpenNote(n.id)}>
                    <span className="row between">
                      <span className="recent__title">{n.title}</span>
                      <Icon
                        name="star"
                        filled={n.favorite}
                        className={n.favorite ? 'star is-on' : 'star'}
                        label={n.favorite ? 'Favourite' : undefined}
                      />
                    </span>
                    <span className="meta clamp-1">{n.excerpt || 'Empty note'}</span>
                    <span className="row between wrap gap-8">
                      <span className="row gap-4 wrap">
                        {n.tags.slice(0, 3).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </span>
                      <span className="meta mono">{relativeTime(n.updatedAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="sync">
            <Icon name="cloud_done" />
            <span>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} synced to your account
            </span>
            <span className="label text-primary">All saved</span>
          </p>
        </section>
      </div>

      {showSetup && (
        <section className="card banner" aria-labelledby="setup-title">
          <span className="tile tile--violet" aria-hidden="true">
            <Icon name="school" />
          </span>
          <div className="banner__text">
            <h2 id="setup-title" className="h4">
              Starting a new term or module?
            </h2>
            <p className="meta">Three quick steps get your workspace ready for it.</p>
          </div>
          <div className="row gap-8">
            <button type="button" className="btn btn--outline" onClick={() => setShowSetup(false)}>
              Dismiss
            </button>
            <button
              type="button"
              className="btn btn--primary"
              aria-expanded={showSteps}
              aria-controls="setup-steps"
              onClick={() => setShowSteps((v) => !v)}
            >
              Show steps <Icon name={showSteps ? 'expand_less' : 'chevron_right'} />
            </button>
          </div>
          {showSteps && (
            <ol id="setup-steps" className="setup-steps">
              {SETUP_STEPS.map((step) => (
                <li key={step.href}>
                  <a className="link" href={step.href}>
                    <Icon name={step.icon} /> {step.label}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}

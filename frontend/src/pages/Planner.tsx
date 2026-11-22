import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { BreakLauncher } from '../components/BreakLauncher.tsx'
import { Menu } from '../components/Menu.tsx'
import { Chip, EmptyState, Icon, Ring } from '../components/ui.tsx'
import { useFocusTimer } from '../context/FocusTimer.tsx'
import { FOCUS_MODES, FOCUS_MODE_IDS } from '../lib/focusModes.ts'
import { formatClock, formatFileSize } from '../lib/format.ts'
import { SUBJECTS } from '../lib/subjects.ts'
import { addDays, dateKey, monthDay, startOfWeek } from '../lib/time.ts'
import {
  createSession,
  createTask,
  deleteSession,
  deleteTask,
  listTodayTasks,
  listWeekBlocks,
  setTaskDone,
  updateSession,
  weeklyHours,
  type DayHours,
  type NewSession,
} from '../lib/workspaceApi.ts'
import type { AgendaTask, BlockStatus, LearningBlock, Route, Subject } from '../types.ts'

interface PlannerDay {
  date: Date
  key: string
  day: number
  label: string
  weekend: boolean
}

function daysOfWeek(weekStart: Date): PlannerDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return {
      date,
      key: dateKey(date),
      day: date.getDate(),
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      weekend: i >= 5,
    }
  })
}

const STATUS: Record<BlockStatus, { label: string; icon: string }> = {
  completed: { label: 'Completed', icon: 'check_circle' },
  'in-progress': { label: 'In Progress', icon: 'hourglass_top' },
  upcoming: { label: 'Upcoming', icon: 'event' },
}

interface PlannerProps {
  onNavigate: (route: Route) => void
  /** Lets the Dashboard and notifications pick up added or finished sessions. */
  onSessionsChanged: () => void
}

type Load = 'loading' | 'ready' | 'failed'

export function Planner({ onNavigate, onSessionsChanged }: PlannerProps) {
  const todayKey = dateKey(new Date())
  const [view, setView] = useState<'calendar' | 'agenda'>('calendar')
  const [week, setWeek] = useState(0)
  const [selected, setSelected] = useState(todayKey)
  const [scheduling, setScheduling] = useState(false)
  const [blocks, setBlocks] = useState<LearningBlock[]>([])
  const [load, setLoad] = useState<Load>('loading')
  const [hours, setHours] = useState<DayHours[] | null>(null)
  const [hoursVersion, setHoursVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [openedAt] = useState(() => Date.now())

  const weekStart = addDays(startOfWeek(new Date()), week * 7)
  const weekKey = dateKey(weekStart)
  const days = daysOfWeek(weekStart)

  useEffect(() => {
    const controller = new AbortController()
    listWeekBlocks(new Date(`${weekKey}T00:00`), controller.signal)
      .then((loaded) => {
        setBlocks(loaded)
        setLoad('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad('failed')
      })
    return () => controller.abort()
  }, [weekKey])

  useEffect(() => {
    const controller = new AbortController()
    weeklyHours(new Date(`${weekKey}T00:00`), controller.signal)
      .then(setHours)
      .catch(() => {
        if (!controller.signal.aborted) setHours(null)
      })
    return () => controller.abort()
  }, [weekKey, hoursVersion])

  /** Runs one change against the API, keeping the list and the rest of the app in sync. */
  async function change(action: () => Promise<void>, failure: string) {
    setError(null)
    try {
      await action()
      onSessionsChanged()
    } catch {
      setError(failure)
    }
  }

  const replace = (block: LearningBlock) => setBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)))

  const markDone = (id: string) =>
    change(async () => {
      replace(await updateSession(id, { status: 'completed' }))
      setHoursVersion((v) => v + 1)
    }, 'Couldn’t mark that session complete.')

  const toggleReminder = (block: LearningBlock) =>
    change(
      async () => replace(await updateSession(block.id, { reminder: !block.reminder })),
      'Couldn’t update the reminder.',
    )

  const removeBlock = (id: string) =>
    change(async () => {
      await deleteSession(id)
      setBlocks((prev) => prev.filter((b) => b.id !== id))
      setHoursVersion((v) => v + 1)
    }, 'Couldn’t delete that session.')

  function changeWeek(delta: number) {
    const next = week + delta
    setWeek(next)
    setLoad('loading')
    setSelected(next === 0 ? todayKey : dateKey(addDays(startOfWeek(new Date()), next * 7)))
  }

  async function addSession(input: NewSession) {
    const block = await createSession(input)
    setBlocks((prev) => [...prev, block].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
    setSelected(block.dateKey)
    setScheduling(false)
    onSessionsChanged()
  }

  const focusTarget =
    blocks.find((b) => b.status === 'in-progress') ??
    blocks.find((b) => b.status === 'upcoming' && new Date(b.startsAt).getTime() >= openedAt)
  const todayHours = hours?.find((d) => d.date === todayKey)?.hours ?? 0

  return (
    <div className="planner">
      <header className="card planner__head">
        <div>
          <h1 className="h2 row gap-8 wrap">
            Study Planner {week === 0 && <Chip mono>This week</Chip>}
          </h1>
          <p className="meta mono row gap-4">
            <Icon name="calendar_today" /> Week of {monthDay(days[0].date)} – {monthDay(days[6].date)},{' '}
            {days[6].date.getFullYear()}
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label="Previous week"
              onClick={() => changeWeek(-1)}
            >
              <Icon name="chevron_left" />
            </button>
            <button type="button" className="icon-btn icon-btn--sm" aria-label="Next week" onClick={() => changeWeek(1)}>
              <Icon name="chevron_right" />
            </button>
            {week !== 0 && (
              <button type="button" className="link meta" onClick={() => changeWeek(-week)}>
                Back to this week
              </button>
            )}
          </p>
        </div>
        <div className="row gap-8 wrap">
          <div className="segmented" role="group" aria-label="Planner view">
            <button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>
              <Icon name="calendar_view_week" /> Weekly Calendar
            </button>
            <button type="button" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>
              <Icon name="view_agenda" /> Agenda List
            </button>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            aria-expanded={scheduling}
            onClick={() => setScheduling((v) => !v)}
          >
            <Icon name={scheduling ? 'close' : 'add_circle'} /> {scheduling ? 'Cancel' : 'Schedule Session'}
          </button>
        </div>
      </header>

      {scheduling && (
        <ScheduleForm days={days} selectedKey={selected} onCancel={() => setScheduling(false)} onAdd={addSession} />
      )}

      {error && (
        <p className="form-error" role="alert">
          <Icon name="error" /> {error}
        </p>
      )}

      <div className="planner__layout">
        <div className="stack-16 min-w-0">
          <FocusCard target={focusTarget} todayHours={todayHours} />

          {view === 'calendar' && (
            <div className="card week" role="group" aria-label="Select a day">
              {days.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className={`week__day ${d.weekend ? 'is-weekend' : ''} ${d.key === todayKey ? 'is-today' : ''}`}
                  aria-pressed={selected === d.key}
                  onClick={() => setSelected(d.key)}
                >
                  <span className="mono">{d.label}</span>
                  <strong>{d.day}</strong>
                  {blocks.some((b) => b.dateKey === d.key) && <span className="week__dot" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}

          <section className="card panel" aria-labelledby="blocks-title">
            <div className="section-head">
              <h2 id="blocks-title" className="h4">
                Scheduled Learning Blocks
              </h2>
              <ul className="legend meta" aria-label="Legend">
                <li>
                  <span className="dot dot--blue" aria-hidden="true" /> Computer Sci
                </li>
                <li>
                  <span className="dot dot--teal" aria-hidden="true" /> Biology
                </li>
                <li>
                  <span className="dot dot--violet" aria-hidden="true" /> Maths
                </li>
                <li>
                  <span className="dot dot--slate" aria-hidden="true" /> Neuro
                </li>
              </ul>
            </div>
            {load === 'loading' ? (
              <EmptyState icon="hourglass_top" title="Loading this week…" />
            ) : load === 'failed' ? (
              <EmptyState icon="cloud_off" title="Couldn’t load your sessions">
                Check your connection and try again.
              </EmptyState>
            ) : blocks.length === 0 ? (
              <EmptyState icon="event_busy" title="Nothing scheduled this week">
                Use “Schedule Session” to plan your first block.
              </EmptyState>
            ) : (
              <ul className="stack-8">
                {blocks.map((b) => (
                  <BlockRow
                    key={b.id}
                    block={b}
                    highlighted={view === 'calendar' && b.dateKey === selected}
                    onDone={() => markDone(b.id)}
                    onRemove={() => removeBlock(b.id)}
                    onToggleReminder={() => toggleReminder(b)}
                    onOpenNotes={() => onNavigate('notes')}
                  />
                ))}
              </ul>
            )}
          </section>

          <WeeklyLoad hours={hours} todayKey={todayKey} />
        </div>

        <div className="stack-16 min-w-0">
          <Agenda />
          <AttachedResources />
          <BreakLauncher />
        </div>
      </div>
    </div>
  )
}

function ScheduleForm({
  days,
  selectedKey,
  onAdd,
  onCancel,
}: {
  days: PlannerDay[]
  selectedKey: string
  onAdd: (input: NewSession) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [dayIndex, setDayIndex] = useState(() => Math.max(0, days.findIndex((d) => d.key === selectedKey)))
  const [time, setTime] = useState('16:00')
  const [minutes, setMinutes] = useState('45')
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cleanTitle = title.trim()
    const length = Number(minutes)
    if (!cleanTitle) return setError('Give the session a title.')
    if (!time) return setError('Pick a start time.')
    if (!Number.isInteger(length) || length < 1 || length > 480) return setError('Length must be 1–480 minutes.')

    const [hours, mins] = time.split(':').map(Number)
    const day = days[dayIndex].date
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, mins)
    setBusy(true)
    setError(null)
    try {
      await onAdd({
        title: cleanTitle,
        subject,
        starts_at: start.toISOString(),
        duration_minutes: length,
        goal: goal.trim() || undefined,
      })
    } catch {
      setError('Couldn’t save the session. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <form className="card panel settings__section" onSubmit={submit} noValidate>
      <h2 className="h4">
        <Icon name="add_circle" /> Schedule a session
      </h2>
      <div className="form-grid">
        <label className="field">
          <span className="label">Title</span>
          <input className="input" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Subject</span>
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Day</span>
          <select className="input" value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}>
            {days.map((d, i) => (
              <option key={d.key} value={i}>
                {d.label}, {monthDay(d.date)}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            <span className="label">Time</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Minutes</span>
            <input
              className="input mono"
              type="number"
              min={1}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
        </div>
        <label className="field form-grid__wide">
          <span className="label">Goal (optional)</span>
          <input
            className="input"
            value={goal}
            placeholder="e.g. Finish problem set 4"
            onChange={(e) => setGoal(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          <Icon name="error" /> {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Add session'}
        </button>
      </div>
    </form>
  )
}

interface Attachment {
  id: string
  name: string
  size: number
  url: string
}

/** Quick file shelf for this visit. Files stay in the browser; lasting ones belong in Resources. */
function AttachedResources() {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Set<string>())

  useEffect(() => {
    const urls = objectUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const added = Array.from(e.target.files ?? []).map((file, i) => {
      const url = URL.createObjectURL(file)
      objectUrls.current.add(url)
      return { id: `att-${Date.now()}-${i}`, name: file.name, size: file.size, url }
    })
    setAttachments((prev) => [...prev, ...added])
    e.target.value = '' // Lets the same file be picked again after removing it.
  }

  function remove(attachment: Attachment) {
    URL.revokeObjectURL(attachment.url)
    objectUrls.current.delete(attachment.url)
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
  }

  return (
    <section className="card panel" aria-labelledby="res-title">
      <div className="section-head">
        <h2 id="res-title" className="h4">
          Session Files
        </h2>
        <button type="button" className="link meta" onClick={() => fileInputRef.current?.click()}>
          <Icon name="attach_file" /> Attach
        </button>
        <input ref={fileInputRef} type="file" multiple hidden onChange={addFiles} />
      </div>
      {attachments.length === 0 ? (
        <p className="meta">
          Open files you need for this session. For anything you want to keep, use{' '}
          <a className="link" href="#/resources">
            Resources
          </a>
          .
        </p>
      ) : (
        <ul className="stack-8">
          {attachments.map((a) => (
            <li key={a.id} className="resource">
              <Icon name="draft" className="text-primary" />
              <div className="min-w-0">
                <p className="resource__name truncate">{a.name}</p>
                <p className="meta mono">{formatFileSize(a.size)}</p>
              </div>
              <span className="row gap-4">
                <a
                  className="icon-btn icon-btn--sm"
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${a.name}`}
                >
                  <Icon name="open_in_new" />
                </a>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm icon-btn--danger"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => remove(a)}
                >
                  <Icon name="close" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function FocusCard({ target, todayHours }: { target?: LearningBlock; todayHours: number }) {
  const timer = useFocusTimer()
  const elapsedPct = ((timer.total - timer.remaining) / timer.total) * 100
  const finished = timer.remaining === 0

  return (
    <section className="card focus" aria-labelledby="focus-title">
      <Ring value={elapsedPct} size={104} stroke={8} label={`${formatClock(timer.remaining)} remaining`}>
        <strong className="focus__clock mono">{formatClock(timer.remaining)}</strong>
        <span className="label">{finished ? 'Done' : 'Flow State'}</span>
      </Ring>
      <div className="focus__info">
        <p className="row gap-8 wrap">
          <Chip mono>
            <span className="dot dot--blue" aria-hidden="true" /> {target ? 'Up next' : 'Free focus'}
          </Chip>
          <Chip tone="amber" mono>
            {todayHours} {todayHours === 1 ? 'hr' : 'hrs'} studied today
          </Chip>
        </p>
        <h2 id="focus-title" className="h3">
          {target?.title ?? 'Deep work, your way'}
        </h2>
        <p className="meta">
          {target
            ? `${target.subject} • ${target.when}`
            : 'No session queued. Start the timer and pick something to focus on.'}
        </p>
        <p className="sr-only" aria-live="polite">
          {finished ? 'Focus session complete.' : ''}
        </p>
      </div>
      <div className="focus__controls">
        <div className="segmented segmented--stack" role="group" aria-label="Session length">
          {FOCUS_MODE_IDS.map((m) => (
            <button key={m} type="button" aria-pressed={timer.mode === m} onClick={() => timer.setMode(m)}>
              {FOCUS_MODES[m].label} ({timer.durations[m]}m)
            </button>
          ))}
        </div>
        <a className="link meta" href="#/settings">
          <Icon name="tune" /> Change lengths
        </a>
        <div className="row gap-8">
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={timer.running ? timer.pause : timer.start}
          >
            <Icon name={timer.running ? 'pause' : 'play_arrow'} filled />
            {timer.running ? 'Pause Session' : finished ? 'Restart Session' : 'Start Session'}
          </button>
          <button type="button" className="icon-btn icon-btn--bordered" aria-label="Reset timer" onClick={timer.reset}>
            <Icon name="restart_alt" />
          </button>
        </div>
      </div>
    </section>
  )
}

function BlockRow({
  block,
  highlighted,
  onDone,
  onRemove,
  onToggleReminder,
  onOpenNotes,
}: {
  block: LearningBlock
  highlighted: boolean
  onDone: () => void
  onRemove: () => void
  onToggleReminder: () => void
  onOpenNotes: () => void
}) {
  const timer = useFocusTimer()
  const isCompleted = block.status === 'completed'
  const status = STATUS[block.status]
  return (
    <li className={`block block--${block.tone} ${highlighted ? 'is-highlighted' : ''}`}>
      <div className="min-w-0">
        <p className="row gap-8 wrap meta mono">
          <span>{block.when}</span>
          <span className={`chip chip--${block.tone} mono`}>
            {block.tag} • {block.minutes}m
          </span>
          <span className={`status status--${block.status} mono`}>
            <Icon name={status.icon} /> {status.label}
          </span>
          {block.reminder && !isCompleted && (
            <span className="status mono">
              <Icon name="alarm_on" /> Reminder on
            </span>
          )}
        </p>
        <p className="block__title">{block.title}</p>
        <p className="meta">{block.detail}</p>
      </div>
      <div className="row gap-4">
        {block.status === 'in-progress' ? (
          <>
            <button type="button" className="btn btn--primary btn--sm" onClick={timer.start}>
              Resume
            </button>
            <button type="button" className="icon-btn" aria-label={`Mark ${block.title} complete`} onClick={onDone}>
              <Icon name="check" />
            </button>
          </>
        ) : (
          <>
            {isCompleted ? (
              <button type="button" className="icon-btn" aria-label={`Notes for ${block.title}`} onClick={onOpenNotes}>
                <Icon name="sticky_note_2" />
              </button>
            ) : (
              <button
                type="button"
                className="icon-btn"
                aria-label={`Reminder for ${block.title}`}
                aria-pressed={Boolean(block.reminder)}
                onClick={onToggleReminder}
              >
                <Icon name="alarm" filled={block.reminder} />
              </button>
            )}
            <Menu
              label={`More options for ${block.title}`}
              trigger={<Icon name="more_vert" />}
              items={[
                ...(isCompleted
                  ? []
                  : [
                      { label: 'Start focus timer', icon: 'bolt', onSelect: timer.start },
                      { label: 'Mark complete', icon: 'check', onSelect: onDone },
                    ]),
                { label: 'Delete session', icon: 'delete', danger: true, onSelect: onRemove },
              ]}
            />
          </>
        )}
      </div>
    </li>
  )
}

function Agenda() {
  const [tasks, setTasks] = useState<AgendaTask[]>([])
  const [load, setLoad] = useState<Load>('loading')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const done = tasks.filter((t) => t.done).length

  useEffect(() => {
    const controller = new AbortController()
    listTodayTasks(controller.signal)
      .then((loaded) => {
        setTasks(loaded)
        setLoad('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad('failed')
      })
    return () => controller.abort()
  }, [])

  async function run(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
    } catch {
      setError('That didn’t save. Check your connection and try again.')
    }
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const title = draft.trim()
    if (!title) return
    setDraft('')
    void run(async () => {
      const task = await createTask(title)
      setTasks((prev) => [...prev, task])
    })
  }

  const toggle = (task: AgendaTask) =>
    run(async () => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
      const saved = await setTaskDone(task.id, !task.done)
      setTasks((prev) => prev.map((t) => (t.id === task.id ? saved : t)))
    })

  const remove = (task: AgendaTask) =>
    run(async () => {
      await deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    })

  return (
    <section className="card panel" aria-labelledby="agenda-title">
      <div className="section-head">
        <h2 id="agenda-title" className="h4">
          <Icon name="checklist" /> Today&rsquo;s Agenda
        </h2>
        <span className="chip chip--blue mono" aria-live="polite">
          {done} of {tasks.length} done
        </span>
      </div>
      {load === 'loading' ? (
        <p className="meta">Loading…</p>
      ) : tasks.length === 0 ? (
        <EmptyState icon="task_alt" title="Your agenda is clear">
          {load === 'failed' ? 'Couldn’t load today’s tasks.' : 'Add a quick task below.'}
        </EmptyState>
      ) : (
        <ul className="stack-4">
          {tasks.map((t) => (
            <li key={t.id} className={`task ${t.done ? 'is-done' : ''}`}>
              <input id={`task-${t.id}`} type="checkbox" checked={t.done} onChange={() => toggle(t)} />
              <label htmlFor={`task-${t.id}`}>
                <span className="task__title">{t.title}</span>
                <span className="meta mono">{t.detail}</span>
              </label>
              <button
                type="button"
                className="icon-btn icon-btn--sm task__remove"
                aria-label={`Remove ${t.title}`}
                onClick={() => remove(t)}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="form-error" role="alert">
          <Icon name="error" /> {error}
        </p>
      )}
      <form className="quick-add" onSubmit={add}>
        <label className="sr-only" htmlFor="rapid-task">
          Add a task for today
        </label>
        <input
          id="rapid-task"
          placeholder="Add a task for today..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="icon-btn icon-btn--primary" aria-label="Add task" disabled={!draft.trim()}>
          <Icon name="arrow_upward" />
        </button>
      </form>
    </section>
  )
}

function WeeklyLoad({ hours, todayKey }: { hours: DayHours[] | null; todayKey: string }) {
  const total = hours ? Math.round(hours.reduce((sum, d) => sum + d.hours, 0) * 10) / 10 : 0
  const max = Math.max(1, ...(hours ?? []).map((d) => d.hours))
  return (
    <section className="card panel" aria-labelledby="load-title">
      <div className="section-head">
        <h2 id="load-title" className="h4">
          Weekly Study Hours
        </h2>
        <span className="meta mono">{total} hrs completed this week</span>
      </div>
      {!hours ? (
        <p className="meta">Hours appear here as you complete sessions.</p>
      ) : (
        <ol className="bars">
          {hours.map((d) => (
            <li
              key={d.date}
              className={`bars__col ${d.date < todayKey ? 'is-past' : d.date === todayKey ? 'is-today' : ''}`}
            >
              <span className="bars__value mono">
                {d.hours}h<span className="sr-only"> on {d.date}</span>
              </span>
              <span
                className="bars__bar"
                style={{ height: `${Math.max(2, (d.hours / max) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="bars__label mono" aria-hidden="true">
                {d.label}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

import { useState } from 'react'
import { useFocusTimer } from '../context/FocusTimer.tsx'
import { useMindfulBreak } from '../context/MindfulBreak.tsx'
import { breakLengths } from '../lib/breaks.ts'
import { Icon } from './ui.tsx'

/** The Planner's "Mindful Learning Tip", now a launcher for a guided break. */
export function BreakLauncher() {
  const zen = useMindfulBreak()
  const timer = useFocusTimer()
  const lengths = breakLengths(timer.durations.short)
  const [picked, setPicked] = useState<number | null>(null)
  const minutes = picked ?? timer.durations.short

  return (
    <section className="card zen-card" aria-labelledby="zen-card-title">
      <button
        type="button"
        className="zen-card__media"
        aria-label={`Start a ${minutes}-minute mindful break`}
        onClick={(e) => zen.open(minutes, e.currentTarget)}
      >
        <span className="zen-card__orb" aria-hidden="true" />
        <Icon name="self_improvement" />
        <span className="zen-card__play" aria-hidden="true">
          <Icon name="play_arrow" filled /> Begin
        </span>
      </button>
      <div className="zen-card__body">
        <h2 id="zen-card-title" className="label text-primary">
          Mindful break
        </h2>
        <p className="meta">
          Take a reset every 25 minutes. Short breaks help memories consolidate. Press begin and your desk turns into
          a guided breathing space.
        </p>
        <div className="zen-card__lengths" role="group" aria-label="Break length">
          {lengths.map((m) => (
            <button
              key={m}
              type="button"
              className="filter"
              aria-pressed={m === minutes}
              onClick={() => setPicked(m)}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

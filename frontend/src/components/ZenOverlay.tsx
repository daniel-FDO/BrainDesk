import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useFocusTimer } from '../context/FocusTimer.tsx'
import { BREATH_PATTERNS, breathAt, type BreathPatternId } from '../lib/breath.ts'
import { formatClock } from '../lib/format.ts'
import { startZenCanvas, type ZenCanvas, type ZenScene } from '../lib/zenCanvas.ts'
import { startRain } from '../lib/zenSound.ts'
import { Icon } from './ui.tsx'

const SCENES: { id: ZenScene; label: string; icon: string }[] = [
  { id: 'breathe', label: 'Breathe', icon: 'air' },
  { id: 'drift', label: 'Drift', icon: 'nights_stay' },
  { id: 'ripple', label: 'Ripple', icon: 'water_drop' },
]

const DRIFT_PROMPTS = [
  'Drop your shoulders away from your ears.',
  'Unclench your jaw. Let your tongue rest.',
  'Look at something far away for a moment.',
  'Notice three things you can hear right now.',
  'Let your breath find its own pace.',
  'Soften your gaze. Nothing needs you right now.',
  'Roll your neck slowly, one way, then the other.',
  'You’ve done good work. It will still be there.',
]
const PROMPT_MS = 12_000
const RING = 2 * Math.PI * 15.5

interface ZenOverlayProps {
  minutes: number
  originX: number
  originY: number
  leaving: boolean
  onClose: () => void
}

/** Full-screen Mindful Break: an animated night sky with three ways to switch off. */
export function ZenOverlay({ minutes, originX, originY, leaving, onClose }: ZenOverlayProps) {
  const timer = useFocusTimer()
  const [startedAt] = useState(() => Date.now())
  const [endsAt, setEndsAt] = useState(() => Date.now() + minutes * 60_000)
  const [now, setNow] = useState(() => Date.now())
  const [scene, setScene] = useState<ZenScene>('breathe')
  const [pattern, setPattern] = useState<BreathPatternId>('box')
  const [breathFrom, setBreathFrom] = useState(() => Date.now())
  const [sound, setSound] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = useRef<ZenCanvas | null>(null)
  const stopSound = useRef<(() => void) | null>(null)
  const endRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)
  const lastTrail = useRef(0)

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const progress = Math.min(1, (now - startedAt) / (endsAt - startedAt))
  const done = remaining === 0

  // Clock (wall time, so a throttled background tab still ends on time)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const zen = startZenCanvas(canvas, reduce)
    engine.current = zen
    return () => {
      zen.stop()
      engine.current = null
    }
  }, [])

  useEffect(() => engine.current?.setScene(done ? 'drift' : scene), [scene, done])

  useEffect(() => {
    endRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (done) doneRef.current?.focus({ preventScroll: true })
  }, [done])

  // Sound fades out with the overlay, and never outlives it.
  useEffect(() => {
    if (!leaving) return
    stopSound.current?.()
    stopSound.current = null
  }, [leaving])
  useEffect(() => () => stopSound.current?.(), [])

  function toggleSound() {
    if (stopSound.current) {
      stopSound.current()
      stopSound.current = null
      setSound(false)
      return
    }
    try {
      stopSound.current = startRain()
      setSound(true)
    } catch {
      // No Web Audio in this browser; the break works fine in silence.
    }
  }

  function pickScene(next: ZenScene) {
    setScene(next)
    if (next === 'breathe') setBreathFrom(now)
  }

  function pickPattern(next: BreathPatternId) {
    setPattern(next)
    setBreathFrom(now)
  }

  function startFocus() {
    timer.setMode('pomodoro')
    timer.start()
    onClose()
  }

  function onPointerDown(e: PointerEvent) {
    if ((e.target as Element).closest('button')) return
    engine.current?.ripple(e.clientX, e.clientY)
  }

  function onPointerMove(e: PointerEvent) {
    if (scene !== 'ripple' || (e.pointerType !== 'mouse' && !e.buttons)) return
    const t = performance.now()
    if (t - lastTrail.current < 140) return
    lastTrail.current = t
    engine.current?.ripple(e.clientX, e.clientY, 0.45)
  }

  const breath = breathAt((now - breathFrom) / 1000, BREATH_PATTERNS[pattern].steps)
  const promptIndex = Math.floor((now - startedAt) / PROMPT_MS) % DRIFT_PROMPTS.length

  return (
    <div
      className={`zen zen--${done ? 'done' : scene} ${leaving ? 'is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zen-title"
      style={{ '--zx': `${originX}px`, '--zy': `${originY}px` } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <div className="zen__aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <canvas ref={canvasRef} className="zen__canvas" aria-hidden="true" />

      <header className="zen__top">
        <p id="zen-title" className="zen__title">
          <Icon name="self_improvement" /> Mindful break
        </p>
        <div className="zen__clock" role="timer" aria-label={`${formatClock(remaining)} left`}>
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle className="zen__clock-track" cx="18" cy="18" r="15.5" />
            <circle
              className="zen__clock-value"
              cx="18"
              cy="18"
              r="15.5"
              strokeDasharray={RING}
              strokeDashoffset={RING * progress}
            />
          </svg>
          <span className="mono">{formatClock(remaining)}</span>
        </div>
        <div className="zen__actions">
          <button
            type="button"
            className="zen__icon-btn"
            aria-pressed={sound}
            aria-label={sound ? 'Turn the rain sound off' : 'Play a soft rain sound'}
            title={sound ? 'Sound on' : 'Sound off'}
            onClick={toggleSound}
          >
            <Icon name={sound ? 'volume_up' : 'volume_off'} />
          </button>
          <button ref={endRef} type="button" className="zen__pill" onClick={onClose}>
            End break <span className="zen__kbd mono">Esc</span>
          </button>
        </div>
      </header>

      <main className="zen__stage">
        {done ? (
          <div className="zen-done">
            <span className="zen-done__icon" aria-hidden="true">
              <Icon name="spa" />
            </span>
            <h2 className="zen-done__title">Welcome back</h2>
            <p className="zen-done__text">One more slow breath. Your notes are right where you left them.</p>
            <div className="zen-done__actions">
              <button ref={doneRef} type="button" className="zen__pill zen__pill--solid" onClick={startFocus}>
                <Icon name="bolt" /> Start a {timer.durations.pomodoro}-min focus
              </button>
              <button type="button" className="zen__pill" onClick={onClose}>
                Back to my desk
              </button>
              <button
                type="button"
                className="zen__pill"
                onClick={() => setEndsAt(Date.now() + 2 * 60_000)}
              >
                +2 min
              </button>
            </div>
          </div>
        ) : scene === 'breathe' ? (
          <div
            className="zen-orb"
            style={{ '--s': breath.step.scale, '--d': `${breath.step.seconds}s` } as CSSProperties}
          >
            <span className="zen-orb__halo" aria-hidden="true" />
            <span className="zen-orb__halo zen-orb__halo--2" aria-hidden="true" />
            <span className="zen-orb__core" aria-hidden="true" />
            <div className="zen-orb__text" aria-live="polite">
              <span key={breath.key} className="zen-cue">
                {breath.step.cue}
              </span>
              <span className="zen-count mono" aria-hidden="true">
                {breath.secondsLeft}
              </span>
            </div>
          </div>
        ) : scene === 'drift' ? (
          <div className="zen-words" aria-live="polite">
            <p key={promptIndex} className="zen-prompt">
              {DRIFT_PROMPTS[promptIndex]}
            </p>
            <p className="zen-hint">Just watch the lights drift by.</p>
          </div>
        ) : (
          <div className="zen-words">
            <p className="zen-prompt">Tap anywhere. Watch it settle.</p>
            <p className="zen-hint">Move slowly. There’s nowhere to be.</p>
          </div>
        )}
      </main>

      {!done && (
        <footer className="zen__bottom">
          <div className="zen__scenes" role="group" aria-label="Scene">
            {SCENES.map((s) => (
              <button key={s.id} type="button" aria-pressed={scene === s.id} onClick={() => pickScene(s.id)}>
                <Icon name={s.icon} /> {s.label}
              </button>
            ))}
          </div>
          {scene === 'breathe' && (
            <div className="zen__patterns" role="group" aria-label="Breathing pattern">
              {(Object.keys(BREATH_PATTERNS) as BreathPatternId[]).map((id) => (
                <button key={id} type="button" aria-pressed={pattern === id} onClick={() => pickPattern(id)}>
                  {BREATH_PATTERNS[id].label}
                </button>
              ))}
            </div>
          )}
        </footer>
      )}
    </div>
  )
}

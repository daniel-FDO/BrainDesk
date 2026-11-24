import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

const WORD = 'BrainDesk'
/** How long the logo plays before the splash starts to lift away. */
const INTRO_MS = 1900
/** Matches the .splash.is-leaving transition in intro.css. */
const EXIT_MS = 650

type Phase = 'intro' | 'exit' | 'done'

/** Decides whether this page load gets the intro animation at all. */
function shouldShowSplash(): boolean {
  // TODO(human)
  return true
}

/**
 * Plays the BrainDesk logo intro over the whole screen, then lifts away.
 * Children mount when the splash starts leaving, so their own entrance
 * animations (the login card rising in) play as the splash fades out.
 */
export function Splash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() => (shouldShowSplash() ? 'intro' : 'done'))

  useEffect(() => {
    if (phase === 'done') return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = phase === 'intro' ? (reduced ? 400 : INTRO_MS) : reduced ? 150 : EXIT_MS
    const id = setTimeout(() => setPhase(phase === 'intro' ? 'exit' : 'done'), ms)
    return () => clearTimeout(id)
  }, [phase])

  return (
    <>
      {phase !== 'intro' && children}
      {phase !== 'done' && (
        <div className={`splash ${phase === 'exit' ? 'is-leaving' : ''}`} role="status" aria-label="Loading BrainDesk">
          <div className="splash__glow" aria-hidden="true" />
          <div className="splash__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="splash__word" aria-hidden="true">
            {WORD.split('').map((ch, i) => (
              <span key={i} style={{ '--i': i } as CSSProperties}>
                {ch}
              </span>
            ))}
          </div>
          <p className="splash__tag" aria-hidden="true">
            Your calm place to study
          </p>
          <div className="splash__bar" aria-hidden="true">
            <span />
          </div>
        </div>
      )}
    </>
  )
}

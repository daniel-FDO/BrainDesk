/** Guided breathing for the Mindful Break "Breathe" scene. */

export interface BreathStep {
  cue: string
  seconds: number
  /** Orb size at the end of this step (1 = full lungs). */
  scale: number
}

export const EXHALED = 0.55

export const BREATH_PATTERNS = {
  box: {
    label: 'Box · 4-4-4-4',
    steps: [
      { cue: 'Breathe in', seconds: 4, scale: 1 },
      { cue: 'Hold', seconds: 4, scale: 1 },
      { cue: 'Breathe out', seconds: 4, scale: EXHALED },
      { cue: 'Hold', seconds: 4, scale: EXHALED },
    ],
  },
  calm: {
    label: 'Calm · 4-7-8',
    steps: [
      { cue: 'Breathe in', seconds: 4, scale: 1 },
      { cue: 'Hold', seconds: 7, scale: 1 },
      { cue: 'Breathe out', seconds: 8, scale: EXHALED },
    ],
  },
} satisfies Record<string, { label: string; steps: BreathStep[] }>

export type BreathPatternId = keyof typeof BREATH_PATTERNS

/** A short settle-in before the first breath, so the orb has somewhere to grow from. */
const LEAD_IN: BreathStep = { cue: 'Settle in', seconds: 2, scale: EXHALED }

/** Where in the pattern we are, `elapsed` seconds after the scene started. */
export function breathAt(elapsed: number, steps: BreathStep[]) {
  if (elapsed < LEAD_IN.seconds) {
    return { step: LEAD_IN, key: 'lead', secondsLeft: Math.ceil(LEAD_IN.seconds - elapsed) }
  }
  const cycleLength = steps.reduce((sum, s) => sum + s.seconds, 0)
  const sinceStart = elapsed - LEAD_IN.seconds
  const cycle = Math.floor(sinceStart / cycleLength)
  let t = sinceStart % cycleLength
  for (const [index, step] of steps.entries()) {
    if (t < step.seconds) return { step, key: `${cycle}-${index}`, secondsLeft: Math.ceil(step.seconds - t) }
    t -= step.seconds
  }
  return { step: steps[0], key: `${cycle + 1}-0`, secondsLeft: steps[0].seconds }
}

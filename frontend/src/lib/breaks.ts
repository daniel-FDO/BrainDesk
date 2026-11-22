/** Rules around when and how long a Mindful Break runs. */

/** Length choices offered on the launcher: a quick one, the user's Short Break setting, a long one. */
export function breakLengths(shortBreak: number) {
  return [...new Set([3, shortBreak, 10])].sort((a, b) => a - b)
}

export interface FocusEndContext {
  /** The user's "Short Break" length from Settings / the sidebar timer, in minutes. */
  shortBreak: number
  /** False when BrainDesk is in a background tab or the window is minimised. */
  tabVisible: boolean
  /** True when the cursor is in a text field (mid-note, mid-search, mid-chat). */
  typing: boolean
}

/**
 * Called once, a moment after a Pomodoro reaches 00:00. Return how many minutes
 * of Mindful Break to start automatically, or null to leave the user where they are
 * (the sidebar's break button still glows to suggest one).
 */
export function autoBreakMinutes(context: FocusEndContext): number | null {
  // TODO(human): decide when finishing a Pomodoro should roll straight into a break.
  // Returning null everywhere (the current behaviour) means "never auto-start".
  void context
  return null
}

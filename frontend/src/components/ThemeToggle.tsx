import { useTheme } from '../hooks/useTheme.ts'
import { switchTheme } from '../lib/theme.ts'
import { Icon } from './ui.tsx'

/** Top-bar sun/moon switch. Settings › Appearance also offers "match my device". */
export function ThemeToggle() {
  const { resolved } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={(e) => switchTheme(next, e.currentTarget)}
    >
      {/* Keyed so the icon re-mounts and plays its spin-in on every switch. */}
      <Icon key={resolved} name={resolved === 'dark' ? 'dark_mode' : 'light_mode'} className="theme-toggle__icon" />
    </button>
  )
}

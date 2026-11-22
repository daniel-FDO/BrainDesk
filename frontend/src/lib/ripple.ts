/**
 * Ink ripple on press for every button-like control, installed once with a single
 * delegated listener instead of wiring each component. The ripple lives in its own
 * clipped layer, so the control's own overflow and shadows are left alone.
 */
const PRESSABLE = [
  '.btn',
  '.icon-btn',
  '.filter',
  '.nav__link',
  '.segmented button',
  'button.recent',
  '.user-card',
  '.week__day',
  '.menu__item',
  '.zen-card__media',
].join(',')

export function installRipples() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  document.addEventListener('pointerdown', (e) => {
    if (reduce.matches || e.button !== 0 || !(e.target instanceof Element)) return
    const target = e.target.closest<HTMLElement>(PRESSABLE)
    if (!target || target.matches(':disabled, [aria-disabled="true"]')) return

    const rect = target.getBoundingClientRect()
    const size = Math.hypot(rect.width, rect.height) * 2
    const host = document.createElement('span')
    host.className = 'ripple-host'
    host.setAttribute('aria-hidden', 'true')
    const ink = document.createElement('span')
    ink.className = 'ripple'
    ink.style.width = ink.style.height = `${size}px`
    ink.style.left = `${e.clientX - rect.left - size / 2}px`
    ink.style.top = `${e.clientY - rect.top - size / 2}px`
    host.append(ink)
    target.append(host)
    ink.addEventListener('animationend', () => host.remove(), { once: true })
  })
}

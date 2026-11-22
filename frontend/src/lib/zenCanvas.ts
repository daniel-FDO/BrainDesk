/**
 * The animated backdrop behind a Mindful Break: twinkling stars, glowing motes
 * that drift upward, and water-like ripples (from taps, and as "rain" in the
 * Ripple scene). Plain canvas 2D, one requestAnimationFrame loop, no library.
 */
export type ZenScene = 'breathe' | 'drift' | 'ripple'

export interface ZenCanvas {
  setScene: (scene: ZenScene) => void
  ripple: (x: number, y: number, size?: number) => void
  stop: () => void
}

const TAU = Math.PI * 2
const MOTE_COLOURS = ['195 177 236', '244 171 214', '160 220 200', '255 255 255']

interface Mote {
  x: number
  y: number
  r: number
  speed: number
  sway: number
  colour: string
}
interface Ripple {
  x: number
  y: number
  r: number
  max: number
}

function newMote(anywhere: boolean): Mote {
  return {
    x: Math.random(),
    y: anywhere ? Math.random() : 1.05,
    r: 2 + Math.random() * 5,
    speed: 0.006 + Math.random() * 0.016,
    sway: Math.random() * TAU,
    colour: MOTE_COLOURS[Math.floor(Math.random() * MOTE_COLOURS.length)],
  }
}

export function startZenCanvas(canvas: HTMLCanvasElement, reduceMotion: boolean): ZenCanvas {
  const ctx = canvas.getContext('2d')
  let scene: ZenScene = 'breathe'
  let width = 0
  let height = 0
  const stars = Array.from({ length: 150 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.3 + Math.random() * 1.2,
    phase: Math.random() * TAU,
    speed: 0.4 + Math.random() * 1.3,
  }))
  const motes = Array.from({ length: 48 }, () => newMote(true))
  const ripples: Ripple[] = []

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  let last = performance.now()
  let nextDrop = 0
  let frameId = 0

  function frame(now: number) {
    frameId = requestAnimationFrame(frame)
    if (!ctx) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    ctx.clearRect(0, 0, width, height)

    // Stars
    ctx.fillStyle = '#fff'
    for (const s of stars) {
      ctx.globalAlpha = reduceMotion ? 0.5 : 0.3 + 0.4 * (0.5 + 0.5 * Math.sin((now / 1000) * s.speed + s.phase))
      ctx.beginPath()
      ctx.arc(s.x * width, s.y * height, s.r, 0, TAU)
      ctx.fill()
    }

    // Motes: the stars of the Drift scene, a quiet background elsewhere
    const drifting = scene === 'drift'
    for (const m of motes) {
      if (!reduceMotion) {
        m.y -= m.speed * dt * (drifting ? 1.4 : 0.6)
        m.sway += dt * 0.5
      }
      if (m.y < -0.05) Object.assign(m, newMote(false))
      const x = (m.x + Math.sin(m.sway) * 0.012) * width
      const y = m.y * height
      const glow = m.r * (drifting ? 4 : 3)
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glow)
      gradient.addColorStop(0, `rgb(${m.colour} / ${drifting ? 0.7 : 0.28})`)
      gradient.addColorStop(1, `rgb(${m.colour} / 0)`)
      ctx.globalAlpha = 1
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, glow, 0, TAU)
      ctx.fill()
    }

    // Ripples: "rain" in the Ripple scene, plus any the user taps
    if (scene === 'ripple' && !reduceMotion && now > nextDrop) {
      ripples.push({ x: Math.random() * width, y: Math.random() * height, r: 0, max: 90 + Math.random() * 120 })
      nextDrop = now + 700 + Math.random() * 1300
    }
    ctx.lineWidth = 1.5
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]
      r.r += dt * (reduceMotion ? 40 : 75)
      const life = 1 - r.r / r.max
      if (life <= 0) {
        ripples.splice(i, 1)
        continue
      }
      for (const [k, factor] of [1, 0.62, 0.3].entries()) {
        ctx.globalAlpha = life * (0.55 - k * 0.15)
        ctx.strokeStyle = k === 0 ? '#e4d9f5' : '#c3b1ec'
        ctx.beginPath()
        ctx.ellipse(r.x, r.y, r.r * factor, r.r * factor * 0.55, 0, 0, TAU)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }
  frameId = requestAnimationFrame(frame)

  return {
    setScene: (next) => {
      scene = next
    },
    ripple: (x, y, size = 1) => {
      if (ripples.length < 60) ripples.push({ x, y, r: 0, max: (140 + Math.random() * 120) * size })
    },
    stop: () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    },
  }
}

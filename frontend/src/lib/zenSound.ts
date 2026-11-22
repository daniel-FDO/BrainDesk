/**
 * Soft "rain" for a Mindful Break: brown noise through a low-pass filter,
 * generated in the browser (no audio file to download). Returns a stop function
 * that fades it out. Must be started from a click, as browsers block autoplay.
 */
export function startRain(): () => void {
  const audio = new AudioContext()
  const seconds = 6
  const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    // Brown noise: each sample drifts a little from the last, so it rumbles instead of hissing.
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }

  const source = audio.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1100
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0, audio.currentTime)
  gain.gain.linearRampToValueAtTime(0.4, audio.currentTime + 1.5)

  source.connect(filter).connect(gain).connect(audio.destination)
  source.start()

  return () => {
    gain.gain.cancelScheduledValues(audio.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, audio.currentTime)
    gain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.6)
    window.setTimeout(() => void audio.close(), 700)
  }
}

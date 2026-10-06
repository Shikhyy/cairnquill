/**
 * Procedural Web Audio Sound Engine (Zero external audio assets)
 * Synthesizes mechanical tactile clicks, frequency chimes, and smooth whooshes.
 */

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null
  public isMuted: boolean = false

  constructor() {
    // Check local storage for mute preference
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('cq_sound_muted') === 'true'
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (typeof window !== 'undefined') {
      localStorage.setItem('cq_sound_muted', String(this.isMuted))
    }
    if (!this.isMuted) {
      this.playClick(800, 0.03)
    }
    return this.isMuted
  }

  /**
   * Tactile mechanical click on interaction / button hover
   */
  public playClick(frequency = 650, duration = 0.035) {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + duration)

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start()
      osc.stop(this.ctx.currentTime + duration)
    } catch {
      // AudioContext auto-play restriction safety
    }
  }

  /**
   * Harmonic crystal chime for mathematically verified status
   */
  public playVerify() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const now = this.ctx.currentTime
      const chord = [880, 1320, 1760] // Harmonic triad

      chord.forEach((freq, idx) => {
        if (!this.ctx) return
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.04)

        gain.gain.setValueAtTime(0.04, now + idx * 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(now + idx * 0.04)
        osc.stop(now + idx * 0.04 + 0.35)
      })
    } catch {
      // Safety
    }
  }

  /**
   * Deep low-frequency pulse when a claim fails verification or is blocked
   */
  public playBlock() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(140, now)
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.25)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.25)
    } catch {
      // Safety
    }
  }

  /**
   * Atmospheric filtered noise sweep on section navigation
   */
  public playWhoosh() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const now = this.ctx.currentTime
      const bufferSize = this.ctx.sampleRate * 0.2
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(400, now)
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.1)
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.2)

      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(0.03, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)

      noise.start(now)
    } catch {
      // Safety
    }
  }
}

export const sound = new ProceduralSoundEngine()

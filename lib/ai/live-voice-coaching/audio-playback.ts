'use client'

/**
 * Audio Playback Manager
 *
 * Plays back PCM 24kHz audio chunks received from the Gemini Live API.
 * Implements gapless sequential playback with barge-in support.
 */

const OUTPUT_SAMPLE_RATE = 24000

export class AudioPlaybackManager {
  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private nextPlayTime = 0
  private activeSources: AudioBufferSourceNode[] = []
  private _isSpeaking = false

  /** True when audio is being played */
  get isSpeaking(): boolean {
    return this._isSpeaking
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {})
    }
    return this.audioContext
  }

  /** Enqueue a PCM 16-bit audio chunk for playback */
  enqueue(pcmData: ArrayBuffer): void {
    const ctx = this.ensureContext()
    if (!this.gainNode) return

    // Convert Int16 PCM to Float32
    const int16 = new Int16Array(pcmData)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x8000
    }

    // Create audio buffer
    const audioBuffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE)
    audioBuffer.getChannelData(0).set(float32)

    // Create source node
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.gainNode)

    // Schedule gapless playback
    const now = ctx.currentTime
    if (this.nextPlayTime < now) {
      this.nextPlayTime = now
    }

    source.start(this.nextPlayTime)
    this.nextPlayTime += audioBuffer.duration
    this._isSpeaking = true

    this.activeSources.push(source)
    source.onended = () => {
      const idx = this.activeSources.indexOf(source)
      if (idx !== -1) this.activeSources.splice(idx, 1)
      if (this.activeSources.length === 0) {
        this._isSpeaking = false
      }
    }
  }

  /** Interrupt current playback (for barge-in) */
  interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.stop()
      } catch {
        // Already stopped
      }
    }
    this.activeSources = []
    this.nextPlayTime = 0
    this._isSpeaking = false
  }

  /** Set playback volume (0-1) */
  setVolume(level: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, level))
    }
  }

  /** Clean up audio resources */
  close(): void {
    this.interrupt()
    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
      this.gainNode = null
    }
  }
}

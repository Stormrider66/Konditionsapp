'use client'

/**
 * Audio Capture Manager
 *
 * Captures microphone audio as raw PCM 16kHz 16-bit mono for the Gemini Live API.
 * Uses AudioWorklet for modern browsers, falls back to ScriptProcessorNode.
 */

const SAMPLE_RATE = 16000
const CHUNK_INTERVAL_MS = 100 // Send audio chunks every 100ms

// AudioWorklet processor source (registered via Blob URL to avoid a separate file)
const WORKLET_PROCESSOR_CODE = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = []
    this._sampleCount = 0
    this._chunkSize = ${Math.floor(SAMPLE_RATE * CHUNK_INTERVAL_MS / 1000)}
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const samples = input[0]
    for (let i = 0; i < samples.length; i++) {
      this._buffer.push(samples[i])
      this._sampleCount++

      if (this._sampleCount >= this._chunkSize) {
        this.port.postMessage(new Float32Array(this._buffer))
        this._buffer = []
        this._sampleCount = 0
      }
    }
    return true
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor)
`

function float32ToPCM16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16.buffer
}

export class AudioCaptureManager {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private sinkNode: GainNode | null = null
  private _isCapturing = false
  private _isMuted = false

  onChunk: ((pcmData: ArrayBuffer) => void) | null = null

  get isCapturing(): boolean {
    return this._isCapturing
  }

  get isMuted(): boolean {
    return this._isMuted
  }

  async start(): Promise<void> {
    if (this._isCapturing) return

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: SAMPLE_RATE,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

    const workletSupported = typeof AudioWorkletNode !== 'undefined'

    if (workletSupported) {
      await this.setupWorklet()
    } else {
      this.setupScriptProcessor()
    }

    this._isCapturing = true
  }

  private async setupWorklet(): Promise<void> {
    if (!this.audioContext || !this.sourceNode) return

    const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)

    try {
      await this.audioContext.audioWorklet.addModule(url)
    } finally {
      URL.revokeObjectURL(url)
    }

    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor')
    this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!this._isMuted && this.onChunk) {
        this.onChunk(float32ToPCM16(event.data))
      }
    }

    this.sinkNode = this.audioContext.createGain()
    this.sinkNode.gain.value = 0

    this.sourceNode.connect(this.workletNode)
    this.workletNode.connect(this.sinkNode)
    this.sinkNode.connect(this.audioContext.destination)
  }

  private setupScriptProcessor(): void {
    if (!this.audioContext || !this.sourceNode) return

    const bufferSize = Math.pow(2, Math.ceil(Math.log2(SAMPLE_RATE * CHUNK_INTERVAL_MS / 1000)))
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

    this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!this._isMuted && this.onChunk) {
        const inputData = event.inputBuffer.getChannelData(0)
        this.onChunk(float32ToPCM16(new Float32Array(inputData)))
      }
    }

    this.sinkNode = this.audioContext.createGain()
    this.sinkNode.gain.value = 0

    this.sourceNode.connect(this.scriptProcessor)
    this.scriptProcessor.connect(this.sinkNode)
    this.sinkNode.connect(this.audioContext.destination)
  }

  mute(): void {
    this._isMuted = true
  }

  unmute(): void {
    this._isMuted = false
  }

  stop(): void {
    this._isCapturing = false
    this._isMuted = false

    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.sinkNode) {
      this.sinkNode.disconnect()
      this.sinkNode = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    )
  }
}

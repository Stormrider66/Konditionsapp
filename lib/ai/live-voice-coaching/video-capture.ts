'use client'

/**
 * Video Capture Manager
 *
 * Captures camera frames at low FPS for real-time form coaching.
 * Sends JPEG frames to the Gemini Live API via the client.
 */

const FRAME_INTERVAL_MS = 500 // ~2 FPS
const FRAME_WIDTH = 640
const FRAME_HEIGHT = 480
const JPEG_QUALITY = 0.6

export class VideoCaptureManager {
  private videoElement: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private mediaStream: MediaStream | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private _isCapturing = false

  onFrame: ((base64Data: string, mimeType: string) => void) | null = null

  get isCapturing(): boolean {
    return this._isCapturing
  }

  async start(): Promise<void> {
    if (this._isCapturing) return

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: FRAME_WIDTH },
        height: { ideal: FRAME_HEIGHT },
        facingMode: 'user',
        frameRate: { ideal: 5 },
      },
    })

    // Create off-screen video element
    this.videoElement = document.createElement('video')
    this.videoElement.srcObject = this.mediaStream
    this.videoElement.muted = true
    this.videoElement.playsInline = true
    await this.videoElement.play()

    // Create canvas for frame extraction
    this.canvas = document.createElement('canvas')
    this.canvas.width = FRAME_WIDTH
    this.canvas.height = FRAME_HEIGHT
    this.ctx = this.canvas.getContext('2d')

    this._isCapturing = true

    // Capture frames at interval
    this.intervalId = setInterval(() => {
      this.captureFrame()
    }, FRAME_INTERVAL_MS)
  }

  private captureFrame(): void {
    if (!this.videoElement || !this.canvas || !this.ctx || !this.onFrame) return

    this.ctx.drawImage(this.videoElement, 0, 0, FRAME_WIDTH, FRAME_HEIGHT)
    const dataUrl = this.canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    // Strip the data URL prefix to get raw base64
    const base64 = dataUrl.split(',')[1]
    if (base64) {
      this.onFrame(base64, 'image/jpeg')
    }
  }

  stop(): void {
    this._isCapturing = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null
      this.videoElement = null
    }

    this.canvas = null
    this.ctx = null
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    )
  }
}

'use client'

/**
 * Gemini Live Voice Client
 *
 * Browser-compatible wrapper around the @google/genai SDK's Live API.
 * Uses ephemeral tokens (created server-side) so the real API key never reaches the browser.
 */

import { GoogleGenAI, Modality } from '@google/genai'
import type { Session, LiveServerMessage, LiveConnectConfig } from '@google/genai'

export interface GeminiLiveCallbacks {
  onAudioData?: (audioData: ArrayBuffer) => void
  onTextResponse?: (text: string) => void
  onToolCall?: (toolCall: LiveServerMessage['toolCall']) => void
  onInputTranscript?: (text: string) => void
  onOutputTranscript?: (text: string) => void
  onError?: (error: Error) => void
  onClose?: () => void
  onConnected?: () => void
  onInterrupted?: () => void
}

export interface GeminiLiveConnectOptions {
  token: string
  model: string
  config?: Partial<LiveConnectConfig>
  callbacks: GeminiLiveCallbacks
}

export class GeminiLiveVoiceClient {
  private session: Session | null = null
  private ai: GoogleGenAI | null = null
  private callbacks: GeminiLiveCallbacks = {}
  private _isConnected = false

  // Duration tracking for cost reporting
  audioInputDuration = 0
  audioOutputDuration = 0
  private lastAudioSendTime = 0

  get isConnected(): boolean {
    return this._isConnected
  }

  async connect(options: GeminiLiveConnectOptions): Promise<void> {
    const { token, model, config, callbacks } = options
    this.callbacks = callbacks

    // The SDK accepts ephemeral tokens in place of API keys
    // Live API requires v1alpha endpoint
    this.ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } })

    this.session = await this.ai.live.connect({
      model,
      callbacks: {
        onopen: () => {
          this._isConnected = true
          this.callbacks.onConnected?.()
        },
        onmessage: (msg: LiveServerMessage) => {
          this.handleMessage(msg)
        },
        onerror: (e: ErrorEvent) => {
          this.callbacks.onError?.(new Error(e.message || 'Live API connection error'))
        },
        onclose: () => {
          this._isConnected = false
          this.callbacks.onClose?.()
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        ...config,
      },
    })
  }

  private handleMessage(msg: LiveServerMessage): void {
    // Handle audio response
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          const binaryString = atob(part.inlineData.data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          // Track audio output duration (~24000 samples/sec, 2 bytes per sample)
          this.audioOutputDuration += bytes.length / (24000 * 2)
          this.callbacks.onAudioData?.(bytes.buffer)
        }
        if (part.text) {
          this.callbacks.onTextResponse?.(part.text)
        }
      }
    }

    // Handle interrupted (barge-in detected)
    if (msg.serverContent?.interrupted) {
      this.callbacks.onInterrupted?.()
    }

    // Handle tool calls
    if (msg.toolCall) {
      this.callbacks.onToolCall?.(msg.toolCall)
    }

    // Handle input audio transcription
    if (msg.serverContent?.inputTranscription?.text) {
      this.callbacks.onInputTranscript?.(msg.serverContent.inputTranscription.text)
    }

    // Handle output audio transcription
    if (msg.serverContent?.outputTranscription?.text) {
      this.callbacks.onOutputTranscript?.(msg.serverContent.outputTranscription.text)
    }

    // Handle go-away (server requesting disconnect)
    if (msg.goAway) {
      // Session will close soon — the hook handles reconnection
      this.callbacks.onError?.(new Error('Server requested disconnect'))
    }
  }

  /** Send raw PCM audio to the Live API */
  sendAudio(pcmData: ArrayBuffer): void {
    if (!this.session || !this._isConnected) return

    // Track audio input duration (~16000 samples/sec, 2 bytes per sample)
    this.audioInputDuration += pcmData.byteLength / (16000 * 2)

    // SDK expects base64-encoded data, not browser Blob
    const bytes = new Uint8Array(pcmData)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)

    this.session.sendRealtimeInput({
      audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
    })
  }

  /** Send text message (for non-audio commands) */
  sendText(text: string): void {
    if (!this.session || !this._isConnected) return

    this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
    })
  }

  /** Send a video frame to the Live API for form coaching */
  sendVideoFrame(base64Data: string, mimeType: string): void {
    if (!this.session || !this._isConnected) return

    this.session.sendRealtimeInput({
      media: { data: base64Data, mimeType },
    })
  }

  /** Send tool call response back to the model */
  sendToolResponse(
    functionResponses: Array<{ id: string; name: string; response: Record<string, unknown> }>
  ): void {
    if (!this.session || !this._isConnected) return

    this.session.sendToolResponse({ functionResponses })
  }

  /** Close the Live API session */
  close(): void {
    if (this.session) {
      this.session.close()
      this.session = null
    }
    this._isConnected = false
    this.ai = null
  }
}

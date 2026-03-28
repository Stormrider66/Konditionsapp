'use client'

/**
 * Live Voice Coach Hook
 *
 * Manages a real-time bidirectional voice coaching session using the Gemini Live API.
 * Handles audio capture, playback, tool call dispatching, and session lifecycle.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { GeminiLiveVoiceClient } from '@/lib/ai/live-voice-coaching/gemini-live-client'
import { AudioCaptureManager } from '@/lib/ai/live-voice-coaching/audio-capture'
import { AudioPlaybackManager } from '@/lib/ai/live-voice-coaching/audio-playback'
import type {
  LiveVoiceStatus,
  LiveCoachingToolCallbacks,
  LiveWorkoutStatus,
  LiveVoiceSessionConfig,
} from '@/lib/ai/live-voice-coaching/types'
import { estimateLiveSessionCost } from '@/lib/ai/gemini-config'

interface FocusModeSegment {
  type: string
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedZone?: number
  notes?: string
}

export interface UseLiveVoiceCoachOptions {
  assignmentId: string
  segments: FocusModeSegment[]
  currentSegmentIndex: number
  isTimerRunning: boolean
  timerSecondsRemaining: number | null
  toolCallbacks: LiveCoachingToolCallbacks
}

export interface UseLiveVoiceCoachReturn {
  status: LiveVoiceStatus
  isListening: boolean
  isSpeaking: boolean
  isMuted: boolean
  transcript: string | null
  estimatedCostUsd: number
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  toggleMute: () => void
  supported: boolean
}

export function useLiveVoiceCoach(options: UseLiveVoiceCoachOptions): UseLiveVoiceCoachReturn {
  const {
    assignmentId,
    segments,
    currentSegmentIndex,
    isTimerRunning,
    timerSecondsRemaining,
    toolCallbacks,
  } = options

  const [status, setStatus] = useState<LiveVoiceStatus>('idle')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clientRef = useRef<GeminiLiveVoiceClient | null>(null)
  const captureRef = useRef<AudioCaptureManager | null>(null)
  const playbackRef = useRef<AudioPlaybackManager | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const callbacksRef = useRef(toolCallbacks)
  callbacksRef.current = toolCallbacks

  // Keep latest state in refs for tool call responses
  const stateRef = useRef({
    currentSegmentIndex,
    segments,
    isTimerRunning,
    timerSecondsRemaining,
  })
  stateRef.current = { currentSegmentIndex, segments, isTimerRunning, timerSecondsRemaining }

  const supported = typeof window !== 'undefined' && AudioCaptureManager.isSupported()

  const estimatedCostUsd = clientRef.current
    ? estimateLiveSessionCost(
        (Date.now() - startTimeRef.current) / 1000,
        clientRef.current.audioInputDuration,
        clientRef.current.audioOutputDuration,
      ).totalCost
    : 0

  const handleToolCall = useCallback((toolCall: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tc = toolCall as any
    if (!tc?.functionCalls) return

    const responses: Array<{ id: string; name: string; response: Record<string, unknown> }> = []

    for (const call of tc.functionCalls) {
      const { name, id, args } = call
      const state = stateRef.current
      const cbs = callbacksRef.current

      let result: Record<string, unknown> = { success: true }

      switch (name) {
        case 'skip_segment':
          cbs.onSkipSegment()
          result = { success: true, message: 'Segment skipped' }
          break
        case 'pause_workout':
          cbs.onPauseWorkout()
          result = { success: true, message: 'Workout paused' }
          break
        case 'resume_workout':
          cbs.onResumeWorkout()
          result = { success: true, message: 'Workout resumed' }
          break
        case 'extend_segment':
          cbs.onExtendSegment(args?.seconds || 30)
          result = { success: true, message: `Extended by ${args?.seconds || 30} seconds` }
          break
        case 'mark_segment_complete':
          cbs.onMarkSegmentComplete()
          result = { success: true, message: 'Segment marked complete' }
          break
        case 'adjust_intensity':
          cbs.onAdjustIntensity(args?.direction || 'easier', args?.note)
          result = { success: true, direction: args?.direction }
          break
        case 'get_current_status': {
          const seg = state.segments[state.currentSegmentIndex]
          const status: LiveWorkoutStatus = {
            currentSegmentIndex: state.currentSegmentIndex,
            totalSegments: state.segments.length,
            currentSegmentType: seg?.type || 'UNKNOWN',
            currentSegmentTypeName: seg?.typeName || 'Unknown',
            timeRemainingSeconds: state.timerSecondsRemaining,
            isRunning: state.isTimerRunning,
            segmentsCompleted: state.currentSegmentIndex,
          }
          result = status as unknown as Record<string, unknown>
          break
        }
        default:
          result = { success: false, error: `Unknown tool: ${name}` }
      }

      responses.push({ id, name, response: result })
    }

    clientRef.current?.sendToolResponse(responses)
  }, [])

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return

    setStatus('connecting')
    setError(null)

    try {
      // Fetch ephemeral token from server
      const res = await fetch('/api/athlete/live-voice-coaching/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to initialize (${res.status})`)
      }

      const config: LiveVoiceSessionConfig = await res.json()
      sessionIdRef.current = config.sessionId
      startTimeRef.current = Date.now()

      // Initialize audio components
      const capture = new AudioCaptureManager()
      const playback = new AudioPlaybackManager()
      captureRef.current = capture
      playbackRef.current = playback

      // Initialize Gemini Live client
      const client = new GeminiLiveVoiceClient()
      clientRef.current = client

      // Wire audio: capture → Live API → playback
      capture.onChunk = (pcmData) => {
        client.sendAudio(pcmData)
      }

      await client.connect({
        token: config.ephemeralToken,
        model: config.model,
        callbacks: {
          onConnected: () => {
            setStatus('connected')
            setIsListening(true)
          },
          onAudioData: (audioData) => {
            playback.enqueue(audioData)
            setIsSpeaking(true)
            // Clear speaking flag after a short delay (last chunk indicator)
            setTimeout(() => {
              if (!playback.isSpeaking) setIsSpeaking(false)
            }, 500)
          },
          onTextResponse: (text) => {
            setTranscript(text)
          },
          onOutputTranscript: (text) => {
            setTranscript(text)
          },
          onToolCall: handleToolCall,
          onInterrupted: () => {
            playback.interrupt()
            setIsSpeaking(false)
          },
          onError: (err) => {
            setError(err.message)
            setStatus('error')
          },
          onClose: () => {
            setIsListening(false)
            setIsSpeaking(false)
            if (status !== 'ended') {
              setStatus('ended')
            }
          },
        },
      })

      // Start capturing audio
      await capture.start()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      setError(message)
      setStatus('error')
    }
  }, [assignmentId, status, handleToolCall])

  const disconnect = useCallback(() => {
    const sessionId = sessionIdRef.current
    const client = clientRef.current
    const capture = captureRef.current
    const playback = playbackRef.current
    const duration = startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0

    // Stop audio
    capture?.stop()
    playback?.close()
    client?.close()

    captureRef.current = null
    playbackRef.current = null
    clientRef.current = null

    setIsListening(false)
    setIsSpeaking(false)
    setStatus('ended')

    // Report session end
    if (sessionId && duration > 0) {
      fetch('/api/athlete/live-voice-coaching/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          durationSeconds: Math.round(duration),
          audioInputSeconds: client?.audioInputDuration ?? 0,
          audioOutputSeconds: client?.audioOutputDuration ?? 0,
          segmentsCompleted: stateRef.current.currentSegmentIndex,
          endReason: 'user_cancelled',
        }),
      }).catch(() => {})
    }
  }, [])

  const toggleMute = useCallback(() => {
    const capture = captureRef.current
    if (!capture) return

    if (isMuted) {
      capture.unmute()
      setIsMuted(false)
    } else {
      capture.mute()
      setIsMuted(true)
    }
  }, [isMuted])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current?.isConnected) {
        disconnect()
      }
    }
  }, [disconnect])

  // Send segment change notifications to the AI
  useEffect(() => {
    if (status !== 'connected' || !clientRef.current?.isConnected) return

    const seg = segments[currentSegmentIndex]
    if (!seg) return

    const text = `[SEGMENT CHANGE] Now on segment ${currentSegmentIndex + 1} of ${segments.length}: ${seg.typeName}${seg.plannedDuration ? `, ${Math.floor(seg.plannedDuration / 60)} minutes` : ''}${seg.plannedZone ? `, Zone ${seg.plannedZone}` : ''}`
    clientRef.current.sendText(text)
  }, [currentSegmentIndex, segments, status])

  return {
    status,
    isListening,
    isSpeaking,
    isMuted,
    transcript,
    estimatedCostUsd,
    error,
    connect,
    disconnect,
    toggleMute,
    supported,
  }
}

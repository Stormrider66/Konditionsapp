'use client'

/**
 * Live Voice Coach Hook
 *
 * Manages a real-time bidirectional voice coaching session using the Gemini Live API.
 * Handles audio capture/playback, optional video capture, HR feed, transcript collection,
 * tool call dispatching, and session lifecycle.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
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
import {
  type AiAllowanceExhaustedError,
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'

interface FocusModeSegment {
  type: string
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedZone?: number
  notes?: string
}

/**
 * Translate a connection failure into a message the athlete can act on.
 * The server already returns friendly text (plain Error.message), so we only
 * remap the cryptic browser DOMExceptions thrown by getUserMedia / WebSocket.
 */
function describeConnectError(err: unknown): string {
  if (err instanceof Error) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Microphone access was blocked. Allow microphone access for this site, then try again.'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No microphone was found. Connect a microphone and try again.'
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Your microphone is being used by another app. Close it and try again.'
      case 'SecurityError':
        return 'The voice coach could not connect securely. Reload the page and try again.'
      default:
        return err.message || 'Could not start the voice coach.'
    }
  }
  return 'Could not start the voice coach.'
}

interface TranscriptEntry {
  role: 'athlete' | 'coach_ai'
  content: string
  timestamp: string
}

export interface UseLiveVoiceCoachOptions {
  assignmentId: string
  /** Workout type */
  workoutType?: 'cardio' | 'strength' | 'hybrid'
  segments: FocusModeSegment[]
  currentSegmentIndex: number
  isTimerRunning: boolean
  timerSecondsRemaining: number | null
  toolCallbacks: LiveCoachingToolCallbacks
  /** Current heart rate from HR monitor (null if unavailable) */
  heartRate?: number | null
  /** Current HR zone (1-5) */
  heartRateZone?: number | null
  /** Enable camera for form coaching */
  enableCamera?: boolean
}

export interface UseLiveVoiceCoachReturn {
  status: LiveVoiceStatus
  isListening: boolean
  isSpeaking: boolean
  isMuted: boolean
  transcript: string | null
  estimatedCostUsd: number
  error: string | null
  aiAllowanceAction: {
    label: string
    url: string
  } | null
  connect: () => Promise<void>
  disconnect: () => void
  toggleMute: () => void
  supported: boolean
}

export function useLiveVoiceCoach(options: UseLiveVoiceCoachOptions): UseLiveVoiceCoachReturn {
  const {
    assignmentId,
    workoutType = 'cardio',
    segments,
    currentSegmentIndex,
    isTimerRunning,
    timerSecondsRemaining,
    toolCallbacks,
    heartRate,
    heartRateZone,
    enableCamera,
  } = options

  const [status, setStatus] = useState<LiveVoiceStatus>('idle')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiAllowanceAction, setAiAllowanceAction] = useState<{
    label: string
    url: string
  } | null>(null)

  const clientRef = useRef<GeminiLiveVoiceClient | null>(null)
  const captureRef = useRef<AudioCaptureManager | null>(null)
  const playbackRef = useRef<AudioPlaybackManager | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const callbacksRef = useRef(toolCallbacks)
  callbacksRef.current = toolCallbacks

  // Transcript collection
  const transcriptsRef = useRef<TranscriptEntry[]>([])

  // HR tracking for deduplication
  const lastSentHRRef = useRef<number | null>(null)

  // Keep latest state in refs for tool call responses
  const stateRef = useRef({
    currentSegmentIndex,
    segments,
    isTimerRunning,
    timerSecondsRemaining,
    heartRate: heartRate ?? null,
    heartRateZone: heartRateZone ?? null,
  })
  stateRef.current = {
    currentSegmentIndex,
    segments,
    isTimerRunning,
    timerSecondsRemaining,
    heartRate: heartRate ?? null,
    heartRateZone: heartRateZone ?? null,
  }

  const supported = typeof window !== 'undefined' && AudioCaptureManager.isSupported()

  const setAiAllowanceError = useCallback((allowanceError: AiAllowanceExhaustedError) => {
    setError(`${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`)
    setAiAllowanceAction({
      label: allowanceError.actionLabel,
      url: allowanceError.actionUrl,
    })
  }, [])

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
        case 'end_coaching': {
          result = { success: true, message: 'Coaching session ending' }
          // Defer disconnect to after tool response is sent
          setTimeout(() => { cbs.onEndCoaching?.() }, 500)
          break
        }
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
          const statusData: LiveWorkoutStatus = {
            currentSegmentIndex: state.currentSegmentIndex,
            totalSegments: state.segments.length,
            currentSegmentType: seg?.type || 'UNKNOWN',
            currentSegmentTypeName: seg?.typeName || 'Unknown',
            timeRemainingSeconds: state.timerSecondsRemaining,
            isRunning: state.isTimerRunning,
            segmentsCompleted: state.currentSegmentIndex,
          }
          result = statusData as unknown as Record<string, unknown>
          break
        }
        case 'get_heart_rate': {
          result = {
            heartRate: state.heartRate,
            zone: state.heartRateZone,
            available: state.heartRate !== null,
          }
          break
        }
        // ─── Strength-specific tools ────────────────────────────────
        case 'log_set': {
          if (cbs.onLogSet) {
            // Async tool call — send response after API completes
            const logData = { weight: args?.weight ?? 0, reps: args?.reps ?? 0, rpe: args?.rpe }
            cbs.onLogSet(logData).then((logResult) => {
              clientRef.current?.sendToolResponse([{
                id, name, response: logResult as unknown as Record<string, unknown>,
              }])
            }).catch(() => {
              clientRef.current?.sendToolResponse([{
                id, name, response: { success: false, error: 'Failed to log set' },
              }])
            })
            continue // Skip synchronous response push
          }
          result = { success: false, error: 'Set logging not available' }
          break
        }
        case 'get_exercise_status': {
          // Delegate to parent via get_current_status equivalent for strength
          result = { success: true, message: 'Use get_current_status for workout info' }
          break
        }
        case 'skip_exercise': {
          cbs.onSkipExercise?.()
          result = { success: true, message: 'Exercise skipped' }
          break
        }
        case 'complete_exercise': {
          cbs.onCompleteExercise?.()
          result = { success: true, message: 'Exercise completed' }
          break
        }
        case 'start_rest_timer': {
          cbs.onStartRestTimer?.(args?.seconds)
          result = { success: true, message: `Rest timer started${args?.seconds ? ` for ${args.seconds}s` : ''}` }
          break
        }
        // ─── Hybrid-specific tools ──────────────────────────────────
        case 'complete_round': {
          cbs.onCompleteRound?.()
          result = { success: true, message: 'Round completed', extraReps: args?.extraReps }
          break
        }
        case 'get_workout_timer': {
          const timerData = cbs.onGetWorkoutTimer?.()
          result = timerData
            ? (timerData as unknown as Record<string, unknown>)
            : { elapsedSeconds: 0, remainingSeconds: null, currentRound: 0, totalRounds: null }
          break
        }
        default:
          result = { success: false, error: `Unknown tool: ${name}` }
      }

      responses.push({ id, name, response: result })
    }

    if (responses.length > 0) {
      clientRef.current?.sendToolResponse(responses)
    }
  }, [])

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return

    setStatus('connecting')
    setError(null)
    setAiAllowanceAction(null)
    transcriptsRef.current = []

    try {
      // Fetch ephemeral token from server
      const res = await fetch('/api/athlete/live-voice-coaching/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutType, assignmentId, enableCamera: enableCamera ?? false }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const allowanceError = parseAiAllowanceError(data)
        if (allowanceError) throw allowanceError
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
            setTimeout(() => {
              if (!playback.isSpeaking) setIsSpeaking(false)
            }, 500)
          },
          onTextResponse: (text) => {
            setTranscript(text)
          },
          onInputTranscript: (text) => {
            if (text.trim()) {
              transcriptsRef.current.push({
                role: 'athlete',
                content: text,
                timestamp: new Date().toISOString(),
              })
            }
          },
          onOutputTranscript: (text) => {
            setTranscript(text)
            if (text.trim()) {
              transcriptsRef.current.push({
                role: 'coach_ai',
                content: text,
                timestamp: new Date().toISOString(),
              })
            }
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

      // Start camera capture if enabled
      if (enableCamera) {
        import('@/lib/ai/live-voice-coaching/video-capture').then(({ VideoCaptureManager }) => {
          const video = new VideoCaptureManager()
          video.onFrame = (base64, mimeType) => {
            client.sendVideoFrame(base64, mimeType)
          }
          video.start().catch(() => {})
        }).catch(() => {})
      }
    } catch (err) {
      if (isAiAllowanceExhaustedError(err)) {
        setAiAllowanceError(err)
      } else {
        setError(describeConnectError(err))
        setAiAllowanceAction(null)
      }
      setStatus('error')
    }
  }, [assignmentId, status, handleToolCall, enableCamera, setAiAllowanceError, workoutType])

  const disconnect = useCallback(() => {
    const sessionId = sessionIdRef.current
    const client = clientRef.current
    const capture = captureRef.current
    const playback = playbackRef.current
    const duration = startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0
    const transcripts = [...transcriptsRef.current]

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
    setAiAllowanceAction(null)

    // Report session end with transcripts
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
          transcripts: transcripts.length > 0 ? transcripts : undefined,
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

  // Surface errors visibly. Allowance errors render their own inline action
  // (with an upgrade link), so toast everything else — connection/mic/setup
  // failures that would otherwise only show up in the button's hover tooltip.
  const lastToastedErrorRef = useRef<string | null>(null)
  useEffect(() => {
    if (!error || aiAllowanceAction) {
      lastToastedErrorRef.current = null
      return
    }
    if (lastToastedErrorRef.current === error) return
    lastToastedErrorRef.current = error
    toast.error(error)
  }, [error, aiAllowanceAction])

  // Send segment change notifications to the AI
  useEffect(() => {
    if (status !== 'connected' || !clientRef.current?.isConnected) return

    const seg = segments[currentSegmentIndex]
    if (!seg) return

    const text = `[SEGMENT CHANGE] Now on segment ${currentSegmentIndex + 1} of ${segments.length}: ${seg.typeName}${seg.plannedDuration ? `, ${Math.floor(seg.plannedDuration / 60)} minutes` : ''}${seg.plannedZone ? `, Zone ${seg.plannedZone}` : ''}`
    clientRef.current.sendText(text)
  }, [currentSegmentIndex, segments, status])

  // Send HR updates to the AI (only when HR changes by >=3 bpm to avoid spam)
  useEffect(() => {
    if (status !== 'connected' || !clientRef.current?.isConnected) return
    if (heartRate == null) return

    const lastSent = lastSentHRRef.current
    if (lastSent !== null && Math.abs(heartRate - lastSent) < 3) return

    lastSentHRRef.current = heartRate
    const zoneText = heartRateZone ? ` (Zone ${heartRateZone})` : ''
    clientRef.current.sendText(`[HR UPDATE] Current heart rate: ${heartRate} bpm${zoneText}`)
  }, [heartRate, heartRateZone, status])

  return {
    status,
    isListening,
    isSpeaking,
    isMuted,
    transcript,
    estimatedCostUsd,
    error,
    aiAllowanceAction,
    connect,
    disconnect,
    toggleMute,
    supported,
  }
}

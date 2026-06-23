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
  LiveMachineMetrics,
  LivePostWorkoutDebrief,
  LivePerformanceSnapshot,
} from '@/lib/ai/live-voice-coaching/types'
import type { VideoCaptureManager } from '@/lib/ai/live-voice-coaching/video-capture'
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

function roundedBucket(value: number | null | undefined, bucket: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return String(Math.round(value / bucket) * bucket)
}

function buildLiveMetricsSignature(metrics: LiveMachineMetrics): string {
  return [
    metrics.segmentIndex ?? '-',
    roundedBucket(metrics.power, 5),
    roundedBucket(metrics.targetPower, 5),
    roundedBucket(metrics.averagePower, 5),
    roundedBucket(metrics.cadence, 2),
    roundedBucket(metrics.strokeRate, 2),
    roundedBucket(metrics.distanceKm != null ? metrics.distanceKm * 100 : null, 5),
    roundedBucket(metrics.calories, 2),
    roundedBucket(metrics.heartRate, 3),
    roundedBucket(metrics.timeRemainingSeconds, 15),
    metrics.isTimerRunning ? 'run' : 'paused',
  ].join('|')
}

function buildLiveMetricsMessage(metrics: LiveMachineMetrics): string {
  const parts: string[] = []

  if (metrics.equipment) parts.push(`equipment ${metrics.equipment}`)
  if (metrics.segmentTypeName) parts.push(`segment ${metrics.segmentTypeName}`)
  if (typeof metrics.power === 'number') parts.push(`${Math.round(metrics.power)} W`)
  if (typeof metrics.targetPower === 'number') {
    const delta = typeof metrics.power === 'number' ? ` (${Math.round(metrics.power - metrics.targetPower)} W vs target)` : ''
    parts.push(`target ${Math.round(metrics.targetPower)} W${delta}`)
  }
  if (typeof metrics.averagePower === 'number') parts.push(`avg ${Math.round(metrics.averagePower)} W`)
  if (typeof metrics.cadence === 'number') parts.push(`${Math.round(metrics.cadence)} rpm`)
  if (typeof metrics.strokeRate === 'number') parts.push(`${Math.round(metrics.strokeRate)} spm`)
  if (typeof metrics.paceSeconds === 'number') {
    const mins = Math.floor(metrics.paceSeconds / 60)
    const secs = Math.round(metrics.paceSeconds % 60).toString().padStart(2, '0')
    parts.push(`${mins}:${secs}/500m`)
  }
  if (typeof metrics.distanceKm === 'number') parts.push(`${metrics.distanceKm.toFixed(2)} km`)
  if (typeof metrics.calories === 'number') {
    parts.push(`${metrics.calories}${metrics.targetCalories ? `/${metrics.targetCalories}` : ''} cal`)
  }
  if (typeof metrics.heartRate === 'number') {
    parts.push(`${Math.round(metrics.heartRate)} bpm${metrics.heartRateZone ? ` Z${metrics.heartRateZone}` : ''}`)
  }
  if (typeof metrics.timeRemainingSeconds === 'number') {
    const mins = Math.floor(metrics.timeRemainingSeconds / 60)
    const secs = Math.round(metrics.timeRemainingSeconds % 60).toString().padStart(2, '0')
    parts.push(`${mins}:${secs} remaining`)
  }

  return `[LIVE METRICS] ${parts.length > 0 ? parts.join(' | ') : 'No live machine metrics available.'}`
}

function containsPainConcern(text: string): boolean {
  const normalized = text.toLowerCase()
  const painPatterns = [
    /\bpain\b/u,
    /\bhurts?\b/u,
    /\bhurting\b/u,
    /\binjur(y|ed|ies)\b/u,
    /\baches?\b/u,
    /\baching\b/u,
    /\bcramp(s|ing)?\b/u,
    /\bsharp\b/u,
    /\bsmärta\b/u,
    /\bsmärtar\b/u,
    /\bsmärtor\b/u,
    /\bsmarta\b/u,
    /\bsmartar\b/u,
    /\bsmartor\b/u,
    /\bont\b/u,
    /\bskada(d)?\b/u,
    /\bvärk\b/u,
    /\bvark\b/u,
    /\bkramp\b/u,
  ]
  const negatedPainPattern =
    /\b(no|not|without|none|ingen|inte|utan|nej)\b.{0,24}\b(pain|hurt|hurts|injury|ache|cramp|smärta|smärtar|smärtor|smarta|smartar|smartor|ont|skada|värk|vark|kramp)\b/u
  if (negatedPainPattern.test(normalized)) return false
  return painPatterns.some((pattern) => pattern.test(normalized))
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
  /** Current bike/erg metrics, when a machine is connected */
  liveMetrics?: LiveMachineMetrics | null
  /** Structured post-workout debrief to include when the coaching session ends */
  postWorkoutDebrief?: LivePostWorkoutDebrief | null
  /** Performance facts to include when the coaching session ends */
  performanceSnapshot?: LivePerformanceSnapshot | null
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
  disconnect: (endReason?: 'completed' | 'user_cancelled' | 'error' | 'timeout') => void
  sendContextMessage: (message: string) => void
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
    liveMetrics,
    postWorkoutDebrief,
    performanceSnapshot,
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
  const videoCaptureRef = useRef<VideoCaptureManager | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const callbacksRef = useRef(toolCallbacks)
  callbacksRef.current = toolCallbacks
  const disconnectRef = useRef<(() => void) | null>(null)
  const sessionReportedRef = useRef(false)

  // Transcript collection
  const transcriptsRef = useRef<TranscriptEntry[]>([])

  // HR tracking for deduplication
  const lastSentHRRef = useRef<number | null>(null)
  const lastSentMetricsRef = useRef<{
    at: number
    signature: string
    segmentIndex: number | null
  } | null>(null)

  // Keep latest state in refs for tool call responses
  const stateRef = useRef({
    currentSegmentIndex,
    segments,
    isTimerRunning,
    timerSecondsRemaining,
    heartRate: heartRate ?? null,
    heartRateZone: heartRateZone ?? null,
    liveMetrics: liveMetrics ?? null,
    postWorkoutDebrief: postWorkoutDebrief ?? null,
    performanceSnapshot: performanceSnapshot ?? null,
  })
  stateRef.current = {
    currentSegmentIndex,
    segments,
    isTimerRunning,
    timerSecondsRemaining,
    heartRate: heartRate ?? null,
    heartRateZone: heartRateZone ?? null,
    liveMetrics: liveMetrics ?? null,
    postWorkoutDebrief: postWorkoutDebrief ?? null,
    performanceSnapshot: performanceSnapshot ?? null,
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
    let shouldEndCoaching = false

    for (const call of tc.functionCalls) {
      const { name, id, args } = call
      const state = stateRef.current
      const cbs = callbacksRef.current

      let result: Record<string, unknown> = { success: true }

      switch (name) {
        case 'end_coaching': {
          result = { success: true, message: 'Coaching session ending' }
          shouldEndCoaching = true
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
          result = {
            ...statusData,
            liveMetricsAvailable: state.liveMetrics?.available === true,
            liveMetrics: state.liveMetrics?.available ? state.liveMetrics : undefined,
          } as unknown as Record<string, unknown>
          break
        }
        case 'get_heart_rate': {
          const metricHr = state.liveMetrics?.heartRate ?? null
          const metricZone = state.liveMetrics?.heartRateZone ?? null
          result = {
            heartRate: state.heartRate ?? metricHr,
            zone: state.heartRateZone ?? metricZone,
            available: state.heartRate !== null || metricHr !== null,
          }
          break
        }
        case 'get_live_metrics': {
          result = state.liveMetrics?.available
            ? { success: true, ...state.liveMetrics }
            : {
                success: false,
                available: false,
                message: 'No live bike/erg metrics are available right now.',
              }
          break
        }
        case 'record_post_workout_debrief': {
          const debrief: LivePostWorkoutDebrief = {
            sessionRpe: typeof args?.sessionRpe === 'number'
              ? Math.max(1, Math.min(10, Math.round(args.sessionRpe)))
              : null,
            notes: typeof args?.notes === 'string' && args.notes.trim() ? args.notes.trim() : null,
            painMentioned: args?.painMentioned === true,
            painDetails: typeof args?.painDetails === 'string' && args.painDetails.trim() ? args.painDetails.trim() : null,
            mood: ['positive', 'neutral', 'struggling', 'frustrated'].includes(args?.mood)
              ? args.mood
              : null,
            capturedAt: new Date().toISOString(),
          }
          cbs.onRecordPostWorkoutDebrief?.(debrief)
          result = {
            success: true,
            message: 'Debrief captured. The athlete still needs to tap Finish to save.',
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
          const exerciseStatus = cbs.onGetExerciseStatus?.()
          result = exerciseStatus
            ? { success: true, ...exerciseStatus }
            : { success: false, message: 'Exercise status is not available in this view.' }
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

    if (shouldEndCoaching) {
      setTimeout(() => {
        disconnectRef.current?.()
        callbacksRef.current.onEndCoaching?.()
      }, 500)
    }
  }, [])

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return

    setStatus('connecting')
    setError(null)
    setAiAllowanceAction(null)
    transcriptsRef.current = []
    sessionIdRef.current = null
    startTimeRef.current = 0
    sessionReportedRef.current = false
    lastSentHRRef.current = null
    lastSentMetricsRef.current = null

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
              if (containsPainConcern(text)) {
                callbacksRef.current.onPainConcernDetected?.(text.trim())
              }
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
          if (!clientRef.current?.isConnected) return
          const video = new VideoCaptureManager()
          videoCaptureRef.current = video
          video.onFrame = (base64, mimeType) => {
            client.sendVideoFrame(base64, mimeType)
          }
          video.start()
            .then(() => {
              if (videoCaptureRef.current !== video || !clientRef.current?.isConnected) {
                video.stop()
              }
            })
            .catch(() => {
              if (videoCaptureRef.current === video) videoCaptureRef.current = null
            })
        }).catch(() => {})
      }
    } catch (err) {
      captureRef.current?.stop()
      playbackRef.current?.close()
      videoCaptureRef.current?.stop()
      clientRef.current?.close()
      captureRef.current = null
      playbackRef.current = null
      videoCaptureRef.current = null
      clientRef.current = null

      if (sessionIdRef.current) {
        const duration = startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0
        if (duration > 0 && !sessionReportedRef.current) {
          sessionReportedRef.current = true
          fetch('/api/athlete/live-voice-coaching/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              durationSeconds: Math.round(duration),
              audioInputSeconds: 0,
              audioOutputSeconds: 0,
              segmentsCompleted: stateRef.current.currentSegmentIndex,
              endReason: 'error',
            }),
          }).catch(() => {})
        }
      }

      if (isAiAllowanceExhaustedError(err)) {
        setAiAllowanceError(err)
      } else {
        setError(describeConnectError(err))
        setAiAllowanceAction(null)
      }
      setStatus('error')
    }
  }, [assignmentId, status, handleToolCall, enableCamera, setAiAllowanceError, workoutType])

  const disconnect = useCallback((endReason: 'completed' | 'user_cancelled' | 'error' | 'timeout' = 'user_cancelled') => {
    const sessionId = sessionIdRef.current
    const client = clientRef.current
    const capture = captureRef.current
    const playback = playbackRef.current
    const video = videoCaptureRef.current
    const duration = startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0
    const transcripts = [...transcriptsRef.current]

    // Stop audio
    capture?.stop()
    playback?.close()
    video?.stop()
    client?.close()

    captureRef.current = null
    playbackRef.current = null
    videoCaptureRef.current = null
    clientRef.current = null

    setIsListening(false)
    setIsSpeaking(false)
    setStatus('ended')
    setAiAllowanceAction(null)

    // Report session end with transcripts
    if (sessionId && duration > 0 && !sessionReportedRef.current) {
      sessionReportedRef.current = true
      const body = JSON.stringify({
        sessionId,
        durationSeconds: Math.round(duration),
        audioInputSeconds: client?.audioInputDuration ?? 0,
        audioOutputSeconds: client?.audioOutputDuration ?? 0,
        segmentsCompleted: stateRef.current.currentSegmentIndex,
        endReason,
        transcripts: transcripts.length > 0 ? transcripts : undefined,
        debrief: stateRef.current.postWorkoutDebrief ?? undefined,
        performanceSnapshot: stateRef.current.performanceSnapshot ?? undefined,
      })
      const sentByBeacon =
        typeof navigator !== 'undefined' &&
        typeof navigator.sendBeacon === 'function' &&
        document.visibilityState === 'hidden' &&
        navigator.sendBeacon(
          '/api/athlete/live-voice-coaching/end',
          new Blob([body], { type: 'application/json' }),
        )

      if (!sentByBeacon) {
        fetch('/api/athlete/live-voice-coaching/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body,
        }).catch(() => {})
      }
    }
  }, [])
  disconnectRef.current = disconnect

  const sendContextMessage = useCallback((message: string) => {
    if (!message.trim()) return
    if (status !== 'connected' || !clientRef.current?.isConnected) return
    clientRef.current.sendText(message)
  }, [status])

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

  // Page/tab close: use the same keepalive reporting path as manual disconnect.
  useEffect(() => {
    const handlePageHide = () => {
      if (clientRef.current?.isConnected) {
        disconnect()
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
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

  // Send compact live machine/erg updates. This is intentionally throttled so
  // the coach stays aware without turning every BLE sample into model context.
  useEffect(() => {
    if (status !== 'connected' || !clientRef.current?.isConnected) return
    if (!liveMetrics?.available) return

    const now = Date.now()
    const signature = buildLiveMetricsSignature(liveMetrics)
    const last = lastSentMetricsRef.current
    const segmentChanged = last?.segmentIndex !== (liveMetrics.segmentIndex ?? null)
    const stale = !last || now - last.at >= 30_000
    const throttleElapsed = !last || now - last.at >= 10_000

    if (!segmentChanged && !stale && (!throttleElapsed || last.signature === signature)) return

    lastSentMetricsRef.current = {
      at: now,
      signature,
      segmentIndex: liveMetrics.segmentIndex ?? null,
    }
    clientRef.current.sendText(buildLiveMetricsMessage(liveMetrics))
  }, [liveMetrics, status])

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
    sendContextMessage,
    toggleMute,
    supported,
  }
}

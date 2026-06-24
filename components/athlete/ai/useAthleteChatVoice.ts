'use client'

// All voice concerns for the athlete floating chat: spoken replies (premium +
// browser TTS), voice auto-send and operator mode, the OpenAI realtime voice
// session (WebRTC), and microphone input with transcription.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import {
  getVoiceFileExtension,
  getSpeakableAssistantText,
} from '@/components/ai-studio/voice-helpers'
import {
  addRealtimeUsageFromEvent,
  createRealtimeVoiceUsageAccumulator,
  hasRealtimeUsageTokens,
} from '@/lib/ai/realtime-voice-client'
import {
  buildRealtimeFunctionOutputEvents,
  claimRealtimeFunctionCall,
  extractRealtimeFunctionCalls,
  type RealtimeFunctionCall,
} from '@/lib/ai/realtime-function-calls'
import { useLocale, useTranslations } from '@/i18n/client'
import type { ChatActionResult } from '@/components/ai-studio/ChatActionCard'

const ATHLETE_VOICE_AUTO_SEND_KEY = 'athlete-floating-ai-voice-auto-send'
const ATHLETE_SPOKEN_REPLIES_KEY = 'athlete-floating-ai-spoken-replies'
const ATHLETE_VOICE_OPERATOR_KEY = 'athlete-floating-ai-voice-operator-mode'
const ATHLETE_VOICE_GUIDE_DISMISSED_KEY = 'athlete-floating-ai-voice-guide-dismissed'
const REALTIME_ACTION_DRAFT_TOOL_NAMES = new Set([
  'createCardioWorkout',
  'logCompletedWorkout',
  'completeAssignedWorkout',
  'updateLiveWorkoutFeedback',
  'logPlannedMeal',
  'regeneratePerformanceGuide',
])
const REALTIME_DIRECT_TOOL_NAMES = new Set([
  'openTodayWorkout',
  'getReadinessBriefing',
  'proposeWorkoutModification',
  'getQuickErgMatchSuggestions',
  'getFuelingBriefing',
  'fitFoodsToMeal',
])

export interface RealtimeNavigationResult {
  href: string
  label?: string
  autoNavigate?: boolean
}

interface UseAthleteChatVoiceOptions {
  addAssistantNotice: (content: string) => void
  /** Sends a chat message (used by voice auto-send). Read fresh on every call. */
  sendChatMessage: (message: string) => void | Promise<void>
  /** Current page-context string for the realtime session body. */
  getPageContext: () => string
  /** Composer value/setter so transcripts land in the input field. */
  input: string
  setInput: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onRealtimeActionDraft?: (result: ChatActionResult) => void
  onRealtimeNavigation?: (navigation: RealtimeNavigationResult) => void
}

export function useAthleteChatVoice(options: UseAthleteChatVoiceOptions) {
  const t = useTranslations('components.athleteFloatingChat')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const { toast } = useToast()

  // Volatile options (input value, send function) are read through a ref so
  // the callbacks below keep stable identities without going stale.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })
  const addAssistantNotice = useCallback((content: string) => {
    optionsRef.current.addAssistantNotice(content)
  }, [])

  const assistantSpeechVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const spokenAssistantMessageIdsRef = useRef<Set<string>>(new Set())
  const spokenAssistantNoticeIdsRef = useRef<Set<string>>(new Set())
  const voiceAutoSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null)
  const assistantAudioUrlRef = useRef<string | null>(null)
  const assistantSpeechAbortRef = useRef<AbortController | null>(null)
  const premiumVoiceUnavailableRef = useRef(false)
  const realtimePeerRef = useRef<RTCPeerConnection | null>(null)
  const realtimeDataChannelRef = useRef<RTCDataChannel | null>(null)
  const realtimeMediaStreamRef = useRef<MediaStream | null>(null)
  const realtimeAudioRef = useRef<HTMLAudioElement | null>(null)
  const realtimeStartedAtRef = useRef<number | null>(null)
  const realtimeUsageRef = useRef(createRealtimeVoiceUsageAccumulator())
  const realtimeUsageReportedRef = useRef(true)
  const processedRealtimeFunctionCallIdsRef = useRef<Set<string>>(new Set())
  const voiceRecordingPromiseRef = useRef<Promise<Blob> | null>(null)

  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false)
  const [isSpokenRepliesEnabled, setIsSpokenRepliesEnabled] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [isBrowserSpeechSupported, setIsBrowserSpeechSupported] = useState(false)
  const [isSpeakingAssistant, setIsSpeakingAssistant] = useState(false)
  const [isGeneratingAssistantAudio, setIsGeneratingAssistantAudio] = useState(false)
  const [voicePlaybackStatus, setVoicePlaybackStatus] = useState<string | null>(null)
  const [isVoiceAutoSendEnabled, setIsVoiceAutoSendEnabled] = useState(false)
  const [isVoiceAutoSendPending, setIsVoiceAutoSendPending] = useState(false)
  const [isVoiceOperatorModeEnabled, setIsVoiceOperatorModeEnabled] = useState(false)
  const [isRealtimeVoiceConnecting, setIsRealtimeVoiceConnecting] = useState(false)
  const [isRealtimeVoiceActive, setIsRealtimeVoiceActive] = useState(false)
  const [realtimeVoiceStatus, setRealtimeVoiceStatus] = useState<string | null>(null)
  const [showVoiceGuideCard, setShowVoiceGuideCard] = useState(false)

  const {
    isRecording: isVoiceRecording,
    duration: voiceDuration,
    startRecording,
    stopRecording,
    error: voiceRecorderError,
    isSupported: isVoiceSupported,
  } = useAudioRecorder()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const frame = window.requestAnimationFrame(() => {
      const savedVoiceOperatorMode = window.localStorage.getItem(ATHLETE_VOICE_OPERATOR_KEY) === 'true'
      const canPlayAssistantAudio = 'Audio' in window || 'speechSynthesis' in window
      setIsVoiceAutoSendEnabled(window.localStorage.getItem(ATHLETE_VOICE_AUTO_SEND_KEY) === 'true')
      setIsSpokenRepliesEnabled(window.localStorage.getItem(ATHLETE_SPOKEN_REPLIES_KEY) === 'true')
      setIsSpeechSupported(canPlayAssistantAudio)
      setIsVoiceOperatorModeEnabled(savedVoiceOperatorMode && canPlayAssistantAudio)
      setShowVoiceGuideCard(window.localStorage.getItem(ATHLETE_VOICE_GUIDE_DISMISSED_KEY) !== 'true')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    return () => {
      if (voiceAutoSendTimeoutRef.current) {
        clearTimeout(voiceAutoSendTimeoutRef.current)
      }
      assistantSpeechAbortRef.current?.abort()
      assistantAudioRef.current?.pause()
      if (assistantAudioUrlRef.current) {
        URL.revokeObjectURL(assistantAudioUrlRef.current)
      }
      realtimeDataChannelRef.current?.close()
      realtimePeerRef.current?.close()
      realtimeMediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      realtimeAudioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const frame = window.requestAnimationFrame(() => {
      setIsBrowserSpeechSupported(true)
      setIsSpokenRepliesEnabled(window.localStorage.getItem(ATHLETE_SPOKEN_REPLIES_KEY) === 'true')
    })

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferredLanguage = locale === 'sv' ? 'sv' : 'en'
      const fallbackLanguage = locale === 'sv' ? 'en' : 'sv'
      const preferredNamePattern = locale === 'sv' ? /alva|klara|oskar/i : /samantha|daniel|alex/i
      const fallbackNamePattern = locale === 'sv' ? /samantha|daniel|alex/i : /alva|klara|oskar/i
      const preferredVoice =
        voices.find((voice) => voice.lang.toLowerCase().startsWith(preferredLanguage) && preferredNamePattern.test(voice.name)) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith(preferredLanguage)) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith(fallbackLanguage) && fallbackNamePattern.test(voice.name)) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith(fallbackLanguage)) ||
        voices[0] ||
        null

      assistantSpeechVoiceRef.current = preferredVoice
    }

    pickVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
    return () => {
      window.cancelAnimationFrame(frame)
      window.speechSynthesis.removeEventListener('voiceschanged', pickVoice)
      window.speechSynthesis.cancel()
    }
  }, [locale])

  const stopAssistantSpeech = useCallback(() => {
    assistantSpeechAbortRef.current?.abort()
    assistantSpeechAbortRef.current = null

    if (assistantAudioRef.current) {
      assistantAudioRef.current.pause()
      assistantAudioRef.current.src = ''
      assistantAudioRef.current = null
    }
    if (assistantAudioUrlRef.current) {
      URL.revokeObjectURL(assistantAudioUrlRef.current)
      assistantAudioUrlRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeakingAssistant(false)
    setIsGeneratingAssistantAudio(false)
    setVoicePlaybackStatus(null)
  }, [])

  const reportRealtimeVoiceUsage = useCallback((endReason: 'user_stopped' | 'disconnected' | 'error' | 'close' | 'new_chat') => {
    const startedAt = realtimeStartedAtRef.current
    if (!startedAt || realtimeUsageReportedRef.current) return

    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    const usage = realtimeUsageRef.current
    const tokenPayload = hasRealtimeUsageTokens(usage) ? usage : {}

    realtimeUsageReportedRef.current = true
    realtimeStartedAtRef.current = null
    realtimeUsageRef.current = createRealtimeVoiceUsageAccumulator()

    void fetch('/api/ai/chat/realtime-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        durationSeconds,
        audioInputSeconds: Math.ceil(durationSeconds * 0.5),
        audioOutputSeconds: Math.ceil(durationSeconds * 0.2),
        isAthleteChat: true,
        endReason,
        ...tokenPayload,
      }),
    }).catch(() => {
      // Usage logging is best-effort on the client; the server still guards session start.
    })
  }, [])

  const stopRealtimeVoice = useCallback((
    statusMessage?: string,
    endReason: 'user_stopped' | 'disconnected' | 'error' | 'close' | 'new_chat' = 'user_stopped'
  ) => {
    reportRealtimeVoiceUsage(endReason)

    const dataChannel = realtimeDataChannelRef.current
    realtimeDataChannelRef.current = null
    dataChannel?.close()
    processedRealtimeFunctionCallIdsRef.current.clear()

    const peer = realtimePeerRef.current
    realtimePeerRef.current = null
    peer?.close()

    const mediaStream = realtimeMediaStreamRef.current
    realtimeMediaStreamRef.current = null
    mediaStream?.getTracks().forEach((track) => track.stop())

    if (realtimeAudioRef.current) {
      realtimeAudioRef.current.pause()
      realtimeAudioRef.current.srcObject = null
      realtimeAudioRef.current = null
    }
    setIsRealtimeVoiceConnecting(false)
    setIsRealtimeVoiceActive(false)
    setRealtimeVoiceStatus(statusMessage ?? null)
  }, [reportRealtimeVoiceUsage])

  useEffect(() => {
    return () => reportRealtimeVoiceUsage('close')
  }, [reportRealtimeVoiceUsage])

  const speakBrowserAssistantReply = useCallback((text: string): boolean => {
    if (!isBrowserSpeechSupported) return false
    if (typeof window === 'undefined' || !window.speechSynthesis) return false
    const speakableText = getSpeakableAssistantText(text)
    if (!speakableText) return false

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(speakableText)
    const voice = assistantSpeechVoiceRef.current
    utterance.lang = voice?.lang || (locale === 'sv' ? 'sv-SE' : 'en-US')
    utterance.voice = voice
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => {
      setIsSpeakingAssistant(true)
      setVoicePlaybackStatus(t('voice.status.browserVoice'))
    }
    utterance.onend = () => {
      setIsSpeakingAssistant(false)
      setVoicePlaybackStatus(null)
    }
    utterance.onerror = () => {
      setIsSpeakingAssistant(false)
      setVoicePlaybackStatus(null)
    }
    window.speechSynthesis.speak(utterance)
    return true
  }, [isBrowserSpeechSupported, locale, t])

  const playPremiumAssistantReply = useCallback(async (text: string): Promise<boolean> => {
    if (premiumVoiceUnavailableRef.current) return false
    if (typeof window === 'undefined' || !('Audio' in window)) return false

    const speakableText = getSpeakableAssistantText(text).slice(0, 4096)
    if (!speakableText) return false

    stopAssistantSpeech()
    const controller = new AbortController()
    assistantSpeechAbortRef.current = controller
    setIsGeneratingAssistantAudio(true)
    setVoicePlaybackStatus(t('voice.status.creatingAiVoice'))

    try {
      const response = await fetch('/api/ai/chat/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: speakableText,
          isAthleteChat: true,
        }),
      })

      if (!response.ok) {
        if ([400, 401, 403].includes(response.status)) {
          premiumVoiceUnavailableRef.current = true
        }
        return false
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      assistantAudioRef.current = audio
      assistantAudioUrlRef.current = audioUrl
      audio.onplay = () => {
        setIsGeneratingAssistantAudio(false)
        setIsSpeakingAssistant(true)
        setVoicePlaybackStatus(t('voice.status.playingAiVoice'))
      }
      audio.onended = () => {
        setIsSpeakingAssistant(false)
        setVoicePlaybackStatus(null)
        URL.revokeObjectURL(audioUrl)
        if (assistantAudioUrlRef.current === audioUrl) assistantAudioUrlRef.current = null
        if (assistantAudioRef.current === audio) assistantAudioRef.current = null
      }
      audio.onerror = () => {
        setIsSpeakingAssistant(false)
        setVoicePlaybackStatus(null)
        URL.revokeObjectURL(audioUrl)
        if (assistantAudioUrlRef.current === audioUrl) assistantAudioUrlRef.current = null
        if (assistantAudioRef.current === audio) assistantAudioRef.current = null
      }
      await audio.play()
      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return true
      return false
    } finally {
      if (assistantSpeechAbortRef.current === controller) {
        assistantSpeechAbortRef.current = null
      }
      setIsGeneratingAssistantAudio(false)
    }
  }, [stopAssistantSpeech, t])

  const speakAssistantReply = useCallback(async (text: string) => {
    if (!isSpokenRepliesEnabled || !isSpeechSupported) return

    const usedPremiumVoice = await playPremiumAssistantReply(text)
    if (usedPremiumVoice) return

    const usedBrowserVoice = speakBrowserAssistantReply(text)
    if (usedBrowserVoice) {
      setVoicePlaybackStatus(premiumVoiceUnavailableRef.current ? t('voice.status.browserVoice') : null)
      return
    }

    setVoicePlaybackStatus(t('voice.status.playbackUnavailable'))
  }, [
    isSpeechSupported,
    isSpokenRepliesEnabled,
    playPremiumAssistantReply,
    speakBrowserAssistantReply,
    t,
  ])

  /** Speaks an assistant message at most once per message id. */
  const speakAssistantMessageOnce = useCallback((messageId: string, text: string): boolean => {
    if (spokenAssistantMessageIdsRef.current.has(messageId)) return false
    spokenAssistantMessageIdsRef.current.add(messageId)
    void speakAssistantReply(text)
    return true
  }, [speakAssistantReply])

  /** Speaks an assistant notice at most once per notice id. */
  const speakAssistantNoticeOnce = useCallback((noticeId: string, text: string): boolean => {
    if (spokenAssistantNoticeIdsRef.current.has(noticeId)) return false
    spokenAssistantNoticeIdsRef.current.add(noticeId)
    void speakAssistantReply(text)
    return true
  }, [speakAssistantReply])

  /** Forgets which messages/notices were already spoken (new chat / close). */
  const resetSpokenTracking = useCallback(() => {
    spokenAssistantMessageIdsRef.current.clear()
    spokenAssistantNoticeIdsRef.current.clear()
  }, [])

  const toggleSpokenReplies = useCallback(() => {
    if (!isSpeechSupported) {
      const message = t('voice.unsupported.message')
      addAssistantNotice(message)
      toast({
        title: t('voice.unsupported.title'),
        description: t('voice.unsupported.description'),
        variant: 'destructive',
      })
      return
    }

    setIsSpokenRepliesEnabled((current) => {
      const next = !current
      window.localStorage.setItem(ATHLETE_SPOKEN_REPLIES_KEY, String(next))
      if (!next) {
        stopAssistantSpeech()
        setIsVoiceOperatorModeEnabled(false)
        window.localStorage.setItem(ATHLETE_VOICE_OPERATOR_KEY, 'false')
      }
      return next
    })
  }, [addAssistantNotice, isSpeechSupported, stopAssistantSpeech, t, toast])

  const cancelVoiceAutoSend = useCallback(() => {
    if (voiceAutoSendTimeoutRef.current) {
      clearTimeout(voiceAutoSendTimeoutRef.current)
      voiceAutoSendTimeoutRef.current = null
    }
    setIsVoiceAutoSendPending(false)
  }, [])

  const dismissVoiceGuideCard = useCallback(() => {
    setShowVoiceGuideCard(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ATHLETE_VOICE_GUIDE_DISMISSED_KEY, 'true')
    }
  }, [])

  const toggleVoiceAutoSend = useCallback(() => {
    setIsVoiceAutoSendEnabled((current) => {
      const next = !current
      window.localStorage.setItem(ATHLETE_VOICE_AUTO_SEND_KEY, String(next))
      if (!next) {
        cancelVoiceAutoSend()
        setIsVoiceOperatorModeEnabled(false)
        window.localStorage.setItem(ATHLETE_VOICE_OPERATOR_KEY, 'false')
      }
      return next
    })
  }, [cancelVoiceAutoSend])

  const toggleVoiceOperatorMode = useCallback(() => {
    if (!isVoiceOperatorModeEnabled && !isSpeechSupported) {
      const message = t('voice.operatorUnsupported.message')
      addAssistantNotice(message)
      toast({
        title: t('voice.operatorUnsupported.title'),
        description: t('voice.unsupported.description'),
        variant: 'destructive',
      })
      return
    }

    const next = !isVoiceOperatorModeEnabled
    setIsVoiceOperatorModeEnabled(next)
    window.localStorage.setItem(ATHLETE_VOICE_OPERATOR_KEY, String(next))

    if (next) {
      setIsSpokenRepliesEnabled(true)
      setIsVoiceAutoSendEnabled(true)
      window.localStorage.setItem(ATHLETE_SPOKEN_REPLIES_KEY, 'true')
      window.localStorage.setItem(ATHLETE_VOICE_AUTO_SEND_KEY, 'true')
      addAssistantNotice(t('voice.operatorEnabled.notice'))
      toast({
        title: t('voice.operatorEnabled.title'),
        description: t('voice.operatorEnabled.description'),
      })
    } else {
      cancelVoiceAutoSend()
      addAssistantNotice(t('voice.operatorDisabled.notice'))
      toast({
        title: t('voice.operatorDisabled.title'),
        description: t('voice.operatorDisabled.description'),
      })
    }
  }, [
    addAssistantNotice,
    cancelVoiceAutoSend,
    isSpeechSupported,
    isVoiceOperatorModeEnabled,
    t,
    toast,
  ])

  const startVoiceOperatorFromGuide = useCallback(() => {
    dismissVoiceGuideCard()
    if (!isVoiceOperatorModeEnabled) {
      toggleVoiceOperatorMode()
    }
  }, [dismissVoiceGuideCard, isVoiceOperatorModeEnabled, toggleVoiceOperatorMode])

  const sendRealtimeFunctionOutput = useCallback((callId: string, output: unknown): boolean => {
    const dataChannel = realtimeDataChannelRef.current
    if (!dataChannel || dataChannel.readyState !== 'open') return false

    for (const event of buildRealtimeFunctionOutputEvents(callId, output)) {
      dataChannel.send(JSON.stringify(event))
    }
    return true
  }, [])

  const handleRealtimeFunctionCall = useCallback(async (call: RealtimeFunctionCall) => {
    if (!claimRealtimeFunctionCall(processedRealtimeFunctionCallIdsRef.current, call.callId)) return

    const isActionDraftTool = REALTIME_ACTION_DRAFT_TOOL_NAMES.has(call.name)
    const isDirectTool = REALTIME_DIRECT_TOOL_NAMES.has(call.name)
    if (!isActionDraftTool && !isDirectTool) {
      const output = {
        success: false,
        error: locale === 'sv'
          ? 'Den här live voice-åtgärden stöds inte ännu.'
          : 'This live voice action is not supported yet.',
      }
      sendRealtimeFunctionOutput(call.callId, output)
      return
    }

    try {
      setRealtimeVoiceStatus(isActionDraftTool
        ? (locale === 'sv' ? 'Förbereder bekräftelsekort...' : 'Preparing confirmation card...')
        : (locale === 'sv' ? 'Hämtar i appen...' : 'Checking the app...'))

      const response = await fetch(isActionDraftTool ? '/api/ai/chat/realtime-action-drafts' : '/api/ai/chat/realtime-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: call.name,
          arguments: call.arguments,
          callId: call.callId,
        }),
      })
      const payload = await response.json().catch(() => ({})) as ChatActionResult & {
        message?: string
        navigation?: RealtimeNavigationResult
        needsClarification?: boolean
        error?: string
      }

      if (payload.success && payload.action?.type === 'aiCapabilityAction') {
        optionsRef.current.onRealtimeActionDraft?.(payload)
        setRealtimeVoiceStatus(locale === 'sv' ? 'Bekräftelsekort klart.' : 'Confirmation card ready.')
      } else if (payload.success && payload.navigation?.href) {
        optionsRef.current.onRealtimeNavigation?.(payload.navigation)
        setRealtimeVoiceStatus(payload.message || (locale === 'sv' ? 'Öppnar vy...' : 'Opening view...'))
      } else if (payload.success && payload.message) {
        addAssistantNotice(payload.message)
        setRealtimeVoiceStatus(payload.message)
      } else if (!payload.needsClarification) {
        const message = payload.error || (locale === 'sv'
          ? 'Kunde inte förbereda live voice-åtgärden.'
          : 'Could not prepare the live voice action.')
        addAssistantNotice(message)
        setRealtimeVoiceStatus(message)
      }

      sendRealtimeFunctionOutput(call.callId, payload)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (locale === 'sv' ? 'Kunde inte förbereda live voice-åtgärden.' : 'Could not prepare the live voice action.')
      const output = { success: false, error: message }
      addAssistantNotice(message)
      setRealtimeVoiceStatus(message)
      sendRealtimeFunctionOutput(call.callId, output)
    }
  }, [addAssistantNotice, locale, sendRealtimeFunctionOutput])

  const startRealtimeVoice = useCallback(async () => {
    if (isRealtimeVoiceConnecting || isRealtimeVoiceActive) return
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      const message = t('realtime.unsupported.message')
      addAssistantNotice(message)
      toast({
        title: t('realtime.unsupported.title'),
        description: t('voice.unsupported.description'),
        variant: 'destructive',
      })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = t('realtime.microphoneMissing.message')
      addAssistantNotice(message)
      toast({
        title: t('realtime.microphoneMissing.title'),
        description: t('realtime.microphoneMissing.description'),
        variant: 'destructive',
      })
      return
    }

    stopAssistantSpeech()
    cancelVoiceAutoSend()
    setIsRealtimeVoiceConnecting(true)
    setRealtimeVoiceStatus(t('realtime.starting'))

    let peer: RTCPeerConnection | null = null
    let mediaStream: MediaStream | null = null
    try {
      peer = new RTCPeerConnection()
      realtimePeerRef.current = peer

      const remoteAudio = new Audio()
      remoteAudio.autoplay = true
      realtimeAudioRef.current = remoteAudio
      peer.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0]
      }
      peer.onconnectionstatechange = () => {
        if (!peer) return
        if (realtimePeerRef.current !== peer) return
        if (peer.connectionState === 'connected') {
          if (!realtimeStartedAtRef.current) {
            realtimeStartedAtRef.current = Date.now()
            realtimeUsageReportedRef.current = false
            realtimeUsageRef.current = createRealtimeVoiceUsageAccumulator()
          }
          setIsRealtimeVoiceConnecting(false)
          setIsRealtimeVoiceActive(true)
          setRealtimeVoiceStatus(t('realtime.activeConfirmation'))
        }
        if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
          stopRealtimeVoice(t('realtime.disconnected'), 'disconnected')
        }
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      realtimeMediaStreamRef.current = mediaStream
      for (const track of mediaStream.getAudioTracks()) {
        peer.addTrack(track, mediaStream)
      }

      const dataChannel = peer.createDataChannel('oai-events')
      realtimeDataChannelRef.current = dataChannel
      dataChannel.onopen = () => {
        setRealtimeVoiceStatus(t('realtime.listening'))
      }
      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; error?: { message?: string } }
          addRealtimeUsageFromEvent(realtimeUsageRef.current, data)
          const functionCalls = extractRealtimeFunctionCalls(data)
          for (const call of functionCalls) {
            void handleRealtimeFunctionCall(call)
          }
          if (data.type === 'error') {
            const message = data.error?.message || t('realtime.unknownError')
            setRealtimeVoiceStatus(message)
            addAssistantNotice(t('realtime.continueFailed', { message }))
          } else if (data.type === 'response.audio_transcript.done') {
            setRealtimeVoiceStatus(t('realtime.responded'))
          } else if (data.type === 'input_audio_buffer.speech_started') {
            setRealtimeVoiceStatus(t('realtime.listeningInProgress'))
          } else if (data.type === 'input_audio_buffer.speech_stopped') {
            setRealtimeVoiceStatus(t('realtime.processing'))
          }
        } catch {
          // Ignore non-JSON realtime diagnostics.
        }
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      if (!offer.sdp) {
        throw new Error(t('realtime.offerFailed'))
      }

      const response = await fetch('/api/ai/chat/realtime-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: offer.sdp,
          isAthleteChat: true,
          pageContext: optionsRef.current.getPageContext(),
          mode: 'athlete_support',
        }),
      })
      const answerSdp = await response.text()
      if (!response.ok) {
        let message = t('realtime.openAiStartFailed')
        try {
          const parsed = JSON.parse(answerSdp) as { error?: string }
          message = parsed.error || message
        } catch {
          if (answerSdp.trim()) message = answerSdp.trim()
        }
        throw new Error(message)
      }

      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      setRealtimeVoiceStatus(t('realtime.connecting'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('realtime.startFailed')
      stopRealtimeVoice(message, 'error')
      addAssistantNotice(t('realtime.startFailedNotice', { message }))
      toast({
        title: t('realtime.startFailedTitle'),
        description: message,
        variant: 'destructive',
      })
    }
  }, [
    addAssistantNotice,
    cancelVoiceAutoSend,
    isRealtimeVoiceActive,
    isRealtimeVoiceConnecting,
    stopAssistantSpeech,
    stopRealtimeVoice,
    handleRealtimeFunctionCall,
    t,
    toast,
  ])

  const toggleRealtimeVoice = useCallback(() => {
    if (isRealtimeVoiceActive || isRealtimeVoiceConnecting) {
      stopRealtimeVoice(t('realtime.stopped'), 'user_stopped')
      return
    }
    void startRealtimeVoice()
  }, [
    isRealtimeVoiceActive,
    isRealtimeVoiceConnecting,
    startRealtimeVoice,
    stopRealtimeVoice,
    t,
  ])

  const scheduleVoiceAutoSend = useCallback((message: string) => {
    cancelVoiceAutoSend()
    setIsVoiceAutoSendPending(true)
    voiceAutoSendTimeoutRef.current = setTimeout(() => {
      voiceAutoSendTimeoutRef.current = null
      setIsVoiceAutoSendPending(false)
      void optionsRef.current.sendChatMessage(message)
    }, 2000)
  }, [cancelVoiceAutoSend])

  const transcribeVoiceBlob = useCallback(async (audioBlob: Blob): Promise<string> => {
    setIsTranscribingVoice(true)
    try {
      const formData = new FormData()
      const extension = getVoiceFileExtension(audioBlob.type)
      formData.append('audio', audioBlob, `athlete-floating-chat-voice.${extension}`)
      formData.append('isAthleteChat', 'true')

      const response = await fetch('/api/ai/chat/transcribe-audio', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('voice.transcriptionFailed'))
      }

      const text = typeof data.text === 'string' ? data.text.trim() : ''
      if (!text) {
        throw new Error(t('voice.noClearAudio'))
      }
      return text
    } finally {
      setIsTranscribingVoice(false)
    }
  }, [t])

  const handleVoiceButtonClick = useCallback(async () => {
    if (isVoiceRecording) {
      stopRecording()
      return
    }

    if (isTranscribingVoice || voiceRecordingPromiseRef.current) return
    cancelVoiceAutoSend()

    if (!isVoiceSupported) {
      const message = t('voice.inputUnsupported.message')
      addAssistantNotice(message)
      toast({
        title: t('voice.inputUnsupported.title'),
        description: t('voice.unsupported.description'),
        variant: 'destructive',
      })
      return
    }

    let recordingPromise: Promise<Blob> | null = null
    try {
      recordingPromise = startRecording()
      voiceRecordingPromiseRef.current = recordingPromise
      const audioBlob = await recordingPromise
      if (voiceRecordingPromiseRef.current !== recordingPromise) return
      voiceRecordingPromiseRef.current = null

      if (audioBlob.size === 0) {
        throw new Error(t('voice.noAudioData'))
      }

      const transcript = await transcribeVoiceBlob(audioBlob)
      const trimmedInput = optionsRef.current.input.trim()
      const nextInputValue = trimmedInput ? `${trimmedInput}\n${transcript}` : transcript
      optionsRef.current.setInput(nextInputValue)
      optionsRef.current.textareaRef.current?.focus()
      if (isVoiceAutoSendEnabled) {
        scheduleVoiceAutoSend(nextInputValue)
        toast({
          title: t('voice.transcribed.title'),
          description: t('voice.transcribed.autoSendDescription'),
        })
      } else {
        toast({
          title: t('voice.transcribed.title'),
          description: t('voice.transcribed.manualDescription'),
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('voice.handleFailed')
      addAssistantNotice(t('voice.handleFailedNotice', { message }))
      toast({
        title: t('voice.handleFailedTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      if (voiceRecordingPromiseRef.current === recordingPromise) {
        voiceRecordingPromiseRef.current = null
      }
    }
  }, [
    addAssistantNotice,
    cancelVoiceAutoSend,
    isTranscribingVoice,
    isVoiceAutoSendEnabled,
    isVoiceRecording,
    isVoiceSupported,
    scheduleVoiceAutoSend,
    startRecording,
    stopRecording,
    t,
    toast,
    transcribeVoiceBlob,
  ])

  return {
    // Microphone input
    isVoiceRecording,
    voiceDuration,
    voiceRecorderError,
    isTranscribingVoice,
    handleVoiceButtonClick,
    // Spoken replies (TTS)
    isSpokenRepliesEnabled,
    isSpeakingAssistant,
    isGeneratingAssistantAudio,
    voicePlaybackStatus,
    stopAssistantSpeech,
    toggleSpokenReplies,
    speakAssistantMessageOnce,
    speakAssistantNoticeOnce,
    resetSpokenTracking,
    // Auto-send / operator mode / guide card
    isVoiceAutoSendEnabled,
    isVoiceAutoSendPending,
    isVoiceOperatorModeEnabled,
    showVoiceGuideCard,
    cancelVoiceAutoSend,
    toggleVoiceAutoSend,
    toggleVoiceOperatorMode,
    dismissVoiceGuideCard,
    startVoiceOperatorFromGuide,
    // Realtime voice session
    isRealtimeVoiceConnecting,
    isRealtimeVoiceActive,
    realtimeVoiceStatus,
    stopRealtimeVoice,
    toggleRealtimeVoice,
  }
}

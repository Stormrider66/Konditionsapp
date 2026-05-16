'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Bot,
  Send,
  Loader2,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  MessageSquare,
  Lock,
  BookOpen,
  Save,
  ShieldCheck,
  Check,
  ChevronDown,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Zap,
  Headphones,
  Radio,
  PhoneOff,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ChatMessage } from '@/components/ai-studio/ChatMessage'
import { cn } from '@/lib/utils'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { getInfoEntriesByKeys } from '@/lib/info-content'
import { ATHLETE_QUICK_PROMPTS, MemoryContext } from '@/lib/ai/athlete-prompts'
import {
  MENTAL_PREP_CHAT_EVENT,
  buildMentalPrepMessage,
  buildMentalPrepPageContext,
  type MentalPrepChatEvent,
} from '@/lib/events/mental-prep-chat'
import { parseAIProgram, type ParseResult } from '@/lib/ai/program-parser'
import { MemoryIndicator } from './MemoryIndicator'
import { ChatWorkoutCard } from './ChatWorkoutCard'
import { ChatProgramProgressCard } from './ChatProgramProgressCard'
import { ChatProgramPreviewCard } from './ChatProgramPreviewCard'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import type { MergedProgram } from '@/lib/ai/program-generator'
import { AIChatUsageMeter, AIChatUsageCompact } from '@/components/athlete/AIChatUsageMeter'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Link from 'next/link'
import { useFloatingChatDrag } from '@/components/ai-studio/useFloatingChatDrag'
import {
  getAiAllowanceUpgradeMessage,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'
import { AiAllowanceBlockedAction } from '@/components/athlete/ai/AiAllowanceBlockedAction'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { VoiceModesGuide } from '@/components/ai-studio/VoiceModesGuide'
import {
  addRealtimeUsageFromEvent,
  createRealtimeVoiceUsageAccumulator,
  hasRealtimeUsageTokens,
} from '@/lib/ai/realtime-voice-client'

interface AthleteFloatingChatProps {
  clientId: string
  athleteName?: string
}

import type { ModelIntent } from '@/types/ai-models'
import { INTENT_TIER_LABELS } from '@/types/ai-models'

interface IntentTierOption {
  intent: ModelIntent
  label: string
  description: string
  icon: string
}

const ATHLETE_VOICE_AUTO_SEND_KEY = 'athlete-floating-ai-voice-auto-send'
const ATHLETE_SPOKEN_REPLIES_KEY = 'athlete-floating-ai-spoken-replies'
const ATHLETE_VOICE_OPERATOR_KEY = 'athlete-floating-ai-voice-operator-mode'
const ATHLETE_VOICE_GUIDE_DISMISSED_KEY = 'athlete-floating-ai-voice-guide-dismissed'

function getVoiceFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  return 'webm'
}

function formatVoiceDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getMessageTextContent(parts?: unknown[]): string {
  return parts
    ?.filter((part): part is { type: 'text'; text: string } => {
      return typeof part === 'object' && part !== null && (part as { type?: unknown }).type === 'text'
    })
    .map((part) => part.text)
    .join('') || ''
}

function getSpeakableAssistantText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function AthleteFloatingChat({
  clientId,
  athleteName,
}: AthleteFloatingChatProps) {
  const { toast } = useToast()
  const basePath = useBasePath()
  const {
    buttonFloatingStyle,
    panelFloatingStyle,
    handleButtonDragStart,
    handlePanelDragStart,
    handleActivatorClick,
  } = useFloatingChatDrag()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pageCtx = usePageContextOptional()
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

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [hasAIAccess, setHasAIAccess] = useState<boolean | null>(null)
  const [selectedIntent, setSelectedIntent] = useState<ModelIntent>('balanced')
  const [availableIntents, setAvailableIntents] = useState<IntentTierOption[]>([])
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [configReady, setConfigReady] = useState(false)
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    aiChatEnabled: boolean
    used: number
    limit: number
  } | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<{
    code: string
    message: string
    upgradeUrl?: string
    actionLabel?: string
  } | null>(null)

  // GDPR consent state
  const [consentStatus, setConsentStatus] = useState<'loading' | 'granted' | 'required'>('loading')
  const [consentDataProcessing, setConsentDataProcessing] = useState(false)
  const [consentHealthData, setConsentHealthData] = useState(false)
  const [isGrantingConsent, setIsGrantingConsent] = useState(false)

  // Program detection state (text-based, for coach-generated programs in chat)
  const [detectedProgram, setDetectedProgram] = useState<ParseResult | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  // Tool-based program generation state (orchestrator programs)
  const [completedPrograms, setCompletedPrograms] = useState<Map<string, MergedProgram>>(new Map())
  const [assistantNotices, setAssistantNotices] = useState<Array<{
    id: string
    content: string
    createdAt: Date
  }>>([])
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
  const voiceRecordingPromiseRef = useRef<Promise<Blob> | null>(null)
  const addAssistantNotice = useCallback((content: string) => {
    setAssistantNotices((current) => [
      ...current,
      {
        id: `athlete-assistant-notice-${Date.now()}-${current.length}`,
        content,
        createdAt: new Date(),
      },
    ].slice(-3))
  }, [])
  const {
    isRecording: isVoiceRecording,
    duration: voiceDuration,
    startRecording,
    stopRecording,
    error: voiceRecorderError,
    isSupported: isVoiceSupported,
  } = useAudioRecorder()

  // Mental prep context (set when opened from MentalPrepCard)
  const [mentalPrepContext, setMentalPrepContext] = useState<MentalPrepChatEvent | null>(null)
  const mentalPrepContextRef = useRef<MentalPrepChatEvent | null>(null)

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
      const preferredVoice =
        voices.find((voice) => voice.lang.toLowerCase().startsWith('sv') && /alva|klara|oskar/i.test(voice.name)) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith('sv')) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith('en') && /samantha|daniel/i.test(voice.name)) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
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
  }, [])

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
    utterance.lang = voice?.lang || 'sv-SE'
    utterance.voice = voice
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => {
      setIsSpeakingAssistant(true)
      setVoicePlaybackStatus('Använder webbläsarens röst.')
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
  }, [isBrowserSpeechSupported])

  const playPremiumAssistantReply = useCallback(async (text: string): Promise<boolean> => {
    if (premiumVoiceUnavailableRef.current) return false
    if (typeof window === 'undefined' || !('Audio' in window)) return false

    const speakableText = getSpeakableAssistantText(text).slice(0, 4096)
    if (!speakableText) return false

    stopAssistantSpeech()
    const controller = new AbortController()
    assistantSpeechAbortRef.current = controller
    setIsGeneratingAssistantAudio(true)
    setVoicePlaybackStatus('Skapar AI-röst...')

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
        setVoicePlaybackStatus('Spelar AI-röst...')
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
  }, [stopAssistantSpeech])

  const speakAssistantReply = useCallback(async (text: string) => {
    if (!isSpokenRepliesEnabled || !isSpeechSupported) return

    const usedPremiumVoice = await playPremiumAssistantReply(text)
    if (usedPremiumVoice) return

    const usedBrowserVoice = speakBrowserAssistantReply(text)
    if (usedBrowserVoice) {
      setVoicePlaybackStatus(premiumVoiceUnavailableRef.current ? 'Använder webbläsarens röst.' : null)
      return
    }

    setVoicePlaybackStatus('Röstsvar kunde inte spelas i den här webbläsaren.')
  }, [
    isSpeechSupported,
    isSpokenRepliesEnabled,
    playPremiumAssistantReply,
    speakBrowserAssistantReply,
  ])

  const toggleSpokenReplies = useCallback(() => {
    if (!isSpeechSupported) {
      const message = 'Röstsvar stöds inte i den här webbläsaren.'
      addAssistantNotice(message)
      toast({
        title: 'Röstsvar stöds inte',
        description: 'Testa en modern version av Safari, Chrome eller Edge.',
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
  }, [addAssistantNotice, isSpeechSupported, stopAssistantSpeech, toast])

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
      const message = 'Voice operator-läget behöver röstsvar, men den här webbläsaren stödjer inte uppläsning.'
      addAssistantNotice(message)
      toast({
        title: 'Voice operator kan inte startas',
        description: 'Testa en modern version av Safari, Chrome eller Edge.',
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
      addAssistantNotice('Voice operator-läget är aktivt. Jag lyssnar via mikrofonen, skickar efter en kort paus och säger mina svar högt. Åtgärder som skapar eller ändrar något kräver fortfarande bekräftelse.')
      toast({
        title: 'Voice operator aktiv',
        description: 'Röstsvar och automatisk röstsändning är på.',
      })
    } else {
      cancelVoiceAutoSend()
      addAssistantNotice('Voice operator-läget är avstängt. Du kan fortfarande använda mikrofonen manuellt.')
      toast({
        title: 'Voice operator avstängd',
        description: 'Röstinställningarna kan fortfarande styras separat.',
      })
    }
  }, [
    addAssistantNotice,
    cancelVoiceAutoSend,
    isSpeechSupported,
    isVoiceOperatorModeEnabled,
    toast,
  ])

  const startVoiceOperatorFromGuide = useCallback(() => {
    dismissVoiceGuideCard()
    if (!isVoiceOperatorModeEnabled) {
      toggleVoiceOperatorMode()
    }
  }, [dismissVoiceGuideCard, isVoiceOperatorModeEnabled, toggleVoiceOperatorMode])

  // Fetch AI config from coach
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/athlete/ai-config')
        const data = await response.json()

        if (data.success && data.hasAIAccess) {
          setSelectedIntent(data.intent || 'balanced')
          setAvailableIntents(data.availableIntents || [])
          setHasAIAccess(true)
          setConfigReady(true)
        } else {
          setHasAIAccess(false)
        }
      } catch (error) {
        console.error('Failed to fetch AI config:', error)
        setHasAIAccess(false)
      } finally {
        setIsLoadingConfig(false)
      }
    }

    void fetchConfig()
  }, [])

  // Fetch subscription status
  useEffect(() => {
    async function fetchSubscriptionStatus() {
      try {
        const response = await fetch('/api/athlete/subscription-status')
        const data = await response.json()
        if (data.success && data.data) {
          setSubscriptionStatus({
            aiChatEnabled: data.data.features?.aiChat?.enabled ?? false,
            used: data.data.features?.aiChat?.used ?? 0,
            limit: data.data.features?.aiChat?.limit ?? 0,
          })
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error)
      }
    }
    void fetchSubscriptionStatus()
  }, [])

  // Check GDPR consent status when chat opens
  useEffect(() => {
    if (!isOpen) return
    async function checkConsent() {
      try {
        const response = await fetch('/api/agent/consent')
        const data = await response.json()
        if (data.hasRequiredConsent) {
          setConsentStatus('granted')
        } else {
          setConsentStatus('required')
        }
      } catch {
        // If we can't check consent, require it to be safe
        setConsentStatus('required')
      }
    }
    void checkConsent()
  }, [isOpen])

  // Listen for mental prep chat events from MentalPrepCard
  useEffect(() => {
    function handleMentalPrepEvent(e: Event) {
      const event = e as CustomEvent<MentalPrepChatEvent>
      const detail = event.detail
      setMentalPrepContext(detail)
      mentalPrepContextRef.current = detail
      setIsOpen(true)
    }

    window.addEventListener(MENTAL_PREP_CHAT_EVENT, handleMentalPrepEvent)
    return () => {
      window.removeEventListener(MENTAL_PREP_CHAT_EVENT, handleMentalPrepEvent)
    }
  }, [])

  async function handleGrantConsent() {
    setIsGrantingConsent(true)
    try {
      const response = await fetch('/api/agent/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataProcessingConsent: true,
          healthDataProcessingConsent: true,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setConsentStatus('granted')
      } else {
        toast({
          title: 'Kunde inte spara samtycke',
          description: 'Försök igen senare.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Kunde inte spara samtycke',
        description: 'Ett oväntat fel uppstod.',
        variant: 'destructive',
      })
    } finally {
      setIsGrantingConsent(false)
    }
  }

  // Build page context string for the AI
  const buildAthletePageContext = useCallback(() => {
    const pc = pageCtx?.pageContext
    if (!pc) return ''

    let contextStr = `\n\n## AKTUELL SIDKONTEXT: ${pc.title}\n`
    if (pc.summary) contextStr += `\n${pc.summary}\n`

    if (pc.conceptKeys && pc.conceptKeys.length > 0) {
      const entries = getInfoEntriesByKeys(pc.conceptKeys)
      if (entries.length > 0) {
        contextStr += `\n### Relevanta begrepp:\n`
        for (const entry of entries) {
          contextStr += `\n**${entry.title}**: ${entry.detailed}\n`
        }
      }
    }

    if (Object.keys(pc.data || {}).length > 0) {
      contextStr += `\n\`\`\`json\n${JSON.stringify(pc.data, null, 2)}\n\`\`\`\n`
    }

    // Scroll-aware: visible card concepts
    const visible = pageCtx?.visibleConcepts
    if (visible && visible.size > 0) {
      const existingKeys = new Set(pc.conceptKeys || [])
      const extraKeys = [...visible].filter(k => !existingKeys.has(k))
      if (extraKeys.length > 0) {
        const extraEntries = getInfoEntriesByKeys(extraKeys)
        if (extraEntries.length > 0) {
          contextStr += `\n### Användaren tittar just nu på:\n`
          for (const entry of extraEntries) {
            contextStr += `- **${entry.title}**: ${entry.short}\n`
          }
        }
      }
    }

    return contextStr
  }, [pageCtx?.pageContext, pageCtx?.visibleConcepts])

  const pageContextRef = useRef('')
  useEffect(() => {
    pageContextRef.current = buildAthletePageContext()
  }, [buildAthletePageContext])

  const startRealtimeVoice = useCallback(async () => {
    if (isRealtimeVoiceConnecting || isRealtimeVoiceActive) return
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      const message = 'Live voice stöds inte i den här webbläsaren.'
      addAssistantNotice(message)
      toast({
        title: 'Live voice stöds inte',
        description: 'Testa en modern version av Safari, Chrome eller Edge.',
        variant: 'destructive',
      })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'Jag kan inte starta live voice eftersom mikrofonåtkomst saknas.'
      addAssistantNotice(message)
      toast({
        title: 'Mikrofon saknas',
        description: 'Tillåt mikrofonåtkomst och försök igen.',
        variant: 'destructive',
      })
      return
    }

    stopAssistantSpeech()
    cancelVoiceAutoSend()
    setIsRealtimeVoiceConnecting(true)
    setRealtimeVoiceStatus('Startar live voice...')

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
          setRealtimeVoiceStatus('Live voice aktiv. Åtgärder kräver fortsatt bekräftelse i chatten.')
        }
        if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
          stopRealtimeVoice('Live voice är frånkopplad.', 'disconnected')
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
        setRealtimeVoiceStatus('Live voice lyssnar.')
      }
      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; error?: { message?: string } }
          addRealtimeUsageFromEvent(realtimeUsageRef.current, data)
          if (data.type === 'error') {
            const message = data.error?.message || 'Live voice fick ett okänt fel.'
            setRealtimeVoiceStatus(message)
            addAssistantNotice(`Live voice kunde inte fortsätta: ${message}`)
          } else if (data.type === 'response.audio_transcript.done') {
            setRealtimeVoiceStatus('Live voice svarade.')
          } else if (data.type === 'input_audio_buffer.speech_started') {
            setRealtimeVoiceStatus('Live voice lyssnar...')
          } else if (data.type === 'input_audio_buffer.speech_stopped') {
            setRealtimeVoiceStatus('Bearbetar live voice...')
          }
        } catch {
          // Ignore non-JSON realtime diagnostics.
        }
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      if (!offer.sdp) {
        throw new Error('Kunde inte skapa WebRTC-offer.')
      }

      const response = await fetch('/api/ai/chat/realtime-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: offer.sdp,
          isAthleteChat: true,
          pageContext: pageContextRef.current,
        }),
      })
      const answerSdp = await response.text()
      if (!response.ok) {
        let message = 'Kunde inte starta OpenAI live voice.'
        try {
          const parsed = JSON.parse(answerSdp) as { error?: string }
          message = parsed.error || message
        } catch {
          if (answerSdp.trim()) message = answerSdp.trim()
        }
        throw new Error(message)
      }

      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      setRealtimeVoiceStatus('Ansluter live voice...')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kunde inte starta live voice.'
      stopRealtimeVoice(message, 'error')
      addAssistantNotice(`Jag kunde inte starta live voice: ${message}`)
      toast({
        title: 'Live voice kunde inte starta',
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
    toast,
  ])

  const toggleRealtimeVoice = useCallback(() => {
    if (isRealtimeVoiceActive || isRealtimeVoiceConnecting) {
      stopRealtimeVoice('Live voice är avstängd.', 'user_stopped')
      return
    }
    void startRealtimeVoice()
  }, [
    isRealtimeVoiceActive,
    isRealtimeVoiceConnecting,
    startRealtimeVoice,
    stopRealtimeVoice,
  ])

  // Manual input state
  const [input, setInput] = useState('')

  // Track auto-retrieved knowledge skills
  const [knowledgeSkills, setKnowledgeSkills] = useState<string[]>([])

  // Custom fetch to capture X-Knowledge-Skills header
  const skillCapturingFetch = useCallback(async (url: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(url, init)
    const skillsHeader = response.headers.get('X-Knowledge-Skills')
    if (skillsHeader) {
      try {
        setKnowledgeSkills(JSON.parse(skillsHeader))
      } catch { /* ignore parse errors */ }
    } else {
      setKnowledgeSkills([])
    }

    if (!response.ok) {
      const body = await response.clone().json().catch(() => null)
      const allowanceError = parseAiAllowanceError(body)
      if (allowanceError) {
        setSubscriptionError({
          code: allowanceError.code,
          message: `${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`,
          upgradeUrl: allowanceError.actionUrl,
          actionLabel: allowanceError.actionLabel,
        })
      }
    }

    return response
  }, [])

  // Vercel AI SDK useChat hook
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      fetch: skillCapturingFetch,
    }),
    onError: (error) => {
      const errorMessage = error.message || ''

      // Check for consent error
      if (errorMessage.includes('CONSENT_REQUIRED')) {
        setConsentStatus('required')
        return
      }

      // Check for subscription error (403)
      if (errorMessage.includes('SUBSCRIPTION_REQUIRED') || errorMessage.includes('403')) {
        setSubscriptionError({
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Du har nått din månadsgräns för AI-chatt.',
          upgradeUrl: '/athlete/subscription',
        })
        return
      }

      if (errorMessage.includes('AI_ALLOWANCE_EXHAUSTED') || errorMessage.includes('402')) {
        return
      }

      toast({
        title: 'Kunde inte skicka meddelande',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-send mental prep message once chat is ready (consent granted + config loaded)
  useEffect(() => {
    if (!mentalPrepContext || !configReady || consentStatus !== 'granted' || isLoading) return

    // Only auto-send if this is a fresh conversation (no messages yet)
    if (messages.length > 0) return

    const message = buildMentalPrepMessage(mentalPrepContext)

    // Create conversation + send message
    async function startMentalPrepChat() {
      let convId = conversationId
      if (!convId) {
        try {
          const response = await fetch('/api/ai/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelUsed: selectedIntent,
              provider: 'INTENT',
            }),
          })
          const data = await response.json()
          if (data.conversation?.id) {
            convId = data.conversation.id
            setConversationId(convId)
          }
        } catch (error) {
          console.error('Failed to create conversation:', error)
        }
      }

      const mentalPrepPageContext = buildMentalPrepPageContext(mentalPrepContext!)

      void sendMessage({ text: message }, {
        body: {
          conversationId: convId,
          intent: selectedIntent,
          isAthleteChat: true,
          clientId,
          memoryContext: memoryContext || undefined,
          pageContext: mentalPrepPageContext,
        },
      })

      // Clear mental prep context after sending (so it doesn't re-trigger)
      setMentalPrepContext(null)
    }

    void startMentalPrepChat()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentalPrepContext, configReady, consentStatus, messages.length])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect programs in assistant messages
  useEffect(() => {
    if (!messages.length || isLoading) return
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return

    const textContent = lastMessage.parts
      ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('') || ''

    if (!textContent || textContent.length < 100) return

    try {
      const result = parseAIProgram(textContent)
      if (result.success && result.program) {
        setDetectedProgram(result)
      } else {
        setDetectedProgram(null)
      }
    } catch {
      setDetectedProgram(null)
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (isLoading || !messages.length) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return
    if (spokenAssistantMessageIdsRef.current.has(lastMessage.id)) return

    const textContent = getMessageTextContent(lastMessage.parts)
    if (!textContent) return

    spokenAssistantMessageIdsRef.current.add(lastMessage.id)
    const timeout = window.setTimeout(() => {
      void speakAssistantReply(textContent)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [isLoading, messages, speakAssistantReply])

  useEffect(() => {
    if (!assistantNotices.length) return
    const latestNotice = assistantNotices[assistantNotices.length - 1]
    if (spokenAssistantNoticeIdsRef.current.has(latestNotice.id)) return

    spokenAssistantNoticeIdsRef.current.add(latestNotice.id)
    const timeout = window.setTimeout(() => {
      void speakAssistantReply(latestNotice.content)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [assistantNotices, speakAssistantReply])

  async function handlePublishProgram() {
    if (!detectedProgram?.program) return
    setIsPublishing(true)
    try {
      // Get last assistant message content
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
      const aiOutput = lastAssistant?.parts
        ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('') || ''

      const response = await fetch('/api/ai/save-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiOutput,
          clientId,
          conversationId,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Program sparat!',
          description: `"${detectedProgram.program.name}" har sparats.`,
        })
        setDetectedProgram(null)
      } else {
        const data = await response.json()
        toast({
          title: 'Kunde inte spara programmet',
          description: data.error || 'Försök igen senare.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Fel vid sparning',
        description: 'Ett oväntat fel uppstod.',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendAthleteChatMessage = useCallback(async (rawMessage: string) => {
    const messageContent = rawMessage.trim()
    if (!messageContent || isLoading) return
    if (!configReady) {
      addAssistantNotice('Jag kan inte skicka just nu eftersom AI-inställningarna inte är färdigladdade. Vänta några sekunder och försök igen.')
      return
    }

    let nextConversationId = conversationId
    if (!nextConversationId) {
      try {
        const response = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelUsed: selectedIntent,
            provider: 'INTENT',
          }),
        })
        const data = await response.json()
        if (data.conversation?.id) {
          nextConversationId = data.conversation.id
          setConversationId(nextConversationId)
        }
      } catch (error) {
        console.error('Failed to create conversation:', error)
      }
    }

    setInput('')

    const mentalPrepPageCtx = mentalPrepContextRef.current
      ? buildMentalPrepPageContext(mentalPrepContextRef.current)
      : ''
    const combinedPageContext = [pageContextRef.current, mentalPrepPageCtx]
      .filter(Boolean)
      .join('\n')

    void sendMessage({ text: messageContent }, {
      body: {
        conversationId: nextConversationId,
        intent: selectedIntent,
        isAthleteChat: true, // This triggers athlete mode
        clientId,
        memoryContext: memoryContext || undefined,
        pageContext: combinedPageContext || undefined,
      },
    })
  }, [
    addAssistantNotice,
    clientId,
    configReady,
    conversationId,
    isLoading,
    memoryContext,
    selectedIntent,
    sendMessage,
  ])

  const scheduleVoiceAutoSend = useCallback((message: string) => {
    cancelVoiceAutoSend()
    setIsVoiceAutoSendPending(true)
    voiceAutoSendTimeoutRef.current = setTimeout(() => {
      voiceAutoSendTimeoutRef.current = null
      setIsVoiceAutoSendPending(false)
      void sendAthleteChatMessage(message)
    }, 2000)
  }, [cancelVoiceAutoSend, sendAthleteChatMessage])

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
        throw new Error(data.error || 'Kunde inte transkribera röstmeddelandet.')
      }

      const text = typeof data.text === 'string' ? data.text.trim() : ''
      if (!text) {
        throw new Error('Jag hörde inget tydligt i röstmeddelandet.')
      }
      return text
    } finally {
      setIsTranscribingVoice(false)
    }
  }, [])

  async function handleVoiceButtonClick() {
    if (isVoiceRecording) {
      stopRecording()
      return
    }

    if (isTranscribingVoice || voiceRecordingPromiseRef.current) return
    cancelVoiceAutoSend()

    if (!isVoiceSupported) {
      const message = 'Röstinmatning stöds inte i den här webbläsaren.'
      addAssistantNotice(message)
      toast({
        title: 'Röstinmatning stöds inte',
        description: 'Testa en modern version av Safari, Chrome eller Edge.',
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
        throw new Error('Jag fick ingen ljuddata från mikrofonen.')
      }

      const transcript = await transcribeVoiceBlob(audioBlob)
      const trimmedInput = input.trim()
      const nextInputValue = trimmedInput ? `${trimmedInput}\n${transcript}` : transcript
      setInput(nextInputValue)
      textareaRef.current?.focus()
      if (isVoiceAutoSendEnabled) {
        scheduleVoiceAutoSend(nextInputValue)
        toast({
          title: 'Röst transkriberad',
          description: 'Jag skickar meddelandet automatiskt om en liten stund.',
        })
      } else {
        toast({
          title: 'Röst transkriberad',
          description: 'Texten ligger i meddelandefältet.',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kunde inte hantera röstmeddelandet.'
      addAssistantNotice(`Jag kunde inte använda röstmeddelandet: ${message}`)
      toast({
        title: 'Kunde inte använda rösten',
        description: message,
        variant: 'destructive',
      })
    } finally {
      if (voiceRecordingPromiseRef.current === recordingPromise) {
        voiceRecordingPromiseRef.current = null
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    cancelVoiceAutoSend()
    await sendAthleteChatMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit(e)
    }
  }

  function handleClose() {
    stopAssistantSpeech()
    cancelVoiceAutoSend()
    stopRealtimeVoice(undefined, 'close')
    setIsOpen(false)
    setMessages([])
    setAssistantNotices([])
    setConversationId(null)
    setInput('')
    setMentalPrepContext(null)
    mentalPrepContextRef.current = null
    spokenAssistantMessageIdsRef.current.clear()
    spokenAssistantNoticeIdsRef.current.clear()
  }

  function handleNewChat() {
    stopAssistantSpeech()
    cancelVoiceAutoSend()
    stopRealtimeVoice(undefined, 'new_chat')
    setMessages([])
    setAssistantNotices([])
    setConversationId(null)
    setInput('')
    setMentalPrepContext(null)
    mentalPrepContextRef.current = null
    spokenAssistantMessageIdsRef.current.clear()
    spokenAssistantNoticeIdsRef.current.clear()
  }

  function handleQuickPrompt(prompt: string) {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  async function handleSelectIntent(intent: ModelIntent) {
    setSelectedIntent(intent)
    // Persist preference
    try {
      await fetch('/api/ai/models/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      })
    } catch {
      // Silent failure - intent is already switched locally
    }
  }

  // Render intent tier badge (static or as picker trigger)
  function renderModelBadge() {
    if (!configReady) return null

    const tierLabel = INTENT_TIER_LABELS[selectedIntent]?.label || 'Balanserad'

    // Only 1 intent available → static badge
    if (availableIntents.length <= 1) {
      return (
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
          {tierLabel}
        </Badge>
      )
    }

    // Multiple intents → clickable picker
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 bg-orange-100 text-orange-800">
            {tierLabel}
            <ChevronDown className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start" side="bottom">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">Välj AI-kvalitet</p>
          {availableIntents.map((tier) => (
            <button
              key={tier.intent}
              onClick={() => handleSelectIntent(tier.intent)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors hover:bg-muted',
                tier.intent === selectedIntent && 'bg-muted'
              )}
            >
              <span className="flex-1 truncate">{tier.label}</span>
              {tier.intent === 'balanced' && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">Rek.</Badge>
              )}
              {tier.intent === selectedIntent && (
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              )}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    )
  }

  const voiceStatusMessage = isVoiceRecording
    ? `Spelar in ${formatVoiceDuration(voiceDuration)}`
    : isTranscribingVoice
      ? 'Skriver ut röstmeddelandet...'
      : voiceRecorderError
        ? voiceRecorderError
        : null
  const voiceButtonLabel = isVoiceRecording
    ? 'Stoppa inspelning'
    : isTranscribingVoice
      ? 'Transkriberar röst'
      : 'Starta röstinmatning'
  const spokenRepliesLabel = isSpokenRepliesEnabled
    ? 'Stäng av röstsvar'
    : 'Slå på röstsvar'
  const voiceAutoSendLabel = isVoiceAutoSendEnabled
    ? 'Stäng av automatisk röstsändning'
    : 'Slå på automatisk röstsändning'
  const voiceOperatorModeLabel = isVoiceOperatorModeEnabled
    ? 'Stäng av voice operator'
    : 'Slå på voice operator'
  const realtimeVoiceLabel = isRealtimeVoiceActive || isRealtimeVoiceConnecting
    ? 'Stäng av live voice'
    : 'Starta live voice'

  // Don't render if AI is not configured
  if (!isOpen && hasAIAccess === false) {
    return null
  }

  // Floating button (always visible if AI is available)
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        onMouseUp={handleActivatorClick}
        onPointerDown={handleButtonDragStart}
        style={buttonFloatingStyle}
        data-floating-chat-root
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 z-50 fixed-bottom-safe touch-none cursor-grab active:cursor-grabbing"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>
    )
  }

  // Loading config
  if (isLoadingConfig) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 left-3 right-3 h-[200px] sm:left-auto sm:right-6 sm:w-[380px]'
        )}
        style={panelFloatingStyle}
        data-floating-chat-root
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">AI-assistent</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // No AI access (coach hasn't configured keys)
  if (hasAIAccess === false) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 left-3 right-3 h-[300px] sm:left-auto sm:right-6 sm:w-[380px]'
        )}
        style={panelFloatingStyle}
        data-floating-chat-root
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">AI-assistent</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">AI-funktionen inte tillgänglig</h3>
            <p className="text-sm text-muted-foreground">
              Din coach har inte aktiverat AI-funktionen ännu. Kontakta din coach för mer information.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Subscription error (limit reached)
  if (subscriptionError) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 left-3 right-3 h-[350px] sm:left-auto sm:right-6 sm:w-[380px]'
        )}
        style={panelFloatingStyle}
        data-floating-chat-root
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">Prenumeration krävs</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSubscriptionError(null)
              handleClose()
            }}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Lock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="font-semibold mb-2">{subscriptionError.message}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Uppgradera din prenumeration för att fortsätta använda AI-chatten.
            </p>
            {subscriptionStatus && subscriptionStatus.limit > 0 && (
              <div className="mb-4">
                <AIChatUsageMeter
                  used={subscriptionStatus.used}
                  limit={subscriptionStatus.limit}
                />
              </div>
            )}
            <Link href={`${basePath}${subscriptionError.upgradeUrl || '/athlete/subscription'}`}>
              <Button className="bg-amber-600 hover:bg-amber-700">
                {subscriptionError.actionLabel || 'Uppgradera prenumeration'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // GDPR consent required
  if (consentStatus === 'required') {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 left-3 right-3 max-h-[420px] sm:left-auto sm:right-6 sm:w-[380px]'
        )}
        style={panelFloatingStyle}
        data-floating-chat-root
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">Samtycke krävs</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="text-center mb-4">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-emerald-600" />
            <h3 className="font-semibold mb-1">Databehandling för AI-chatt</h3>
            <p className="text-xs text-muted-foreground">
              Din träningsdata skickas till en extern AI-tjänst för analys. Enligt GDPR behöver vi ditt samtycke.
            </p>
          </div>
          <div className="space-y-3 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={consentDataProcessing}
                onCheckedChange={(checked) => setConsentDataProcessing(checked === true)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">Behandla min träningsdata</span>
                <p className="text-xs text-muted-foreground">
                  Tillåt att träningshistorik, testresultat och prestationsdata skickas till AI-tjänsten.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={consentHealthData}
                onCheckedChange={(checked) => setConsentHealthData(checked === true)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">Behandla hälsodata</span>
                <p className="text-xs text-muted-foreground">
                  Tillåt att hälsorelaterad data som beredskapspoäng, trötthet och skadestatus skickas.
                </p>
              </div>
            </label>
          </div>
          <Button
            onClick={handleGrantConsent}
            disabled={!consentDataProcessing || !consentHealthData || isGrantingConsent}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isGrantingConsent ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            Godkänn
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Du kan återkalla ditt samtycke när som helst via inställningar.
          </p>
        </div>
      </div>
    )
  }

  // Chat panel
  return (
    <div
      className={cn(
        'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
        isExpanded
          ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[500px]'
          : 'bottom-6 left-3 right-3 h-[500px] sm:left-auto sm:right-6 sm:w-[380px]'
      )}
      style={!isExpanded ? panelFloatingStyle : undefined}
      data-floating-chat-root
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
        <div
          onPointerDown={!isExpanded ? handlePanelDragStart : undefined}
          className={cn(
            'flex min-w-0 items-center gap-2 touch-none',
            !isExpanded && 'cursor-grab active:cursor-grabbing'
          )}
        >
          <Bot className="h-5 w-5 shrink-0 text-white" />
          <span className="truncate font-semibold text-white">AI-assistent</span>
          {renderModelBadge()}
          {/* Usage meter - only show if there's a limit */}
          {subscriptionStatus && subscriptionStatus.limit > 0 && subscriptionStatus.limit !== -1 && (
            <Badge variant="secondary" className="text-xs bg-white/20 text-white">
              <AIChatUsageCompact
                used={subscriptionStatus.used}
                limit={subscriptionStatus.limit}
                className="text-white"
              />
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <VoiceModesGuide />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRealtimeVoice}
            disabled={isTranscribingVoice || isVoiceRecording}
            className={cn(
              'h-8 w-8 text-white hover:bg-white/20',
              (isRealtimeVoiceActive || isRealtimeVoiceConnecting) && 'bg-white/20 ring-1 ring-white/40'
            )}
            title={realtimeVoiceLabel}
            aria-label={realtimeVoiceLabel}
          >
            {isRealtimeVoiceActive || isRealtimeVoiceConnecting ? (
              <PhoneOff className="h-4 w-4" />
            ) : (
              <Radio className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoiceOperatorMode}
            className={cn(
              'h-8 w-8 text-white hover:bg-white/20',
              isVoiceOperatorModeEnabled && 'bg-white/20 ring-1 ring-white/40'
            )}
            title={voiceOperatorModeLabel}
            aria-label={voiceOperatorModeLabel}
          >
            <Headphones className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoiceAutoSend}
            className={cn(
              'h-8 w-8 text-white hover:bg-white/20',
              isVoiceAutoSendEnabled && 'bg-white/15'
            )}
            title={voiceAutoSendLabel}
            aria-label={voiceAutoSendLabel}
          >
            <Zap className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSpokenReplies}
            className={cn(
              'h-8 w-8 text-white hover:bg-white/20',
              isSpokenRepliesEnabled && 'bg-white/15'
            )}
            title={spokenRepliesLabel}
            aria-label={spokenRepliesLabel}
          >
            {isSpokenRepliesEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          <MemoryIndicator
            clientId={clientId}
            onMemoryContextReady={setMemoryContext}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="h-8 w-8 text-white hover:bg-white/20"
            title="Ny konversation"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isVoiceOperatorModeEnabled && (
        <div className="px-3 py-2 border-b bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Headphones className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Voice operator aktiv: mikrofon, auto-send och röstsvar är på</span>
          </div>
          <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium">
            Bekräftar åtgärder
          </span>
        </div>
      )}

      {(isRealtimeVoiceActive || isRealtimeVoiceConnecting || realtimeVoiceStatus) && (
        <div className="px-3 py-2 border-b bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isRealtimeVoiceConnecting ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Radio className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {realtimeVoiceStatus || 'Live voice aktiv'}
            </span>
          </div>
          {(isRealtimeVoiceActive || isRealtimeVoiceConnecting) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => stopRealtimeVoice('Live voice är avstängd.', 'user_stopped')}
              className="h-6 px-2 text-xs hover:bg-emerald-500/10"
            >
              Stoppa
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && assistantNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="font-medium mb-1">Hej{athleteName ? `, ${athleteName}` : ''}!</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-4">
              Jag är din AI-träningsassistent. Jag kan hjälpa dig förstå din träning, förklara pass och analysera dina data.
            </p>
            {showVoiceGuideCard && (
              <VoiceModesGuide
                variant="card"
                onDismiss={dismissVoiceGuideCard}
                onStartVoiceOperator={startVoiceOperatorFromGuide}
                className="mb-4 w-full max-w-[320px]"
              />
            )}
            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 justify-center max-w-[320px]">
              {ATHLETE_QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickPrompt(prompt.prompt)}
                >
                  {prompt.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              // AI SDK 5: Extract text from message parts
              const textContent = message.parts
                ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                .map((part) => part.text)
                .join('') || ''

              // Check for workout tool results (AI SDK v5: type is "tool-{name}", state is "output-available")
              const workoutToolPart = (message.parts as any[])?.find( // eslint-disable-line
                part => part.type === 'tool-createTodayWorkout' && part.state === 'output-available' && part.output?.success
              )
              const workoutResult = workoutToolPart ? workoutToolPart.output : null

              // Check for program generation tool results
              const programToolPart = (message.parts as any[])?.find( // eslint-disable-line
                part => part.type === 'tool-generateTrainingProgram' && part.state === 'output-available' && part.output?.success
              )
              const programResult = programToolPart ? programToolPart.output : null
              const programErrorPart = (message.parts as any[])?.find( // eslint-disable-line
                part => part.type === 'tool-generateTrainingProgram' && part.state === 'output-available' && part.output && !part.output.success
              )
              const programError = programErrorPart ? programErrorPart.output : null

              return (
                <div key={`${message.id}-${index}`}>
                  {textContent && (
                    <ChatMessage
                      message={{
                        id: message.id,
                        role: message.role as 'user' | 'assistant' | 'system',
                        content: textContent,
                        createdAt: new Date(),
                      }}
                    />
                  )}
                  {workoutResult && (
                    <ChatWorkoutCard
                      wodId={workoutResult.wodId}
                      title={workoutResult.title}
                      subtitle={workoutResult.subtitle}
                      duration={workoutResult.duration}
                      workoutType={workoutResult.workoutType}
                      intensity={workoutResult.intensity}
                      exerciseCount={workoutResult.exerciseCount}
                      sectionCount={workoutResult.sectionCount}
                      previewImages={workoutResult.previewImages}
                      basePath={basePath}
                    />
                  )}
                  {programResult && (
                    completedPrograms.has(programResult.sessionId) ? (
                      <ChatProgramPreviewCard
                        sessionId={programResult.sessionId}
                        program={completedPrograms.get(programResult.sessionId)!}
                        clientId={clientId}
                        conversationId={conversationId}
                        basePath={basePath}
                      />
                    ) : (
                      <ChatProgramProgressCard
                        sessionId={programResult.sessionId}
                        sport={programResult.sport}
                        totalWeeks={programResult.totalWeeks}
                        totalPhases={programResult.totalPhases}
                        estimatedMinutes={programResult.estimatedMinutes}
                        goal={programResult.goal}
                        onComplete={(program) => {
                          setCompletedPrograms(prev => {
                            const next = new Map(prev)
                            next.set(programResult.sessionId, program)
                            return next
                          })
                        }}
                        onError={(error) => {
                          console.error('Program generation error:', error)
                        }}
                      />
                    )
                  )}
                  {programError && (
                    <div className="my-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                      <div className="flex items-start gap-2">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
                        <div className="min-w-0 space-y-2">
                          <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                            Programgenereringen kunde inte startas
                          </p>
                          <p className="text-xs text-red-700 dark:text-red-200">
                            {programError.error || 'Försök igen senare.'}
                            {programError.upgradeMessage ? ` ${programError.upgradeMessage}` : ''}
                          </p>
                          <AiAllowanceBlockedAction
                            action={
                              programError.actionUrl
                                ? {
                                    label: programError.actionLabel || 'Hantera AI-krediter',
                                    url: programError.actionUrl,
                                  }
                                : null
                            }
                            tone="red"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {assistantNotices.map((notice) => (
              <ChatMessage
                key={notice.id}
                message={{
                  id: notice.id,
                  role: 'assistant',
                  content: notice.content,
                  createdAt: notice.createdAt,
                }}
              />
            ))}
            {knowledgeSkills.length > 0 && !isLoading && (
              <div className="flex items-center gap-1.5 flex-wrap px-1 py-1">
                <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                {knowledgeSkills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Program detected banner */}
      {detectedProgram?.program && (
        <div className="px-3 py-2 border-t bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
                  {detectedProgram.program.name}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {detectedProgram.program.totalWeeks} veckor
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handlePublishProgram}
              disabled={isPublishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2 shrink-0"
            >
              {isPublishing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Spara program
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                cancelVoiceAutoSend()
                setInput(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Skriv ett meddelande..."
              className="min-h-[44px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant={isVoiceRecording ? 'destructive' : 'outline'}
              disabled={isTranscribingVoice}
              onClick={() => { void handleVoiceButtonClick() }}
              className="h-auto px-3"
              title={voiceButtonLabel}
              aria-label={voiceButtonLabel}
            >
              {isTranscribingVoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isVoiceRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              size="icon"
              className="h-auto px-3 bg-emerald-600 hover:bg-emerald-700"
              disabled={!input.trim() || isLoading || isVoiceRecording || isTranscribingVoice}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {voiceStatusMessage && (
            <div
              className={cn(
                'rounded-md px-3 py-2 text-xs',
                voiceRecorderError && !isVoiceRecording && !isTranscribingVoice
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {voiceStatusMessage}
            </div>
          )}
          {isVoiceAutoSendPending && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <span>Skickar röstmeddelandet snart...</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelVoiceAutoSend}
                className="h-6 px-2 text-xs hover:bg-blue-500/10"
              >
                Avbryt
              </Button>
            </div>
          )}
          {isSpokenRepliesEnabled && (isGeneratingAssistantAudio || isSpeakingAssistant || voicePlaybackStatus) && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {voicePlaybackStatus || (isSpeakingAssistant ? 'Läser upp svaret...' : 'Skapar AI-röst...')}
              <span className="ml-1">Rösten är AI-genererad.</span>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

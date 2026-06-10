'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { resolveModelForClient } from '@/types/ai-models'
import {
  Bot,
  Send,
  Loader2,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  MessageSquare,
  Settings,
  Check,
  ChevronDown,
  Database,
  BookOpen,
  History,
  Save,
  AlertTriangle,
  Mic,
  Square,
  User,
  Volume2,
  VolumeX,
  Zap,
  Headphones,
  Radio,
  PhoneOff,
} from 'lucide-react'
import {
  getVoiceFileExtension,
  formatVoiceDuration,
  getMessageTextContent,
  getSpeakableAssistantText,
} from './voice-helpers'
import { ChatMessage } from './ChatMessage'
import { ChatHistoryPanel } from './ChatHistoryPanel'
import { ChatNavigationCard, type ChatNavigationResult } from './ChatNavigationCard'
import { ChatActionCard, type ChatActionResult } from './ChatActionCard'
import { AISkillPicker } from '@/components/ai/AISkillPicker'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { parseAIProgram, type ParseResult } from '@/lib/ai/program-parser'
import { getInfoEntriesByKeys } from '@/lib/info-content'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { useLocale } from '@/i18n/client'
import { useFloatingChatDrag } from './useFloatingChatDrag'
import {
  COACH_FLOATING_CHAT_EVENT,
  type CoachFloatingChatEvent,
} from '@/lib/events/coach-floating-chat'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { VoiceModesGuide } from './VoiceModesGuide'
import {
  addRealtimeUsageFromEvent,
  createRealtimeVoiceUsageAccumulator,
  hasRealtimeUsageTokens,
} from '@/lib/ai/realtime-voice-client'
import {
  buildAiCapabilityDiscoveryPrompt,
  type AiCapabilityDiscoveryItem,
  type AiCapabilityDiscoverySummary,
} from '@/lib/ai/capabilities/discovery'
import { FLOATING_CHAT_COPY } from './floating-chat-copy'
import {
  getCoachOperatorContext,
  getToolOnlyStatusMessage,
  isToolStatusOutput,
  type PageContext,
  type ToolOutputPart,
} from './floating-chat-tool-status'

export type { PageContext } from './floating-chat-tool-status'

const COACH_VOICE_GUIDE_DISMISSED_KEY = 'floating-ai-voice-guide-dismissed'

interface FloatingAIChatProps {
  /** Optional athlete context to pre-fill */
  athleteId?: string
  athleteName?: string
  /** Optional initial message to send */
  initialMessage?: string
  /** Context type for the AI */
  contextType?: 'athlete' | 'program' | 'test' | 'general'
  /** Page-specific context data to include in AI prompts */
  pageContext?: PageContext
  /** Concept keys from cards currently visible in the viewport */
  visibleConcepts?: Set<string>
}

interface ModelConfig {
  model: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  displayName: string
}

interface QuickPrompt {
  label: string
  prompt: string
}

interface AthleteOption {
  id: string
  name: string
}

interface AiCapabilitiesResponse {
  success?: boolean
  operationsEnabled?: boolean
  summary?: AiCapabilityDiscoverySummary
  capabilities?: AiCapabilityDiscoveryItem[]
}

export function FloatingAIChat({
  athleteId,
  athleteName,
  initialMessage,
  contextType: _contextType = 'general',
  pageContext,
  visibleConcepts,
}: FloatingAIChatProps) {
  const { toast } = useToast()
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = FLOATING_CHAT_COPY[locale]
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const {
    buttonFloatingStyle,
    panelFloatingStyle,
    handleButtonDragStart,
    handlePanelDragStart,
    handleActivatorClick,
  } = useFloatingChatDrag()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  // Athlete context is internal state so the coach can switch athlete mid-session;
  // the props only seed the initial selection.
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | undefined>(athleteId)
  const [selectedAthleteName, setSelectedAthleteName] = useState<string | undefined>(athleteName)
  const [isAthletePickerOpen, setIsAthletePickerOpen] = useState(false)
  const [athleteOptions, setAthleteOptions] = useState<AthleteOption[] | null>(null)
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(false)
  const [athleteSearch, setAthleteSearch] = useState('')
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isContextEnabled, setIsContextEnabled] = useState(true)
  const [isAthleteUser, setIsAthleteUser] = useState(false)
  const [assistantNotices, setAssistantNotices] = useState<Array<{
    id: string
    content: string
    createdAt: Date
  }>>([])
  const [capabilitySnapshot, setCapabilitySnapshot] = useState<{
    operationsEnabled: boolean
    capabilities: AiCapabilityDiscoveryItem[]
  } | null>(null)

  // GDPR: Track athlete consent status for coach chat
  const [athleteConsentStatus, setAthleteConsentStatus] = useState<'loading' | 'granted' | 'none' | null>(null)

  // Program detection state
  const [detectedProgram, setDetectedProgram] = useState<ParseResult | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
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
        id: `assistant-notice-${Date.now()}-${current.length}`,
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const frame = window.requestAnimationFrame(() => {
      const savedVoiceOperatorMode = window.localStorage.getItem('floating-ai-voice-operator-mode') === 'true'
      const canPlayAssistantAudio = 'Audio' in window || 'speechSynthesis' in window
      setIsVoiceAutoSendEnabled(window.localStorage.getItem('floating-ai-voice-auto-send') === 'true')
      setIsSpokenRepliesEnabled(window.localStorage.getItem('floating-ai-spoken-replies') === 'true')
      setIsSpeechSupported(canPlayAssistantAudio)
      setIsVoiceOperatorModeEnabled(savedVoiceOperatorMode && canPlayAssistantAudio)
      setShowVoiceGuideCard(window.localStorage.getItem(COACH_VOICE_GUIDE_DISMISSED_KEY) !== 'true')
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
      setIsSpokenRepliesEnabled(window.localStorage.getItem('floating-ai-spoken-replies') === 'true')
    })

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice =
        (locale === 'sv'
          ? voices.find((voice) => voice.lang.toLowerCase().startsWith('sv') && /alva|klara|oskar/i.test(voice.name)) ||
            voices.find((voice) => voice.lang.toLowerCase().startsWith('sv')) ||
            voices.find((voice) => voice.lang.toLowerCase().startsWith('en') && /samantha|daniel/i.test(voice.name)) ||
            voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
          : voices.find((voice) => voice.lang.toLowerCase().startsWith('en') && /samantha|daniel/i.test(voice.name)) ||
            voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
            voices.find((voice) => voice.lang.toLowerCase().startsWith('sv') && /alva|klara|oskar/i.test(voice.name)) ||
            voices.find((voice) => voice.lang.toLowerCase().startsWith('sv'))) ||
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

  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    void Promise.resolve().then(async () => {
      try {
        const params = new URLSearchParams()
        if (pathBusinessSlug) params.set('businessSlug', pathBusinessSlug)
        const query = params.toString()
        const response = await fetch(`/api/ai/capabilities${query ? `?${query}` : ''}`, {
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null) as AiCapabilitiesResponse | null
        if (!isMounted || !payload?.success) return
        setCapabilitySnapshot({
          operationsEnabled: Boolean(payload.operationsEnabled),
          capabilities: payload.capabilities || [],
        })
      } catch {
        if (isMounted) setCapabilitySnapshot(null)
      }
    })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [pathBusinessSlug])

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
        isAthleteChat: isAthleteUser,
        endReason,
        ...tokenPayload,
      }),
    }).catch(() => {
      // Usage logging is best-effort on the client; the server still guards session start.
    })
  }, [isAthleteUser])

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
    utterance.lang = voice?.lang || (locale === 'sv' ? 'sv-SE' : 'en-US')
    utterance.voice = voice
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => {
      setIsSpeakingAssistant(true)
      setVoicePlaybackStatus(copy.browserVoice)
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
  }, [copy.browserVoice, isBrowserSpeechSupported, locale])

  const playPremiumAssistantReply = useCallback(async (text: string): Promise<boolean> => {
    if (premiumVoiceUnavailableRef.current) return false
    if (typeof window === 'undefined' || !('Audio' in window)) return false

    const speakableText = getSpeakableAssistantText(text).slice(0, 4096)
    if (!speakableText) return false

    stopAssistantSpeech()
    const controller = new AbortController()
    assistantSpeechAbortRef.current = controller
    setIsGeneratingAssistantAudio(true)
    setVoicePlaybackStatus(copy.generatingVoice)

    try {
      const response = await fetch('/api/ai/chat/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: speakableText,
          isAthleteChat: isAthleteUser,
          businessSlug: pathBusinessSlug,
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
        setVoicePlaybackStatus(copy.playingVoice)
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
  }, [copy.generatingVoice, copy.playingVoice, isAthleteUser, pathBusinessSlug, stopAssistantSpeech])

  const speakAssistantReply = useCallback(async (text: string) => {
    if (!isSpokenRepliesEnabled || !isSpeechSupported) return

    const usedPremiumVoice = await playPremiumAssistantReply(text)
    if (usedPremiumVoice) return

    const usedBrowserVoice = speakBrowserAssistantReply(text)
    if (usedBrowserVoice) {
      setVoicePlaybackStatus(premiumVoiceUnavailableRef.current ? copy.browserVoice : null)
      return
    }

    setVoicePlaybackStatus(copy.spokenRepliesUnavailable)
  }, [
    copy.browserVoice,
    copy.spokenRepliesUnavailable,
    isSpeechSupported,
    isSpokenRepliesEnabled,
    playPremiumAssistantReply,
    speakBrowserAssistantReply,
  ])

  const toggleSpokenReplies = useCallback(() => {
    if (!isSpeechSupported) {
      const message = copy.spokenRepliesUnsupported
      addAssistantNotice(message)
      toast({
        title: copy.spokenRepliesUnsupported,
        description: copy.modernBrowser,
        variant: 'destructive',
      })
      return
    }

    setIsSpokenRepliesEnabled((current) => {
      const next = !current
      window.localStorage.setItem('floating-ai-spoken-replies', String(next))
      if (!next) {
        stopAssistantSpeech()
        setIsVoiceOperatorModeEnabled(false)
        window.localStorage.setItem('floating-ai-voice-operator-mode', 'false')
      }
      return next
    })
  }, [addAssistantNotice, copy.modernBrowser, copy.spokenRepliesUnsupported, isSpeechSupported, stopAssistantSpeech, toast])

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
      window.localStorage.setItem(COACH_VOICE_GUIDE_DISMISSED_KEY, 'true')
    }
  }, [])

  const toggleVoiceAutoSend = useCallback(() => {
    setIsVoiceAutoSendEnabled((current) => {
      const next = !current
      window.localStorage.setItem('floating-ai-voice-auto-send', String(next))
      if (!next) {
        cancelVoiceAutoSend()
        setIsVoiceOperatorModeEnabled(false)
        window.localStorage.setItem('floating-ai-voice-operator-mode', 'false')
      }
      return next
    })
  }, [cancelVoiceAutoSend])

  const toggleVoiceOperatorMode = useCallback(() => {
    if (!isVoiceOperatorModeEnabled && !isSpeechSupported) {
      const message = copy.voiceOperatorNeedsSpeech
      addAssistantNotice(message)
      toast({
        title: copy.voiceOperatorCannotStart,
        description: copy.modernBrowser,
        variant: 'destructive',
      })
      return
    }

    const next = !isVoiceOperatorModeEnabled
    setIsVoiceOperatorModeEnabled(next)
    window.localStorage.setItem('floating-ai-voice-operator-mode', String(next))

    if (next) {
      setIsSpokenRepliesEnabled(true)
      setIsVoiceAutoSendEnabled(true)
      window.localStorage.setItem('floating-ai-spoken-replies', 'true')
      window.localStorage.setItem('floating-ai-voice-auto-send', 'true')
      addAssistantNotice(copy.voiceOperatorActiveNotice)
      toast({
        title: copy.voiceOperatorActiveTitle,
        description: copy.voiceOperatorActiveDescription,
      })
    } else {
      cancelVoiceAutoSend()
      addAssistantNotice(copy.voiceOperatorOffNotice)
      toast({
        title: copy.voiceOperatorOffTitle,
        description: copy.voiceOperatorOffDescription,
      })
    }
  }, [
    addAssistantNotice,
    cancelVoiceAutoSend,
    copy.modernBrowser,
    copy.voiceOperatorActiveDescription,
    copy.voiceOperatorActiveNotice,
    copy.voiceOperatorActiveTitle,
    copy.voiceOperatorCannotStart,
    copy.voiceOperatorNeedsSpeech,
    copy.voiceOperatorOffDescription,
    copy.voiceOperatorOffNotice,
    copy.voiceOperatorOffTitle,
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

  // Track if context is available (data-rich or auto-context with concepts)
  const hasContext = !!pageContext && (
    Object.keys(pageContext.data || {}).length > 0 ||
    (pageContext.conceptKeys && pageContext.conceptKeys.length > 0)
  )
  const operatorContext = useMemo(() => getCoachOperatorContext(pageContext), [pageContext])
  const operatorAttentionCount = operatorContext?.summary?.urgentCount || operatorContext?.summary?.queueCount || 0

  // Fetch model configuration from unified AI config endpoint
  // Works for both coaches (uses own keys) and athletes (uses coach's keys)
  useEffect(() => {
    async function fetchModelConfig() {
      try {
        const response = await fetch('/api/ai/config')
        const data = await response.json()

        if (data.success) {
          // Track if user is an athlete
          if (data.isAthlete) {
            setIsAthleteUser(true)
          }

          // Check which API keys are configured
          const anthropicKey = data.keys.find((k: { provider: string }) => k.provider === 'anthropic')
          const googleKey = data.keys.find((k: { provider: string }) => k.provider === 'google')
          const openaiKey = data.keys.find((k: { provider: string }) => k.provider === 'openai')

          const configured = {
            hasGoogle: !!googleKey?.configured,
            hasAnthropic: !!anthropicKey?.configured,
            hasOpenai: !!openaiKey?.configured,
          }

          // Use default model if set and provider key is available
          if (data.defaultModel) {
            const defaultModel = data.defaultModel
            const provider = defaultModel.provider as 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
            const providerKeyAvailable =
              (provider === 'GOOGLE' && configured.hasGoogle) ||
              (provider === 'ANTHROPIC' && configured.hasAnthropic) ||
              (provider === 'OPENAI' && configured.hasOpenai)

            if (providerKeyAvailable) {
              setModelConfig({
                model: defaultModel.modelId,
                provider,
                displayName: defaultModel.displayName || defaultModel.modelId,
              })
              setHasApiKey(true)
            } else {
              // Default model's provider not available — fall back to best available
              const resolved = resolveModelForClient(configured, 'balanced')
              if (resolved) {
                setModelConfig({
                  model: resolved.modelId,
                  provider: resolved.provider.toUpperCase() as 'GOOGLE' | 'ANTHROPIC' | 'OPENAI',
                  displayName: resolved.displayName,
                })
                setHasApiKey(true)
              } else {
                setHasApiKey(false)
              }
            }
          } else {
            // No default model — pick best available
            const resolved = resolveModelForClient(configured, 'balanced')
            if (resolved) {
              setModelConfig({
                model: resolved.modelId,
                provider: resolved.provider.toUpperCase() as 'GOOGLE' | 'ANTHROPIC' | 'OPENAI',
                displayName: resolved.displayName,
              })
              setHasApiKey(true)
            } else {
              setHasApiKey(false)
            }
          }
        } else {
          setHasApiKey(false)
        }
      } catch {
        setHasApiKey(false)
      } finally {
        setIsLoadingConfig(false)
      }
    }
    void fetchModelConfig()
  }, [])

  // Keep internal athlete selection in sync when the page provides one via props
  useEffect(() => {
    if (!athleteId) return
    void Promise.resolve().then(() => {
      setSelectedAthleteId(athleteId)
      setSelectedAthleteName(athleteName)
    })
  }, [athleteId, athleteName])

  // GDPR: Check athlete consent when an athlete is selected
  useEffect(() => {
    void Promise.resolve().then(async () => {
      if (!selectedAthleteId) {
        setAthleteConsentStatus(null)
        return
      }
      setAthleteConsentStatus('loading')
      try {
        const response = await fetch(`/api/agent/consent?clientId=${selectedAthleteId}`)
        const data = await response.json()
        setAthleteConsentStatus(data.hasRequiredConsent ? 'granted' : 'none')
      } catch {
        setAthleteConsentStatus('none')
      }
    })
  }, [selectedAthleteId])

  // Build page context string for the AI
  const buildPageContextString = useCallback(() => {
    if (!pageContext || !isContextEnabled) return ''

    let contextStr = copy.currentPageContext(pageContext.title)

    if (pageContext.summary) {
      contextStr += `\n${pageContext.summary}\n`
    }

    if (pageContext.type === 'video-analysis') {
      // Check if this is a list of analyses or a single analysis
      const data = pageContext.data as {
        // Single analysis fields
        videoType?: string
        exerciseName?: string
        formScore?: number
        issues?: Array<{ issue: string; severity: string; description: string }>
        recommendations?: Array<{ recommendation: string; explanation: string }>
        aiAnalysis?: string
        poseAnalysis?: {
          interpretation?: string
          technicalFeedback?: Array<{ area: string; observation: string; suggestion: string }>
          patterns?: Array<{ pattern: string; significance: string }>
          recommendations?: Array<{ title: string; description: string }>
          overallAssessment?: string
          score?: number
        }
        // List of analyses fields
        totalAnalyses?: number
        completedCount?: number
        analyses?: Array<{
          id: string
          videoType: string
          status: string
          formScore: number | null
          athleteName: string
          exerciseName: string
          issuesDetected: Array<{ issue: string; severity: string; description: string }>
          recommendations: Array<{ priority: number; recommendation: string; explanation: string }>
          aiAnalysis: string | null
          createdAt: string
        }>
      }

      // Handle list of analyses from VideoAnalysisList
      if (data.analyses && Array.isArray(data.analyses)) {
        contextStr += `\n${copy.videoContextTotal(data.totalAnalyses, data.completedCount)}\n`

        data.analyses.forEach((analysis, idx) => {
          contextStr += `\n### Video ${idx + 1}: ${analysis.exerciseName}\n`
          // GDPR: Use pseudonym instead of real name in AI context
          contextStr += `- **${copy.athletePseudonym}**: ${copy.athletePseudonym}\n`
          contextStr += `- **${copy.type}**: ${analysis.videoType}\n`
          contextStr += `- **${copy.status}**: ${analysis.status}\n`
          if (analysis.formScore) contextStr += `- **${copy.score}**: ${analysis.formScore}/100\n`

          if (analysis.issuesDetected && analysis.issuesDetected.length > 0) {
            contextStr += `\n**${copy.issues}:**\n`
            analysis.issuesDetected.forEach((issue, i) => {
              contextStr += `  ${i + 1}. ${issue.issue} (${issue.severity}): ${issue.description}\n`
            })
          }

          if (analysis.recommendations && analysis.recommendations.length > 0) {
            contextStr += `\n**${copy.recommendations}:**\n`
            analysis.recommendations.forEach((rec, i) => {
              contextStr += `  ${i + 1}. ${rec.recommendation}: ${rec.explanation}\n`
            })
          }
        })
      } else {
        // Handle single analysis (original logic)
        if (data.videoType) contextStr += `- **${copy.type}**: ${data.videoType}\n`
        if (data.exerciseName) contextStr += `- **${copy.exercise}**: ${data.exerciseName}\n`
        if (data.formScore) contextStr += `- **${copy.score}**: ${data.formScore}/100\n`

        if (data.issues && data.issues.length > 0) {
          contextStr += `\n### ${copy.identifiedIssues}:\n`
          data.issues.forEach((issue, i) => {
            contextStr += `${i + 1}. **${issue.issue}** (${issue.severity}): ${issue.description}\n`
          })
        }

        if (data.recommendations && data.recommendations.length > 0) {
          contextStr += `\n### ${copy.recommendations}:\n`
          data.recommendations.forEach((rec, i) => {
            contextStr += `${i + 1}. **${rec.recommendation}**: ${rec.explanation}\n`
          })
        }

        if (data.poseAnalysis) {
          const pose = data.poseAnalysis
          contextStr += `\n### ${copy.poseAnalysis}:\n`
          if (pose.score) contextStr += `- **${copy.aiScore}**: ${pose.score}/100\n`
          if (pose.interpretation) contextStr += `- **${copy.interpretation}**: ${pose.interpretation}\n`

          if (pose.technicalFeedback && pose.technicalFeedback.length > 0) {
            contextStr += `\n**${copy.technicalFeedback}:**\n`
            pose.technicalFeedback.forEach((fb, i) => {
              contextStr += `${i + 1}. ${fb.area}: ${fb.observation} → ${fb.suggestion}\n`
            })
          }

          if (pose.patterns && pose.patterns.length > 0) {
            contextStr += `\n**${copy.patterns}:**\n`
            pose.patterns.forEach((p, i) => {
              contextStr += `${i + 1}. ${p.pattern}: ${p.significance}\n`
            })
          }

          if (pose.overallAssessment) {
            contextStr += `\n**${copy.overallAssessment}**: ${pose.overallAssessment}\n`
          }
        }
      }
    } else {
      // Generic data dump for other context types
      if (Object.keys(pageContext.data || {}).length > 0) {
        contextStr += `\n\`\`\`json\n${JSON.stringify(pageContext.data, null, 2)}\n\`\`\`\n`
      }
    }

    // Append concept definitions when conceptKeys are available
    if (pageContext.conceptKeys && pageContext.conceptKeys.length > 0) {
      const entries = getInfoEntriesByKeys(pageContext.conceptKeys, locale)
      if (entries.length > 0) {
        contextStr += locale === 'sv'
          ? `\n### Relevanta begrepp på denna sida:\n`
          : `\n### Relevant concepts on this page:\n`
        for (const entry of entries) {
          contextStr += `\n**${entry.title}**: ${entry.detailed}\n`
        }
      }
    }

    // Append scroll-aware visible card concepts (not already in conceptKeys)
    if (visibleConcepts && visibleConcepts.size > 0) {
      const existingKeys = new Set(pageContext.conceptKeys || [])
      const extraKeys = [...visibleConcepts].filter(k => !existingKeys.has(k))
      if (extraKeys.length > 0) {
        const extraEntries = getInfoEntriesByKeys(extraKeys, locale)
        if (extraEntries.length > 0) {
          contextStr += locale === 'sv'
            ? `\n### Användaren tittar just nu på:\n`
            : `\n### The user is currently looking at:\n`
          for (const entry of extraEntries) {
            contextStr += `- **${entry.title}**: ${entry.short}\n`
          }
        }
      }
    }

    return contextStr
  }, [copy, pageContext, isContextEnabled, visibleConcepts, locale])

  // Ref to store the current context string - updated when context changes
  const contextStringRef = useRef('')
  useEffect(() => {
    contextStringRef.current = buildPageContextString()
  }, [buildPageContextString])

  const startRealtimeVoice = useCallback(async () => {
    if (isRealtimeVoiceConnecting || isRealtimeVoiceActive) return
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      const message = copy.liveVoiceUnsupported
      addAssistantNotice(message)
      toast({
        title: copy.liveVoiceUnsupported,
        description: copy.modernBrowser,
        variant: 'destructive',
      })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = copy.missingMicrophone
      addAssistantNotice(message)
      toast({
        title: copy.missingMicrophoneTitle,
        description: copy.allowMicrophone,
        variant: 'destructive',
      })
      return
    }

    stopAssistantSpeech()
    cancelVoiceAutoSend()
    setIsRealtimeVoiceConnecting(true)
    setRealtimeVoiceStatus(copy.startingLiveVoice)

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
          setRealtimeVoiceStatus(copy.liveVoiceActiveConfirm)
        }
        if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
          stopRealtimeVoice(copy.liveVoiceDisconnected, 'disconnected')
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
        setRealtimeVoiceStatus(copy.liveVoiceListening)
      }
      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; error?: { message?: string } }
          addRealtimeUsageFromEvent(realtimeUsageRef.current, data)
          if (data.type === 'error') {
            const message = data.error?.message || copy.liveVoiceUnknownError
            setRealtimeVoiceStatus(message)
            addAssistantNotice(copy.liveVoiceCouldNotContinue(message))
          } else if (data.type === 'response.audio_transcript.done') {
            setRealtimeVoiceStatus(copy.liveVoiceAnswered)
          } else if (data.type === 'input_audio_buffer.speech_started') {
            setRealtimeVoiceStatus(copy.liveVoiceListeningEllipsis)
          } else if (data.type === 'input_audio_buffer.speech_stopped') {
            setRealtimeVoiceStatus(copy.processingLiveVoice)
          }
        } catch {
          // Ignore non-JSON realtime diagnostics.
        }
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      if (!offer.sdp) {
        throw new Error(copy.webRtcOfferFailed)
      }

      const response = await fetch('/api/ai/chat/realtime-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: offer.sdp,
          isAthleteChat: isAthleteUser,
          businessSlug: pathBusinessSlug,
          pageContext: contextStringRef.current,
          mode: isAthleteUser ? 'athlete_support' : 'coach_operator',
        }),
      })
      const answerSdp = await response.text()
      if (!response.ok) {
        let message = copy.openAiLiveVoiceFailed
        try {
          const parsed = JSON.parse(answerSdp) as { error?: string }
          message = parsed.error || message
        } catch {
          if (answerSdp.trim()) message = answerSdp.trim()
        }
        throw new Error(message)
      }

      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      setRealtimeVoiceStatus(copy.connectingLiveVoice)
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.liveVoiceStartFailed
      stopRealtimeVoice(message, 'error')
      addAssistantNotice(copy.liveVoiceStartNotice(message))
      toast({
        title: copy.liveVoiceStartToastTitle,
        description: message,
        variant: 'destructive',
      })
    }
  }, [
    addAssistantNotice,
    cancelVoiceAutoSend,
    copy,
    isAthleteUser,
    isRealtimeVoiceActive,
    isRealtimeVoiceConnecting,
    pathBusinessSlug,
    stopAssistantSpeech,
    stopRealtimeVoice,
    toast,
  ])

  const toggleRealtimeVoice = useCallback(() => {
    if (isRealtimeVoiceActive || isRealtimeVoiceConnecting) {
      stopRealtimeVoice(copy.liveVoiceOff, 'user_stopped')
      return
    }
    void startRealtimeVoice()
  }, [
    copy.liveVoiceOff,
    isRealtimeVoiceActive,
    isRealtimeVoiceConnecting,
    startRealtimeVoice,
    stopRealtimeVoice,
  ])

  // Manual input state (AI SDK 5 no longer manages input state)
  const [input, setInput] = useState('')

  // Track auto-retrieved knowledge skills
  const [knowledgeSkills, setKnowledgeSkills] = useState<string[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])

  // Custom fetch to capture X-Knowledge-Skills header from streaming response
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
    return response
  }, [])

  // Vercel AI SDK useChat hook with dynamic model (v5 API)
  // Note: All dynamic values are passed via sendMessage options
  // because DefaultChatTransport body is captured at initialization time
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
      addAssistantNotice(copy.requestFailedNotice(error.message))
      toast({
        title: copy.sendErrorTitle,
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Lazily fetch athlete options the first time the picker is opened
  const fetchAthleteOptions = useCallback(async () => {
    if (athleteOptions || isLoadingAthletes) return
    setIsLoadingAthletes(true)
    try {
      const response = await fetch('/api/clients?limit=200')
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        setAthleteOptions(
          (data.data as Array<{ id: string; name: string }>).map((client) => ({
            id: client.id,
            name: client.name,
          }))
        )
      } else {
        setAthleteOptions([])
      }
    } catch {
      setAthleteOptions([])
      toast({
        title: copy.athletesLoadError,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingAthletes(false)
    }
  }, [athleteOptions, copy.athletesLoadError, isLoadingAthletes, toast])

  const filteredAthleteOptions = useMemo(() => {
    if (!athleteOptions) return []
    const query = athleteSearch.trim().toLowerCase()
    if (!query) return athleteOptions
    return athleteOptions.filter((athlete) => athlete.name.toLowerCase().includes(query))
  }, [athleteOptions, athleteSearch])

  const applyAthleteSelection = useCallback((athlete: { id: string; name?: string } | null) => {
    setIsAthletePickerOpen(false)
    setAthleteSearch('')
    if ((athlete?.id ?? undefined) === selectedAthleteId) return
    setSelectedAthleteId(athlete?.id)
    setSelectedAthleteName(athlete?.name || undefined)
    // The athlete context changes the system prompt — start a fresh conversation
    setMessages([])
    setAssistantNotices([])
    setConversationId(null)
    setDetectedProgram(null)
    spokenAssistantMessageIdsRef.current.clear()
    spokenAssistantNoticeIdsRef.current.clear()
  }, [selectedAthleteId, setMessages])

  const handleLoadConversation = useCallback(async (loadConversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${loadConversationId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || copy.loadConversationErrorTitle)
      }

      // Convert to useChat format (AI SDK v5 uses parts array)
      const chatMessages = (data.messages || []).map((msg: { id: string; role: string; content: string; createdAt?: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        parts: [{ type: 'text' as const, text: msg.content || '' }],
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      }))

      // Loaded history should not be read aloud by the spoken-replies effect
      for (const msg of chatMessages) {
        if (msg.role === 'assistant') {
          spokenAssistantMessageIdsRef.current.add(msg.id)
        }
      }

      setMessages(chatMessages)
      setConversationId(loadConversationId)
      setAssistantNotices([])
      setDetectedProgram(null)

      // Restore the conversation's athlete context
      if (data.conversation?.athleteId) {
        setSelectedAthleteId(data.conversation.athleteId)
        setSelectedAthleteName(data.conversation.athlete?.name ?? undefined)
      } else {
        setSelectedAthleteId(undefined)
        setSelectedAthleteName(undefined)
      }

      setIsHistoryOpen(false)
    } catch (error) {
      toast({
        title: copy.loadConversationErrorTitle,
        description: error instanceof Error ? error.message : copy.unexpectedError,
        variant: 'destructive',
      })
    }
  }, [copy.loadConversationErrorTitle, copy.unexpectedError, setMessages, toast])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, assistantNotices])

  // Detect programs in assistant messages
  useEffect(() => {
    if (!messages.length || isLoading) return
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return

    const textContent = getMessageTextContent(lastMessage.parts)

    if (!textContent || textContent.length < 100) return

    void Promise.resolve().then(() => {
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
    })
  }, [messages, isLoading])

  useEffect(() => {
    if (isLoading || !messages.length) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return
    if (spokenAssistantMessageIdsRef.current.has(lastMessage.id)) return

    const textContent = getMessageTextContent(lastMessage.parts)
    const toolOnlyStatusMessage = textContent
      ? null
      : getToolOnlyStatusMessage(lastMessage.role, lastMessage.parts, locale)
    const replyText = textContent || toolOnlyStatusMessage || ''

    spokenAssistantMessageIdsRef.current.add(lastMessage.id)
    void speakAssistantReply(replyText)
  }, [isLoading, locale, messages, speakAssistantReply])

  useEffect(() => {
    if (!assistantNotices.length) return
    const latestNotice = assistantNotices[assistantNotices.length - 1]
    if (spokenAssistantNoticeIdsRef.current.has(latestNotice.id)) return

    spokenAssistantNoticeIdsRef.current.add(latestNotice.id)
    void speakAssistantReply(latestNotice.content)
  }, [assistantNotices, speakAssistantReply])

  async function handlePublishProgram() {
    if (!detectedProgram?.program) return
    if (!selectedAthleteId) {
      toast({
        title: copy.noAthleteTitle,
        description: copy.noAthleteDescription,
        variant: 'destructive',
      })
      return
    }
    setIsPublishing(true)
    try {
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
          clientId: selectedAthleteId,
          conversationId,
        }),
      })

      if (response.ok) {
        toast({
          title: copy.programSavedTitle,
          description: copy.programSavedDescription(detectedProgram.program.name),
        })
        setDetectedProgram(null)
      } else {
        const data = await response.json()
        toast({
          title: copy.saveProgramErrorTitle,
          description: data.error || copy.tryAgainLater,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: copy.saveErrorTitle,
        description: copy.unexpectedError,
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

  useEffect(() => {
    function handleCoachChatIntent(event: Event) {
      const detail = (event as CustomEvent<CoachFloatingChatEvent>).detail
      if (!detail?.message) return
      cancelVoiceAutoSend()
      if (detail.open !== false) {
        setIsOpen(true)
      }
      if (detail.athleteId) {
        applyAthleteSelection({ id: detail.athleteId, name: detail.athleteName })
      }
      setInput(detail.message)
    }

    window.addEventListener(COACH_FLOATING_CHAT_EVENT, handleCoachChatIntent)
    return () => window.removeEventListener(COACH_FLOATING_CHAT_EVENT, handleCoachChatIntent)
  }, [applyAthleteSelection, cancelVoiceAutoSend])

  const sendChatMessage = useCallback(async (message: string) => {
    const messageContent = message.trim()
    if (!messageContent || isLoading) return
    if (!modelConfig) {
      addAssistantNotice(copy.modelLoadingNotice)
      return
    }
    setAssistantNotices([])

    let nextConversationId = conversationId
    if (!nextConversationId) {
      try {
        const response = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelUsed: modelConfig.model,
            provider: modelConfig.provider,
            athleteId: selectedAthleteId,
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
    void sendMessage({ text: messageContent }, {
      body: {
        conversationId: nextConversationId,
        model: modelConfig.model,
        provider: modelConfig.provider,
        athleteId: selectedAthleteId,
        documentIds: [],
        webSearchEnabled: false,
        pageContext: contextStringRef.current,
        businessSlug: pathBusinessSlug,
        selectedSkillIds,
      },
    })
  }, [
    addAssistantNotice,
    conversationId,
    copy.modelLoadingNotice,
    isLoading,
    modelConfig,
    pathBusinessSlug,
    selectedAthleteId,
    selectedSkillIds,
    sendMessage,
  ])

  const scheduleVoiceAutoSend = useCallback((message: string) => {
    cancelVoiceAutoSend()
    setIsVoiceAutoSendPending(true)
    voiceAutoSendTimeoutRef.current = setTimeout(() => {
      voiceAutoSendTimeoutRef.current = null
      setIsVoiceAutoSendPending(false)
      void sendChatMessage(message)
    }, 2000)
  }, [cancelVoiceAutoSend, sendChatMessage])

  const transcribeVoiceBlob = useCallback(async (audioBlob: Blob): Promise<string> => {
    setIsTranscribingVoice(true)
    try {
      const formData = new FormData()
      const extension = getVoiceFileExtension(audioBlob.type)
      formData.append('audio', audioBlob, `floating-chat-voice.${extension}`)
      formData.append('isAthleteChat', String(isAthleteUser))
      if (pathBusinessSlug) {
        formData.append('businessSlug', pathBusinessSlug)
      }

      const response = await fetch('/api/ai/chat/transcribe-audio', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || copy.transcribeError)
      }

      const text = typeof data.text === 'string' ? data.text.trim() : ''
      if (!text) {
        throw new Error(copy.noSpeechHeard)
      }
      return text
    } finally {
      setIsTranscribingVoice(false)
    }
  }, [copy.noSpeechHeard, copy.transcribeError, isAthleteUser, pathBusinessSlug])

  async function handleVoiceButtonClick() {
    if (isVoiceRecording) {
      stopRecording()
      return
    }

    if (isTranscribingVoice || voiceRecordingPromiseRef.current) return
    cancelVoiceAutoSend()

    if (!isVoiceSupported) {
      const message = copy.voiceInputUnsupported
      addAssistantNotice(message)
      toast({
        title: copy.voiceInputUnsupported,
        description: copy.modernBrowser,
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
        throw new Error(copy.noMicrophoneAudio)
      }

      const transcript = await transcribeVoiceBlob(audioBlob)
      const trimmedInput = input.trim()
      const nextInputValue = trimmedInput ? `${trimmedInput}\n${transcript}` : transcript
      setInput(nextInputValue)
      textareaRef.current?.focus()
      if (isVoiceAutoSendEnabled) {
        scheduleVoiceAutoSend(nextInputValue)
        toast({
          title: copy.voiceTranscribedTitle,
          description: copy.voiceAutoSendDescription,
        })
      } else {
        toast({
          title: copy.voiceTranscribedTitle,
          description: copy.voicePlacedDescription,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.voiceHandlingError
      addAssistantNotice(copy.voiceUseErrorNotice(message))
      toast({
        title: copy.voiceUseErrorTitle,
        description: message,
        variant: 'destructive',
      })
    } finally {
      if (voiceRecordingPromiseRef.current === recordingPromise) {
        voiceRecordingPromiseRef.current = null
      }
    }
  }

  // Send initial message if provided
  useEffect(() => {
    if (isOpen && initialMessage && messages.length === 0) {
      void Promise.resolve().then(() => setInput(initialMessage))
    }
  }, [isOpen, initialMessage, messages.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    cancelVoiceAutoSend()
    await sendChatMessage(input)
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
    setSelectedSkillIds([])
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
    setSelectedSkillIds([])
    spokenAssistantMessageIdsRef.current.clear()
    spokenAssistantNoticeIdsRef.current.clear()
  }

  const capabilityQuickPrompt = useMemo<QuickPrompt>(() => ({
    label: copy.whatCanYouDo,
    prompt: buildAiCapabilityDiscoveryPrompt({
      role: 'COACH',
      locale,
      operationsEnabled: capabilitySnapshot?.operationsEnabled ?? false,
      capabilities: capabilitySnapshot?.capabilities ?? [],
      pageTitle: hasContext && isContextEnabled ? pageContext?.title : null,
    }),
  }), [
    capabilitySnapshot,
    copy.whatCanYouDo,
    hasContext,
    isContextEnabled,
    locale,
    pageContext?.title,
  ])

  const contextualQuickPrompts = useMemo<QuickPrompt[]>(() => {
    if (!pageContext || !hasContext || !isContextEnabled) return []

    if (pageContext.type === 'video-analysis') {
      return [
        {
          label: copy.explainIssues,
          prompt: copy.explainIssuesPrompt,
        },
        {
          label: copy.improvementExercises,
          prompt: copy.improvementExercisesPrompt,
        },
        {
          label: copy.simpleSummary,
          prompt: copy.simpleSummaryPrompt,
        },
      ]
    }

    if (pageContext.type === 'coach-dashboard') {
      const operatorPrompt: QuickPrompt | null = operatorContext
        ? {
            label: operatorAttentionCount > 0 ? copy.operatorBrief : copy.weeklySummary,
            prompt: operatorAttentionCount > 0
              ? copy.operatorBriefPrompt
              : copy.weeklySummaryPrompt,
          }
        : null

      return [
        ...(operatorPrompt ? [operatorPrompt] : []),
        {
          label: copy.summarize,
          prompt: copy.summarizeDashboardPrompt,
        },
        {
          label: copy.whatNeedsAction,
          prompt: copy.whatNeedsActionPrompt,
        },
        {
          label: copy.explainCards,
          prompt: copy.explainCardsPrompt,
        },
      ]
    }

    return [
      {
        label: copy.summarizePage,
        prompt: copy.summarizePagePrompt,
      },
      {
        label: copy.nextSteps,
        prompt: copy.nextStepsPrompt,
      },
      {
        label: copy.explainConcepts,
        prompt: copy.explainConceptsPrompt,
      },
    ]
  }, [copy, pageContext, hasContext, isContextEnabled, operatorContext, operatorAttentionCount])

  // Get provider color for badge
  function getProviderBadge() {
    if (!modelConfig) return null
    const colors = {
      ANTHROPIC: 'bg-white/95 text-orange-700 border-white/30',
      GOOGLE: 'bg-white/95 text-blue-700 border-white/30',
      OPENAI: 'bg-white/95 text-emerald-700 border-white/30',
    }
    const names = {
      ANTHROPIC: 'Claude',
      GOOGLE: 'Gemini',
      OPENAI: 'GPT',
    }
    return (
      <Badge
        variant="secondary"
        className={cn('shrink-0 border text-[11px] font-semibold shadow-sm', colors[modelConfig.provider])}
      >
        {names[modelConfig.provider]}
      </Badge>
    )
  }

  const voiceStatusMessage = isVoiceRecording
    ? copy.recording(formatVoiceDuration(voiceDuration))
    : isTranscribingVoice
      ? copy.transcribingVoiceMessage
      : voiceRecorderError
        ? voiceRecorderError
        : null
  const voiceButtonLabel = isVoiceRecording
    ? copy.stopRecording
    : isTranscribingVoice
      ? copy.transcribingVoice
      : copy.startVoiceInput
  const spokenRepliesLabel = isSpokenRepliesEnabled
    ? copy.turnOffSpokenReplies
    : copy.turnOnSpokenReplies
  const voiceAutoSendLabel = isVoiceAutoSendEnabled
    ? copy.turnOffAutoSend
    : copy.turnOnAutoSend
  const voiceOperatorModeLabel = isVoiceOperatorModeEnabled
    ? copy.turnOffVoiceOperator
    : copy.turnOnVoiceOperator
  const realtimeVoiceLabel = isRealtimeVoiceActive || isRealtimeVoiceConnecting
    ? copy.turnOffLiveVoice
    : copy.startLiveVoice

  // Floating button (always visible)
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        onMouseUp={handleActivatorClick}
        onPointerDown={handleButtonDragStart}
        style={buttonFloatingStyle}
        data-floating-chat-root
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 z-50 fixed-bottom-safe touch-none cursor-grab active:cursor-grabbing"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
        {operatorAttentionCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-semibold text-white">
            {operatorAttentionCount > 9 ? '9+' : operatorAttentionCount}
          </span>
        )}
      </Button>
    )
  }

  // Loading config
  if (isLoadingConfig) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          'bottom-6 right-6 w-[380px] h-[200px]'
        )}
        style={panelFloatingStyle}
        data-floating-chat-root
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">{copy.assistant}</span>
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

  // No API key configured
  if (hasApiKey === false) {
    return (
      <div
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
          isExpanded
            ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px]'
            : 'bottom-6 right-6 w-[380px] h-[500px]'
        )}
        style={!isExpanded ? panelFloatingStyle : undefined}
        data-floating-chat-root
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">{copy.assistant}</span>
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
            <h3 className="font-semibold mb-2">
              {isAthleteUser ? copy.athleteAssistantUnavailable : copy.apiKeyMissingTitle}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isAthleteUser
                ? copy.athleteAssistantUnavailableDescription
                : copy.configureApiKeyDescription}
            </p>
            {!isAthleteUser && (
              <Button asChild>
                <Link href={`${basePath}/coach/settings/ai`}>
                  <Settings className="h-4 w-4 mr-2" />
                  {copy.goToSettings}
                </Link>
              </Button>
            )}
          </div>
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
          ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px]'
          : 'bottom-6 right-6 w-[380px] h-[500px]'
      )}
      style={!isExpanded ? panelFloatingStyle : undefined}
      data-floating-chat-root
    >
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
        <div className="flex items-center justify-between gap-2 p-3 pb-2">
          <div
            onPointerDown={!isExpanded ? handlePanelDragStart : undefined}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2 touch-none',
              !isExpanded && 'cursor-grab active:cursor-grabbing'
            )}
          >
            <Bot className="h-5 w-5 shrink-0 text-white" />
            <span className="truncate font-semibold text-white">{copy.assistant}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsHistoryOpen(true)}
              className="h-8 w-8 text-white hover:bg-white/20"
              title={copy.chatHistory}
              aria-label={copy.chatHistory}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="h-8 w-8 text-white hover:bg-white/20"
              title={copy.newConversation}
              aria-label={copy.newConversation}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-white hover:bg-white/20"
              title={isExpanded ? copy.minimizeChat : copy.expandChat}
              aria-label={isExpanded ? copy.minimizeChat : copy.expandChat}
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
              title={copy.closeChat}
              aria-label={copy.closeChat}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {getProviderBadge()}
            <Popover
              open={isAthletePickerOpen}
              onOpenChange={(open) => {
                setIsAthletePickerOpen(open)
                if (open) void fetchAthleteOptions()
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-white/25"
                  title={copy.selectAthlete}
                  aria-label={copy.selectAthlete}
                >
                  <User className="h-3 w-3 shrink-0" />
                  <span className="max-w-[110px] truncate">
                    {selectedAthleteName || (selectedAthleteId ? copy.athleteContext : copy.selectAthlete)}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start" side="bottom">
                <Input
                  placeholder={copy.searchAthletes}
                  value={athleteSearch}
                  onChange={(e) => setAthleteSearch(e.target.value)}
                  className="mb-2 h-8 text-xs"
                />
                <div className="max-h-56 overflow-y-auto">
                  {selectedAthleteId && (
                    <button
                      type="button"
                      onClick={() => applyAthleteSelection(null)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{copy.clearAthleteContext}</span>
                    </button>
                  )}
                  {isLoadingAthletes ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredAthleteOptions.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                      {copy.noAthletesFound}
                    </p>
                  ) : (
                    filteredAthleteOptions.map((athlete) => (
                      <button
                        key={athlete.id}
                        type="button"
                        onClick={() => applyAthleteSelection(athlete)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                          athlete.id === selectedAthleteId && 'bg-muted'
                        )}
                      >
                        <span className="flex-1 truncate">{athlete.name}</span>
                        {athlete.id === selectedAthleteId && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <VoiceModesGuide className="h-7 w-7" />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRealtimeVoice}
              disabled={isTranscribingVoice || isVoiceRecording}
              className={cn(
                'h-7 w-7 text-white hover:bg-white/20',
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
                'h-7 w-7 text-white hover:bg-white/20',
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
                'h-7 w-7 text-white hover:bg-white/20',
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
                'h-7 w-7 text-white hover:bg-white/20',
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
          </div>
        </div>
      </div>

      {/* Context indicator with toggle */}
      {hasContext && (
        <button
          onClick={() => setIsContextEnabled(!isContextEnabled)}
          className={cn(
            'w-full px-3 py-2 border-b text-xs flex items-center justify-between gap-2 transition-colors',
            isContextEnabled
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3" />
            <span>{pageContext?.title || copy.sideContext}</span>
          </div>
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
            isContextEnabled
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-muted text-muted-foreground'
          )}>
            {isContextEnabled ? (
              <>
                <Check className="h-3 w-3" />
                {copy.active}
              </>
            ) : (
              copy.inactive
            )}
          </div>
        </button>
      )}

      {/* GDPR: Warning when athlete hasn't consented */}
      {selectedAthleteId && athleteConsentStatus === 'none' && (
        <div className="px-3 py-2 border-b bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{copy.consentMissing}</span>
        </div>
      )}

      {isVoiceOperatorModeEnabled && (
        <div className="px-3 py-2 border-b bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Headphones className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{copy.voiceOperatorBanner}</span>
          </div>
          <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium">
            {copy.confirmsActions}
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
              onClick={() => stopRealtimeVoice(copy.liveVoiceOff, 'user_stopped')}
              className="h-6 px-2 text-xs hover:bg-emerald-500/10"
            >
              {copy.stop}
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && assistantNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">{copy.howCanIHelp}</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {hasContext && isContextEnabled
                ? copy.hasContext(pageContext?.title || copy.sideContext)
                : hasContext && !isContextEnabled
                ? copy.contextDisabled
                : copy.defaultEmpty}
            </p>
            {showVoiceGuideCard && (
              <VoiceModesGuide
                variant="card"
                onDismiss={dismissVoiceGuideCard}
                onStartVoiceOperator={startVoiceOperatorFromGuide}
                className="mt-4 w-full max-w-[320px]"
              />
            )}
            {operatorContext && (
              <div className="mt-4 w-full rounded-lg border bg-muted/40 p-3 text-left">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  Coachoperator
                </div>
                <p className="text-xs text-muted-foreground">
                  {operatorContext.headline || copy.operatorActive}
                </p>
                {operatorContext.focusAreas && operatorContext.focusAreas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {operatorContext.focusAreas.slice(0, 3).map(area => (
                      <Badge key={area} variant="secondary" className="text-[10px]">
                        {area}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Quick prompts */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInput(capabilityQuickPrompt.prompt)}
                className="text-xs"
              >
                {capabilityQuickPrompt.label}
              </Button>
              {contextualQuickPrompts.map((quickPrompt) => (
                <Button
                  key={quickPrompt.label}
                  variant="secondary"
                  size="sm"
                  onClick={() => setInput(quickPrompt.prompt)}
                  className="text-xs"
                >
                  {quickPrompt.label}
                </Button>
              ))}
              {!pageContext && selectedAthleteName && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput(copy.analyzeTrainingPrompt(selectedAthleteName))}
                    className="text-xs"
                  >
                    {copy.analyzeTraining}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput(copy.createProgramPrompt(selectedAthleteName))}
                    className="text-xs"
                  >
                    {copy.createProgram}
                  </Button>
                </>
              )}
              {!pageContext && !selectedAthleteName && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput(copy.tenKPrompt)}
                    className="text-xs"
                  >
                    10K-program
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput(copy.thresholdPrompt)}
                    className="text-xs"
                  >
                    {copy.trainingZones}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              // AI SDK 5: Extract text from message parts
              const textContent = getMessageTextContent(message.parts)
              const toolOnlyStatusMessage = textContent || isLoading
                ? null
                : getToolOnlyStatusMessage(message.role, message.parts, locale)
              const navigationToolPart = (message.parts as ToolOutputPart[] | undefined)?.find(
                part => part.type === 'tool-suggestCoachNavigation' && part.state === 'output-available'
              )
              const navigationResult = navigationToolPart?.output as ChatNavigationResult | undefined
              const actionToolPart = (message.parts as ToolOutputPart[] | undefined)?.find(
                part => part.state === 'output-available' &&
                  (
                    part.type === 'tool-prepareCoachMessageDraft' ||
                    (isToolStatusOutput(part.output) &&
                      typeof (part.output as { action?: { type?: unknown } }).action === 'object')
                  )
              )
              const actionResult = actionToolPart?.output as ChatActionResult | undefined
              return (
                <div key={message.id}>
                  {(textContent || toolOnlyStatusMessage) && (
                    <ChatMessage
                      message={{
                        id: message.id,
                        role: message.role as 'user' | 'assistant' | 'system',
                        content: textContent || toolOnlyStatusMessage || '',
                        createdAt: new Date(),
                      }}
                      athleteId={selectedAthleteId}
                      athleteName={selectedAthleteName}
                      conversationId={conversationId}
                    />
                  )}
                  {navigationResult?.success && (
                    <ChatNavigationCard result={navigationResult} basePath={basePath} />
                  )}
                  {actionResult?.success && (
                    <ChatActionCard result={actionResult} businessSlug={pathBusinessSlug} basePath={basePath} />
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
                athleteId={selectedAthleteId}
                athleteName={selectedAthleteName}
                conversationId={conversationId}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
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
        <div className="px-3 py-2 border-t bg-primary/10 border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">
                  {detectedProgram.program.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {detectedProgram.program.totalWeeks} {copy.weeks}
                  {!selectedAthleteId && ` - ${copy.chooseAthleteToSave}`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handlePublishProgram}
              disabled={isPublishing || !selectedAthleteId}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2 shrink-0"
            >
              {isPublishing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              {copy.saveProgram}
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="space-y-2">
          {!isLoadingConfig && !isAthleteUser && (
            <AISkillPicker
              selectedSkillIds={selectedSkillIds}
              onSelectedSkillIdsChange={setSelectedSkillIds}
              disabled={isLoading}
              side="top"
              align="start"
              triggerClassName="h-8 text-xs"
              chipsClassName="max-w-full"
            />
          )}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                cancelVoiceAutoSend()
                setInput(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              placeholder={copy.inputPlaceholder}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
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
              disabled={!input.trim() || isLoading || isVoiceRecording || isTranscribingVoice}
              className="h-auto px-3"
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
              <span>{copy.voiceAutoSendSoon}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelVoiceAutoSend}
                className="h-6 px-2 text-xs hover:bg-blue-500/10"
              >
                {copy.cancel}
              </Button>
            </div>
          )}
          {isSpokenRepliesEnabled && (isGeneratingAssistantAudio || isSpeakingAssistant || voicePlaybackStatus) && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {voicePlaybackStatus || (isSpeakingAssistant ? copy.readingReply : copy.generatingVoice)}
              <span className="ml-1">{copy.aiVoiceGenerated}</span>
            </div>
          )}
        </div>
      </form>

      {/* Chat history (Sheet renders in a portal above the panel) */}
      <ChatHistoryPanel
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        currentConversationId={conversationId}
        onLoadConversation={handleLoadConversation}
      />
    </div>
  )
}

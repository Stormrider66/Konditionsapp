'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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
  History,
  Lock,
  BookOpen,
  Save,
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
import { ChatMessage } from '@/components/ai-studio/ChatMessage'
import { ChatHistoryPanel } from '@/components/ai-studio/ChatHistoryPanel'
import { ChatActionCard, type ChatActionResult } from '@/components/ai-studio/ChatActionCard'
import {
  formatVoiceDuration,
  getMessageTextContent,
} from '@/components/ai-studio/voice-helpers'
import { cn } from '@/lib/utils'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { getInfoEntriesByKeys } from '@/lib/info-content'
import { getAthleteQuickPrompts, MemoryContext } from '@/lib/ai/athlete-prompts'
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
import { AIChatUsageCompact } from '@/components/athlete/AIChatUsageMeter'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFloatingChatDrag } from '@/components/ai-studio/useFloatingChatDrag'
import {
  getAiAllowanceUpgradeMessage,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'
import { AiAllowanceBlockedAction } from '@/components/athlete/ai/AiAllowanceBlockedAction'
import { VoiceModesGuide } from '@/components/ai-studio/VoiceModesGuide'
import { useAthleteChatVoice } from './useAthleteChatVoice'
import {
  AthleteChatConsentPanel,
  AthleteChatLoadingPanel,
  AthleteChatNoAccessPanel,
  AthleteChatSubscriptionPanel,
} from './AthleteChatGateScreens'
import { AISkillPicker, type AISkillOption } from '@/components/ai/AISkillPicker'
import { useLocale, useTranslations } from '@/i18n/client'
import {
  buildAiCapabilityDiscoveryPrompt,
  type AiCapabilityDiscoveryItem,
  type AiCapabilityDiscoverySummary,
} from '@/lib/ai/capabilities/discovery'

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

interface AiCapabilitiesResponse {
  success?: boolean
  operationsEnabled?: boolean
  summary?: AiCapabilityDiscoverySummary
  capabilities?: AiCapabilityDiscoveryItem[]
}


function normalizeSkillName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function hasExplicitSkillSelectionRequest(message: string): boolean {
  const normalized = normalizeSkillName(message)
  return /\b(anvand|use|pull|hamta|plocka|dra in|koppla in)\b/.test(normalized)
    && /\b(skills?|kunskap|expert|metod|test|aterhamtning|nutrition|styrka)\b/.test(normalized)
}

export function AthleteFloatingChat({
  clientId,
  athleteName,
}: AthleteFloatingChatProps) {
  const t = useTranslations('components.athleteFloatingChat')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const quickPrompts = getAthleteQuickPrompts(undefined, locale)
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
  const pendingSkillSyncRequestRef = useRef(false)

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  // Assistant messages restored from history must not be read aloud
  const historyMessageIdsRef = useRef<Set<string>>(new Set())
  const [hasAIAccess, setHasAIAccess] = useState<boolean | null>(null)
  const [selectedIntent, setSelectedIntent] = useState<ModelIntent>('balanced')
  const [availableIntents, setAvailableIntents] = useState<IntentTierOption[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [availableSkills, setAvailableSkills] = useState<AISkillOption[]>([])
  const [capabilitySnapshot, setCapabilitySnapshot] = useState<{
    operationsEnabled: boolean
    capabilities: AiCapabilityDiscoveryItem[]
  } | null>(null)
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

  // Mental prep context (set when opened from MentalPrepCard)
  const [mentalPrepContext, setMentalPrepContext] = useState<MentalPrepChatEvent | null>(null)
  const mentalPrepContextRef = useRef<MentalPrepChatEvent | null>(null)





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
          title: t('consentSave.errorTitle'),
          description: t('common.tryAgainLater'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: t('consentSave.errorTitle'),
        description: t('common.unexpectedError'),
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

    let contextStr = locale === 'sv'
      ? `\n\n## AKTUELL SIDKONTEXT: ${pc.title}\n`
      : `\n\n## CURRENT PAGE CONTEXT: ${pc.title}\n`
    if (pc.summary) contextStr += `\n${pc.summary}\n`

    if (pc.conceptKeys && pc.conceptKeys.length > 0) {
      const entries = getInfoEntriesByKeys(pc.conceptKeys, locale)
      if (entries.length > 0) {
        contextStr += locale === 'sv' ? `\n### Relevanta begrepp:\n` : `\n### Relevant concepts:\n`
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
  }, [pageCtx?.pageContext, pageCtx?.visibleConcepts, locale])

  const pageContextRef = useRef('')
  useEffect(() => {
    pageContextRef.current = buildAthletePageContext()
  }, [buildAthletePageContext])

  // Manual input state
  const [input, setInput] = useState('')

  // Track auto-retrieved knowledge skills
  const [knowledgeSkills, setKnowledgeSkills] = useState<string[]>([])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function fetchAvailableSkills() {
      try {
        const response = await fetch('/api/ai/skills', { signal: controller.signal })
        const payload = await response.json().catch(() => null) as {
          success?: boolean
          data?: { skills?: AISkillOption[] }
        } | null
        if (!isMounted || !payload?.success || !payload.data?.skills) return
        setAvailableSkills(payload.data.skills)
      } catch {
        // The picker has its own loading/error state; this copy is only for voice/text sync.
      }
    }

    if (hasAIAccess) void fetchAvailableSkills()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [hasAIAccess])

  useEffect(() => {
    if (hasAIAccess !== true || consentStatus !== 'granted') {
      void Promise.resolve().then(() => setCapabilitySnapshot(null))
      return
    }

    let isMounted = true
    const controller = new AbortController()

    void Promise.resolve().then(async () => {
      try {
        const response = await fetch('/api/ai/capabilities?isAthleteChat=true', {
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
  }, [consentStatus, hasAIAccess])

  const capabilityQuickPrompt = useMemo(() => buildAiCapabilityDiscoveryPrompt({
    role: 'ATHLETE',
    locale,
    operationsEnabled: capabilitySnapshot?.operationsEnabled ?? false,
    capabilities: capabilitySnapshot?.capabilities ?? [],
    pageTitle: pageCtx?.pageContext?.title ?? null,
  }), [
    capabilitySnapshot,
    locale,
    pageCtx?.pageContext?.title,
  ])

  useEffect(() => {
    if (!pendingSkillSyncRequestRef.current || knowledgeSkills.length === 0 || availableSkills.length === 0) return

    const idsByName = new Map<string, string>()
    for (const skill of availableSkills) {
      idsByName.set(normalizeSkillName(skill.name), skill.id)
      if (skill.nameEn) idsByName.set(normalizeSkillName(skill.nameEn), skill.id)
    }

    const usedSkillIds = knowledgeSkills
      .map((skillName) => idsByName.get(normalizeSkillName(skillName)))
      .filter((id): id is string => Boolean(id))

    if (usedSkillIds.length > 0) {
      setSelectedSkillIds((current) => Array.from(new Set([...current, ...usedSkillIds])).slice(0, 5))
      pendingSkillSyncRequestRef.current = false
    }
  }, [availableSkills, knowledgeSkills])

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
          message: t('subscription.monthlyLimitReached'),
          upgradeUrl: '/athlete/subscription',
        })
        return
      }

      if (errorMessage.includes('AI_ALLOWANCE_EXHAUSTED') || errorMessage.includes('402')) {
        return
      }

      toast({
        title: t('send.errorTitle'),
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

    const message = buildMentalPrepMessage(mentalPrepContext, locale)

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

      const mentalPrepPageContext = buildMentalPrepPageContext(mentalPrepContext!, locale)

    void sendMessage({ text: message }, {
        body: {
          conversationId: convId,
          intent: selectedIntent,
          isAthleteChat: true,
          clientId,
          memoryContext: memoryContext || undefined,
          pageContext: mentalPrepPageContext,
          selectedSkillIds,
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
          title: t('programSave.savedTitle'),
          description: t('programSave.savedDescription', { name: detectedProgram.program.name }),
        })
        setDetectedProgram(null)
      } else {
        const data = await response.json()
        toast({
          title: t('programSave.errorTitle'),
          description: data.error || t('common.tryAgainLater'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: t('programSave.failureTitle'),
        description: t('common.unexpectedError'),
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
      addAssistantNotice(t('send.configNotReady'))
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
      ? buildMentalPrepPageContext(mentalPrepContextRef.current, locale)
      : ''
    const combinedPageContext = [pageContextRef.current, mentalPrepPageCtx]
      .filter(Boolean)
      .join('\n')
    pendingSkillSyncRequestRef.current = hasExplicitSkillSelectionRequest(messageContent)

    void sendMessage({ text: messageContent }, {
      body: {
        conversationId: nextConversationId,
        intent: selectedIntent,
        isAthleteChat: true, // This triggers athlete mode
        clientId,
        memoryContext: memoryContext || undefined,
        pageContext: combinedPageContext || undefined,
        selectedSkillIds,
      },
    })
  }, [
    addAssistantNotice,
    clientId,
    configReady,
    conversationId,
    isLoading,
    locale,
    memoryContext,
    selectedIntent,
    selectedSkillIds,
    sendMessage,
    t,
  ])

  const {
    isVoiceRecording,
    voiceDuration,
    voiceRecorderError,
    isTranscribingVoice,
    handleVoiceButtonClick,
    isSpokenRepliesEnabled,
    isSpeakingAssistant,
    isGeneratingAssistantAudio,
    voicePlaybackStatus,
    stopAssistantSpeech,
    toggleSpokenReplies,
    speakAssistantMessageOnce,
    speakAssistantNoticeOnce,
    resetSpokenTracking,
    isVoiceAutoSendEnabled,
    isVoiceAutoSendPending,
    isVoiceOperatorModeEnabled,
    showVoiceGuideCard,
    cancelVoiceAutoSend,
    toggleVoiceAutoSend,
    toggleVoiceOperatorMode,
    dismissVoiceGuideCard,
    startVoiceOperatorFromGuide,
    isRealtimeVoiceConnecting,
    isRealtimeVoiceActive,
    realtimeVoiceStatus,
    stopRealtimeVoice,
    toggleRealtimeVoice,
  } = useAthleteChatVoice({
    addAssistantNotice,
    sendChatMessage: sendAthleteChatMessage,
    getPageContext: () => pageContextRef.current,
    input,
    setInput,
    textareaRef,
  })

  // Speak new assistant replies and notices aloud (at most once each)
  useEffect(() => {
    if (isLoading || !messages.length) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return

    const textContent = getMessageTextContent(lastMessage.parts)
    if (!textContent) return
    if (historyMessageIdsRef.current.has(lastMessage.id)) return

    const timeout = window.setTimeout(() => {
      speakAssistantMessageOnce(lastMessage.id, textContent)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [isLoading, messages, speakAssistantMessageOnce])

  useEffect(() => {
    if (!assistantNotices.length) return
    const latestNotice = assistantNotices[assistantNotices.length - 1]
    const timeout = window.setTimeout(() => {
      speakAssistantNoticeOnce(latestNotice.id, latestNotice.content)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [assistantNotices, speakAssistantNoticeOnce])

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
    setSelectedSkillIds([])
    setInput('')
    setMentalPrepContext(null)
    mentalPrepContextRef.current = null
    historyMessageIdsRef.current.clear()
    resetSpokenTracking()
  }

  function handleNewChat() {
    stopAssistantSpeech()
    cancelVoiceAutoSend()
    stopRealtimeVoice(undefined, 'new_chat')
    setMessages([])
    setAssistantNotices([])
    setConversationId(null)
    setSelectedSkillIds([])
    setInput('')
    setMentalPrepContext(null)
    mentalPrepContextRef.current = null
    historyMessageIdsRef.current.clear()
    resetSpokenTracking()
  }

  // Load a previous conversation from the history panel
  async function handleLoadConversation(loadConversationId: string) {
    try {
      const response = await fetch(`/api/ai/conversations/${loadConversationId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('history.loadErrorTitle'))
      }

      // Convert to useChat format (AI SDK v5 uses parts array)
      const chatMessages = (data.messages || []).map((msg: { id: string; role: string; content: string; createdAt?: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        parts: [{ type: 'text' as const, text: msg.content || '' }],
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      }))

      stopAssistantSpeech()
      cancelVoiceAutoSend()
      for (const msg of chatMessages) {
        if (msg.role === 'assistant') {
          historyMessageIdsRef.current.add(msg.id)
        }
      }

      setMessages(chatMessages)
      setConversationId(loadConversationId)
      setAssistantNotices([])
      setDetectedProgram(null)
      setMentalPrepContext(null)
      mentalPrepContextRef.current = null
      setIsHistoryOpen(false)
    } catch (error) {
      toast({
        title: t('history.loadErrorTitle'),
        description: error instanceof Error ? error.message : t('common.unexpectedError'),
        variant: 'destructive',
      })
    }
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

    const tierLabel = INTENT_TIER_LABELS[selectedIntent]?.label || t('model.fallbackTier')
    const badgeClassName = 'shrink-0 border border-white/30 bg-white/95 text-[11px] font-semibold text-orange-700 shadow-sm'

    // Only 1 intent available → static badge
    if (availableIntents.length <= 1) {
      return (
        <Badge variant="secondary" className={badgeClassName}>
          {tierLabel}
        </Badge>
      )
    }

    // Multiple intents → clickable picker
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors hover:bg-white', badgeClassName)}>
            {tierLabel}
            <ChevronDown className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start" side="bottom">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
            {t('model.chooseQuality')}
          </p>
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
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {t('model.recommended')}
                </Badge>
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
    ? t('voice.recording', { duration: formatVoiceDuration(voiceDuration) })
    : isTranscribingVoice
      ? t('voice.transcribingMessage')
      : voiceRecorderError
        ? voiceRecorderError
        : null
  const voiceButtonLabel = isVoiceRecording
    ? t('voice.stopRecording')
    : isTranscribingVoice
      ? t('voice.transcribingLabel')
      : t('voice.startInput')
  const spokenRepliesLabel = isSpokenRepliesEnabled
    ? t('voice.spokenRepliesOff')
    : t('voice.spokenRepliesOn')
  const voiceAutoSendLabel = isVoiceAutoSendEnabled
    ? t('voice.autoSendOff')
    : t('voice.autoSendOn')
  const voiceOperatorModeLabel = isVoiceOperatorModeEnabled
    ? t('voice.operatorOff')
    : t('voice.operatorOn')
  const realtimeVoiceLabel = isRealtimeVoiceActive || isRealtimeVoiceConnecting
    ? t('voice.realtimeOff')
    : t('voice.realtimeOn')

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
    return <AthleteChatLoadingPanel style={panelFloatingStyle} onClose={handleClose} />
  }

  // No AI access (coach hasn't configured keys)
  if (hasAIAccess === false) {
    return <AthleteChatNoAccessPanel style={panelFloatingStyle} onClose={handleClose} />
  }

  // Subscription error (limit reached)
  if (subscriptionError) {
    return (
      <AthleteChatSubscriptionPanel
        style={panelFloatingStyle}
        onClose={() => {
          setSubscriptionError(null)
          handleClose()
        }}
        error={subscriptionError}
        usage={subscriptionStatus}
      />
    )
  }

  // GDPR consent required
  if (consentStatus === 'required') {
    return (
      <AthleteChatConsentPanel
        style={panelFloatingStyle}
        onClose={handleClose}
        dataProcessing={consentDataProcessing}
        onDataProcessingChange={setConsentDataProcessing}
        healthData={consentHealthData}
        onHealthDataChange={setConsentHealthData}
        isGranting={isGrantingConsent}
        onGrant={() => { void handleGrantConsent() }}
      />
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
      <div className="border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
        <div className="flex items-center justify-between gap-2 p-3 pb-2">
          <div
            onPointerDown={!isExpanded ? handlePanelDragStart : undefined}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2 touch-none',
              !isExpanded && 'cursor-grab active:cursor-grabbing'
            )}
          >
            <Bot className="h-5 w-5 shrink-0 text-white" />
            <span className="truncate font-semibold text-white">{t('header.title')}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsHistoryOpen(true)}
              className="h-8 w-8 text-white hover:bg-white/20"
              title={t('header.history')}
              aria-label={t('header.history')}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="h-8 w-8 text-white hover:bg-white/20"
              title={t('header.newConversation')}
              aria-label={t('header.newConversation')}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-white hover:bg-white/20"
              title={isExpanded ? t('header.minimize') : t('header.expand')}
              aria-label={isExpanded ? t('header.minimize') : t('header.expand')}
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
              title={t('header.close')}
              aria-label={t('header.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {renderModelBadge()}
            {/* Usage meter - only show if there's a limit */}
            {subscriptionStatus && subscriptionStatus.limit > 0 && subscriptionStatus.limit !== -1 && (
              <Badge variant="secondary" className="shrink-0 border border-white/30 bg-white/95 text-[11px] font-semibold text-emerald-700 shadow-sm">
                <AIChatUsageCompact
                  used={subscriptionStatus.used}
                  limit={subscriptionStatus.limit}
                  className="text-emerald-700"
                />
              </Badge>
            )}
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
            <MemoryIndicator
              clientId={clientId}
              onMemoryContextReady={setMemoryContext}
              className="h-7 w-7"
            />
          </div>
        </div>
      </div>

      {isVoiceOperatorModeEnabled && (
        <div className="px-3 py-2 border-b bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Headphones className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('operatorBanner.active')}</span>
          </div>
          <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium">
            {t('operatorBanner.confirming')}
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
              {realtimeVoiceStatus || t('realtime.active')}
            </span>
          </div>
          {(isRealtimeVoiceActive || isRealtimeVoiceConnecting) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => stopRealtimeVoice(t('realtime.stopped'), 'user_stopped')}
              className="h-6 px-2 text-xs hover:bg-emerald-500/10"
            >
              {t('realtime.stop')}
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && assistantNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="font-medium mb-1">
              {athleteName ? t('empty.greetingWithName', { name: athleteName }) : t('empty.greeting')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-4">
              {t('empty.description')}
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
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickPrompt(capabilityQuickPrompt)}
              >
                {t('quickPrompts.capabilities')}
              </Button>
              {quickPrompts.slice(0, 4).map((prompt) => (
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
                part => part.type === 'tool-createTodayWorkout' && part.state === 'output-available' && part.output?.success && part.output?.wodId
              )
              const workoutResult = workoutToolPart ? workoutToolPart.output : null

              // Check for program generation tool results
              const programToolPart = (message.parts as any[])?.find( // eslint-disable-line
                part => part.type === 'tool-generateTrainingProgram' && part.state === 'output-available' && part.output?.success && part.output?.sessionId
              )
              const programResult = programToolPart ? programToolPart.output : null
              const programErrorPart = (message.parts as any[])?.find( // eslint-disable-line
                part => part.type === 'tool-generateTrainingProgram' && part.state === 'output-available' && part.output && !part.output.success
              )
              const programError = programErrorPart ? programErrorPart.output : null
              const actionToolPart = (message.parts as any[])?.find( // eslint-disable-line
                part => part.type?.startsWith('tool-') &&
                  part.state === 'output-available' &&
                  part.output?.success &&
                  part.output?.action?.type === 'aiCapabilityAction'
              )
              const actionResult = actionToolPart?.output as ChatActionResult | undefined

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
                            {t('programError.title')}
                          </p>
                          <p className="text-xs text-red-700 dark:text-red-200">
                            {programError.error || t('programError.retry')}
                            {programError.upgradeMessage ? ` ${programError.upgradeMessage}` : ''}
                          </p>
                          <AiAllowanceBlockedAction
                            action={
                              programError.actionUrl
                                ? {
                                    label: programError.actionLabel || t('programError.manageCredits'),
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
                  {actionResult?.success && (
                    <ChatActionCard result={actionResult} basePath={basePath} />
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
                  {t('programDetected.weeks', { count: detectedProgram.program.totalWeeks })}
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
              {t('programDetected.save')}
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="space-y-2">
          <AISkillPicker
            selectedSkillIds={selectedSkillIds}
            onSelectedSkillIdsChange={setSelectedSkillIds}
            disabled={isLoading || isLoadingConfig}
            side="top"
            align="start"
            triggerClassName="h-8 text-xs"
            chipsClassName="max-w-full"
          />
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                cancelVoiceAutoSend()
                setInput(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('input.placeholder')}
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
              <span>{t('voice.autoSendPending')}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelVoiceAutoSend}
                className="h-6 px-2 text-xs hover:bg-blue-500/10"
              >
                {t('voice.cancel')}
              </Button>
            </div>
          )}
          {isSpokenRepliesEnabled && (isGeneratingAssistantAudio || isSpeakingAssistant || voicePlaybackStatus) && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {voicePlaybackStatus || (isSpeakingAssistant ? t('voice.readingAnswer') : t('voice.creatingAiVoice'))}
              <span className="ml-1">{t('voice.aiGenerated')}</span>
            </div>
          )}
        </div>
      </form>

      {/* Chat history (Sheet renders in a portal above the panel). */}
      <ChatHistoryPanel
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        currentConversationId={conversationId}
        onLoadConversation={(id) => { void handleLoadConversation(id) }}
      />
    </div>
  )
}

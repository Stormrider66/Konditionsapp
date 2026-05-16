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
  Database,
  BookOpen,
  Save,
  AlertTriangle,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Zap,
  Headphones,
} from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatNavigationCard, type ChatNavigationResult } from './ChatNavigationCard'
import { ChatActionCard, type ChatActionResult } from './ChatActionCard'
import { cn } from '@/lib/utils'
import { parseAIProgram, type ParseResult } from '@/lib/ai/program-parser'
import { getInfoEntriesByKeys } from '@/lib/info-content'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { useFloatingChatDrag } from './useFloatingChatDrag'
import {
  COACH_FLOATING_CHAT_EVENT,
  type CoachFloatingChatEvent,
} from '@/lib/events/coach-floating-chat'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'

// Page context types for different page contexts
export interface PageContext {
  /** Type of page context */
  type: string
  /** Human-readable title for the context */
  title: string
  /** Structured data to include in the AI prompt */
  data: Record<string, unknown>
  /** Optional summary text */
  summary?: string
  /** Concept keys from info-content.ts for this page */
  conceptKeys?: string[]
}

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

interface ToolOutputPart {
  type: string
  state?: string
  output?: unknown
}

interface ToolStatusOutput {
  success?: boolean
  message?: string
  error?: string
  needsClarification?: boolean
  title?: string
  name?: string
  athleteName?: string
}

interface CoachOperatorContext {
  status?: 'attention' | 'stable'
  tone?: 'risk' | 'watch' | 'steady'
  headline?: string
  summary?: {
    urgentCount?: number
    reviewCount?: number
    queueCount?: number
    activeAlerts?: number
    recommendationCount?: number
  }
  focusAreas?: string[]
}

function getCoachOperatorContext(pageContext?: PageContext): CoachOperatorContext | null {
  if (pageContext?.type !== 'coach-dashboard') return null
  const data = pageContext.data as {
    dashboard?: {
      operator?: CoachOperatorContext
    }
  }
  return data.dashboard?.operator ?? null
}

function isToolStatusOutput(output: unknown): output is ToolStatusOutput {
  return typeof output === 'object' && output !== null
}

function getFallbackActionMessage(toolName: string, output: ToolStatusOutput): string {
  if (output.success === false) {
    const error = output.error || output.message || 'Jag fick inget tydligt felmeddelande från systemet.'
    if (output.needsClarification) {
      return `${error} Välj rätt alternativ eller ge mig lite mer information så fortsätter jag.`
    }
    return `Jag kunde inte slutföra det: ${error}`
  }

  if (output.success === true) {
    if (output.message) return output.message

    switch (toolName) {
      case 'createTodayWorkout':
        return output.title
          ? `Klart, jag har skapat passet "${output.title}".`
          : 'Klart, jag har skapat passet.'
      case 'logMeal':
        return 'Klart, jag har loggat måltiden.'
      case 'updateMeal':
        return 'Klart, jag har uppdaterat måltiden.'
      case 'deleteMeal':
        return 'Klart, jag har tagit bort måltiden.'
      case 'logDailyCheckIn':
        return 'Klart, jag har sparat incheckningen.'
      case 'reportInjury':
        return 'Klart, jag har registrerat skaderapporten.'
      case 'updateAthleteProfile':
        return 'Klart, jag har uppdaterat profilen.'
      case 'createCalendarEvent':
        return 'Klart, jag har skapat kalenderhändelsen.'
      case 'generateTrainingProgram':
        return output.athleteName
          ? `Klart, jag har startat programgenereringen för ${output.athleteName}.`
          : 'Klart, jag har startat programgenereringen.'
      case 'generateStrengthSession':
      case 'createCardioSession':
      case 'createHybridWorkout':
      case 'createSportWorkout':
      case 'modifyStrengthSession':
        return output.name
          ? `Klart, jag har sparat "${output.name}".`
          : 'Klart, jag har sparat åtgärden.'
      case 'prepareCoachMessageDraft':
        return 'Jag har förberett ett meddelande. Det skickas först när du bekräftar i kortet nedan.'
      case 'suggestCoachNavigation':
        return 'Jag har förberett en genväg. Klicka på knappen nedan för att öppna den.'
      default:
        return 'Klart, jag har utfört åtgärden.'
    }
  }

  return output.error || output.message || 'Jag försökte utföra åtgärden, men fick inget tydligt svar från systemet.'
}

function getToolOnlyStatusMessage(role: string, parts?: unknown[]): string | null {
  if (role !== 'assistant') return null

  const toolOutputs = (parts as ToolOutputPart[] | undefined)?.filter(
    part => part.type.startsWith('tool-') && part.state === 'output-available'
  )
  if (!toolOutputs?.length) return null

  const latestOutput = [...toolOutputs]
    .reverse()
    .find(part => isToolStatusOutput(part.output))
  if (!latestOutput || !isToolStatusOutput(latestOutput.output)) {
    return 'Jag försökte utföra åtgärden, men fick inget tydligt svar från systemet.'
  }

  return getFallbackActionMessage(
    latestOutput.type.replace(/^tool-/, ''),
    latestOutput.output
  )
}

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

export function FloatingAIChat({
  athleteId,
  athleteName,
  initialMessage,
  contextType = 'general',
  pageContext,
  visibleConcepts,
}: FloatingAIChatProps) {
  const { toast } = useToast()
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

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
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

  // GDPR: Track athlete consent status for coach chat
  const [athleteConsentStatus, setAthleteConsentStatus] = useState<'loading' | 'granted' | 'none' | null>(null)

  // Program detection state
  const [detectedProgram, setDetectedProgram] = useState<ParseResult | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false)
  const [isSpokenRepliesEnabled, setIsSpokenRepliesEnabled] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [isSpeakingAssistant, setIsSpeakingAssistant] = useState(false)
  const [isVoiceAutoSendEnabled, setIsVoiceAutoSendEnabled] = useState(false)
  const [isVoiceAutoSendPending, setIsVoiceAutoSendPending] = useState(false)
  const [isVoiceOperatorModeEnabled, setIsVoiceOperatorModeEnabled] = useState(false)
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
      setIsVoiceAutoSendEnabled(window.localStorage.getItem('floating-ai-voice-auto-send') === 'true')
      setIsVoiceOperatorModeEnabled(savedVoiceOperatorMode && 'speechSynthesis' in window)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    return () => {
      if (voiceAutoSendTimeoutRef.current) {
        clearTimeout(voiceAutoSendTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const frame = window.requestAnimationFrame(() => {
      setIsSpeechSupported(true)
      setIsSpokenRepliesEnabled(window.localStorage.getItem('floating-ai-spoken-replies') === 'true')
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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeakingAssistant(false)
  }, [])

  const speakAssistantReply = useCallback((text: string) => {
    if (!isSpokenRepliesEnabled || !isSpeechSupported) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const speakableText = getSpeakableAssistantText(text)
    if (!speakableText) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(speakableText)
    const voice = assistantSpeechVoiceRef.current
    utterance.lang = voice?.lang || 'sv-SE'
    utterance.voice = voice
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeakingAssistant(true)
    utterance.onend = () => setIsSpeakingAssistant(false)
    utterance.onerror = () => setIsSpeakingAssistant(false)
    window.speechSynthesis.speak(utterance)
  }, [isSpeechSupported, isSpokenRepliesEnabled])

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
      window.localStorage.setItem('floating-ai-spoken-replies', String(next))
      if (!next) {
        stopAssistantSpeech()
        setIsVoiceOperatorModeEnabled(false)
        window.localStorage.setItem('floating-ai-voice-operator-mode', 'false')
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
    window.localStorage.setItem('floating-ai-voice-operator-mode', String(next))

    if (next) {
      setIsSpokenRepliesEnabled(true)
      setIsVoiceAutoSendEnabled(true)
      window.localStorage.setItem('floating-ai-spoken-replies', 'true')
      window.localStorage.setItem('floating-ai-voice-auto-send', 'true')
      addAssistantNotice('Voice operator-läget är aktivt. Jag lyssnar via mikrofonen, skickar efter en kort paus och säger mina svar högt. Åtgärder som skickar eller ändrar något kräver fortfarande bekräftelse.')
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
    fetchModelConfig()
  }, [])

  // GDPR: Check athlete consent when athleteId is set
  useEffect(() => {
    if (!athleteId) {
      setAthleteConsentStatus(null)
      return
    }
    setAthleteConsentStatus('loading')
    async function checkAthleteConsent() {
      try {
        const response = await fetch(`/api/agent/consent?clientId=${athleteId}`)
        const data = await response.json()
        setAthleteConsentStatus(data.hasRequiredConsent ? 'granted' : 'none')
      } catch {
        setAthleteConsentStatus('none')
      }
    }
    checkAthleteConsent()
  }, [athleteId])

  // Build page context string for the AI
  const buildPageContextString = useCallback(() => {
    if (!pageContext || !isContextEnabled) return ''

    let contextStr = `\n\n## AKTUELL SIDKONTEXT: ${pageContext.title}\n`

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
        contextStr += `\n**Totalt**: ${data.totalAnalyses} videoanalyser (${data.completedCount} klara)\n`

        data.analyses.forEach((analysis, idx) => {
          contextStr += `\n### Video ${idx + 1}: ${analysis.exerciseName}\n`
          // GDPR: Use pseudonym instead of real name in AI context
          contextStr += `- **Atlet**: Atleten\n`
          contextStr += `- **Typ**: ${analysis.videoType}\n`
          contextStr += `- **Status**: ${analysis.status}\n`
          if (analysis.formScore) contextStr += `- **Poäng**: ${analysis.formScore}/100\n`

          if (analysis.issuesDetected && analysis.issuesDetected.length > 0) {
            contextStr += `\n**Problem:**\n`
            analysis.issuesDetected.forEach((issue, i) => {
              contextStr += `  ${i + 1}. ${issue.issue} (${issue.severity}): ${issue.description}\n`
            })
          }

          if (analysis.recommendations && analysis.recommendations.length > 0) {
            contextStr += `\n**Rekommendationer:**\n`
            analysis.recommendations.forEach((rec, i) => {
              contextStr += `  ${i + 1}. ${rec.recommendation}: ${rec.explanation}\n`
            })
          }
        })
      } else {
        // Handle single analysis (original logic)
        if (data.videoType) contextStr += `- **Typ**: ${data.videoType}\n`
        if (data.exerciseName) contextStr += `- **Övning**: ${data.exerciseName}\n`
        if (data.formScore) contextStr += `- **Poäng**: ${data.formScore}/100\n`

        if (data.issues && data.issues.length > 0) {
          contextStr += `\n### Identifierade problem:\n`
          data.issues.forEach((issue, i) => {
            contextStr += `${i + 1}. **${issue.issue}** (${issue.severity}): ${issue.description}\n`
          })
        }

        if (data.recommendations && data.recommendations.length > 0) {
          contextStr += `\n### Rekommendationer:\n`
          data.recommendations.forEach((rec, i) => {
            contextStr += `${i + 1}. **${rec.recommendation}**: ${rec.explanation}\n`
          })
        }

        if (data.poseAnalysis) {
          const pose = data.poseAnalysis
          contextStr += `\n### MediaPipe Poseanalys:\n`
          if (pose.score) contextStr += `- **AI-poäng**: ${pose.score}/100\n`
          if (pose.interpretation) contextStr += `- **Tolkning**: ${pose.interpretation}\n`

          if (pose.technicalFeedback && pose.technicalFeedback.length > 0) {
            contextStr += `\n**Teknisk feedback:**\n`
            pose.technicalFeedback.forEach((fb, i) => {
              contextStr += `${i + 1}. ${fb.area}: ${fb.observation} → ${fb.suggestion}\n`
            })
          }

          if (pose.patterns && pose.patterns.length > 0) {
            contextStr += `\n**Mönster:**\n`
            pose.patterns.forEach((p, i) => {
              contextStr += `${i + 1}. ${p.pattern}: ${p.significance}\n`
            })
          }

          if (pose.overallAssessment) {
            contextStr += `\n**Övergripande bedömning**: ${pose.overallAssessment}\n`
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
      const entries = getInfoEntriesByKeys(pageContext.conceptKeys)
      if (entries.length > 0) {
        contextStr += `\n### Relevanta begrepp på denna sida:\n`
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
  }, [pageContext, isContextEnabled, visibleConcepts])

  // Ref to store the current context string - updated when context changes
  const contextStringRef = useRef('')
  useEffect(() => {
    contextStringRef.current = buildPageContextString()
  }, [buildPageContextString])

  // Manual input state (AI SDK 5 no longer manages input state)
  const [input, setInput] = useState('')

  // Track auto-retrieved knowledge skills
  const [knowledgeSkills, setKnowledgeSkills] = useState<string[]>([])

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
      addAssistantNotice(`Jag kunde inte slutföra förfrågan: ${error.message}`)
      toast({
        title: 'Kunde inte skicka meddelande',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

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
    const toolOnlyStatusMessage = textContent
      ? null
      : getToolOnlyStatusMessage(lastMessage.role, lastMessage.parts)
    const replyText = textContent || toolOnlyStatusMessage || ''

    spokenAssistantMessageIdsRef.current.add(lastMessage.id)
    speakAssistantReply(replyText)
  }, [isLoading, messages, speakAssistantReply])

  useEffect(() => {
    if (!assistantNotices.length) return
    const latestNotice = assistantNotices[assistantNotices.length - 1]
    if (spokenAssistantNoticeIdsRef.current.has(latestNotice.id)) return

    spokenAssistantNoticeIdsRef.current.add(latestNotice.id)
    speakAssistantReply(latestNotice.content)
  }, [assistantNotices, speakAssistantReply])

  async function handlePublishProgram() {
    if (!detectedProgram?.program) return
    if (!athleteId) {
      toast({
        title: 'Ingen atlet vald',
        description: 'Välj en atlet för att spara programmet.',
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
          clientId: athleteId,
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

  useEffect(() => {
    function handleCoachChatIntent(event: Event) {
      const detail = (event as CustomEvent<CoachFloatingChatEvent>).detail
      if (!detail?.message) return
      cancelVoiceAutoSend()
      if (detail.open !== false) {
        setIsOpen(true)
      }
      setInput(detail.message)
    }

    window.addEventListener(COACH_FLOATING_CHAT_EVENT, handleCoachChatIntent)
    return () => window.removeEventListener(COACH_FLOATING_CHAT_EVENT, handleCoachChatIntent)
  }, [cancelVoiceAutoSend])

  const sendChatMessage = useCallback(async (message: string) => {
    const messageContent = message.trim()
    if (!messageContent || isLoading) return
    if (!modelConfig) {
      addAssistantNotice('Jag kan inte skicka just nu eftersom AI-modellen inte är färdigladdad. Vänta några sekunder och försök igen.')
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
            athleteId,
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
        athleteId,
        documentIds: [],
        webSearchEnabled: false,
        pageContext: contextStringRef.current,
        businessSlug: pathBusinessSlug,
      },
    })
  }, [
    addAssistantNotice,
    athleteId,
    conversationId,
    isLoading,
    modelConfig,
    pathBusinessSlug,
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
  }, [isAthleteUser, pathBusinessSlug])

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

  // Send initial message if provided
  useEffect(() => {
    if (isOpen && initialMessage && messages.length === 0) {
      setInput(initialMessage)
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
    setIsOpen(false)
    setMessages([])
    setAssistantNotices([])
    setConversationId(null)
    setInput('')
    spokenAssistantMessageIdsRef.current.clear()
    spokenAssistantNoticeIdsRef.current.clear()
  }

  function handleNewChat() {
    stopAssistantSpeech()
    cancelVoiceAutoSend()
    setMessages([])
    setAssistantNotices([])
    setConversationId(null)
    setInput('')
    spokenAssistantMessageIdsRef.current.clear()
    spokenAssistantNoticeIdsRef.current.clear()
  }

  // Get context label
  function getContextLabel() {
    if (pageContext) return pageContext.title
    if (athleteName) return `Atlet: ${athleteName}`
    switch (contextType) {
      case 'athlete':
        return 'Atletkontext'
      case 'program':
        return 'Programkontext'
      case 'test':
        return 'Testkontext'
      default:
        return null
    }
  }

  const contextLabel = getContextLabel()

  const contextualQuickPrompts = useMemo<QuickPrompt[]>(() => {
    if (!pageContext || !hasContext || !isContextEnabled) return []

    if (pageContext.type === 'video-analysis') {
      return [
        {
          label: 'Förklara problem',
          prompt: 'Förklara de viktigaste problemen i analysen',
        },
        {
          label: 'Förbättringsövningar',
          prompt: 'Ge mig specifika övningar för att förbättra tekniken',
        },
        {
          label: 'Enkel sammanfattning',
          prompt: 'Sammanfatta analysen i enkla termer för atleten',
        },
      ]
    }

    if (pageContext.type === 'coach-dashboard') {
      const operatorPrompt: QuickPrompt | null = operatorContext
        ? {
            label: operatorAttentionCount > 0 ? 'Operatorbrief' : 'Veckosummering',
            prompt: operatorAttentionCount > 0
              ? 'Gör en proaktiv coach-operator brief från dashboardens arbetskö. Prioritera risker, feedback och nästa app-vy att öppna.'
              : 'Gör en kort proaktiv veckosummering från coachdashboardens operatorläge och lyft vad jag bör bevaka härnäst.',
          }
        : null

      return [
        ...(operatorPrompt ? [operatorPrompt] : []),
        {
          label: 'Sammanfatta',
          prompt: 'Sammanfatta coachdashboarden utifrån sidkontexten och prioritera de tre viktigaste nästa stegen.',
        },
        {
          label: 'Vad kräver åtgärd?',
          prompt: 'Vad kräver åtgärd på den här dashboarden just nu? Skilj på akuta signaler och saker att följa upp senare.',
        },
        {
          label: 'Förklara korten',
          prompt: 'Förklara korten och signalerna på dashboarden så jag snabbt vet hur jag ska läsa sidan.',
        },
      ]
    }

    return [
      {
        label: 'Sammanfatta sidan',
        prompt: 'Sammanfatta den här sidan och lyft fram vad jag bör titta på först.',
      },
      {
        label: 'Nästa steg',
        prompt: 'Föreslå konkreta nästa steg baserat på sidkontexten.',
      },
      {
        label: 'Förklara begrepp',
        prompt: 'Förklara de viktigaste begreppen på den här sidan kort och praktiskt.',
      },
    ]
  }, [pageContext, hasContext, isContextEnabled, operatorContext, operatorAttentionCount])

  // Get provider color for badge
  function getProviderBadge() {
    if (!modelConfig) return null
    const colors = {
      ANTHROPIC: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
      GOOGLE: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      OPENAI: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    }
    const names = {
      ANTHROPIC: 'Claude',
      GOOGLE: 'Gemini',
      OPENAI: 'GPT',
    }
    return (
      <Badge variant="secondary" className={cn('text-xs', colors[modelConfig.provider])}>
        {names[modelConfig.provider]}
      </Badge>
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
            <h3 className="font-semibold mb-2">
              {isAthleteUser ? 'AI-assistenten ej tillgänglig' : 'API-nyckel saknas'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isAthleteUser
                ? 'Din coach har inte aktiverat AI-assistenten ännu. Kontakta din coach för att aktivera denna funktion.'
                : 'Konfigurera din API-nyckel (Anthropic eller Google) för att använda AI-assistenten.'}
            </p>
            {!isAthleteUser && (
              <Button asChild>
                <Link href={`${basePath}/coach/settings/ai`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Gå till inställningar
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
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
        <div
          onPointerDown={!isExpanded ? handlePanelDragStart : undefined}
          className={cn(
            'flex items-center gap-2 touch-none',
            !isExpanded && 'cursor-grab active:cursor-grabbing'
          )}
        >
          <Bot className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">AI-assistent</span>
          {getProviderBadge()}
        </div>
        <div className="flex items-center gap-1">
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
            <span>{pageContext?.title || 'Sidkontext'}</span>
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
                Aktiv
              </>
            ) : (
              'Inaktiv'
            )}
          </div>
        </button>
      )}

      {/* GDPR: Warning when athlete hasn't consented */}
      {athleteId && athleteConsentStatus === 'none' && (
        <div className="px-3 py-2 border-b bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Atletens samtycke saknas — AI-chatten kan inte använda atletdata</span>
        </div>
      )}

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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && assistantNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">Hur kan jag hjälpa dig?</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {hasContext && isContextEnabled
                ? `Jag har tillgång till ${pageContext?.title?.toLowerCase() || 'sidkontext'}. Fråga mig vad som helst om det!`
                : hasContext && !isContextEnabled
                ? 'Kontext är inaktiverad. Klicka på knappen ovan för att aktivera.'
                : 'Fråga mig om träningsprogram, testanalyser, eller andra frågor om dina atleter.'}
            </p>
            {operatorContext && (
              <div className="mt-4 w-full rounded-lg border bg-muted/40 p-3 text-left">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  Coachoperator
                </div>
                <p className="text-xs text-muted-foreground">
                  {operatorContext.headline || 'Dashboardens operatorläge är aktivt.'}
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
              {!pageContext && athleteName && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput(`Analysera ${athleteName}s träningshistorik`)}
                    className="text-xs"
                  >
                    Analysera träning
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput(`Skapa ett träningsprogram för ${athleteName}`)}
                    className="text-xs"
                  >
                    Skapa program
                  </Button>
                </>
              )}
              {!pageContext && !athleteName && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput('Hur skapar jag ett effektivt 10K-program?')}
                    className="text-xs"
                  >
                    10K-program
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInput('Förklara tröskelträning och zoner')}
                    className="text-xs"
                  >
                    Träningszoner
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
                : getToolOnlyStatusMessage(message.role, message.parts)
              const navigationToolPart = (message.parts as ToolOutputPart[] | undefined)?.find(
                part => part.type === 'tool-suggestCoachNavigation' && part.state === 'output-available'
              )
              const navigationResult = navigationToolPart?.output as ChatNavigationResult | undefined
              const actionToolPart = (message.parts as ToolOutputPart[] | undefined)?.find(
                part => part.type === 'tool-prepareCoachMessageDraft' && part.state === 'output-available'
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
                      athleteId={athleteId}
                      athleteName={athleteName}
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
                athleteId={athleteId}
                athleteName={athleteName}
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
                  {detectedProgram.program.totalWeeks} veckor
                  {!athleteId && ' — Välj en atlet för att spara'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handlePublishProgram}
              disabled={isPublishing || !athleteId}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2 shrink-0"
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
          {isSpokenRepliesEnabled && isSpeakingAssistant && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Läser upp svaret...
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

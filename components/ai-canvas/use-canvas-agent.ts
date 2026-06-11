'use client'

/**
 * Streaming client for the agentic canvas endpoint (/api/ai/canvas/agent).
 *
 * Wraps useChat: each generate() sends one user message; the agent's
 * tool-result parts stream back and this hook turns them into canvas
 * mutations (onBlocks / onTitle) plus a live progress list for the UI.
 * The conversation is kept across generate() calls so follow-up requests
 * ("now add a section about...") extend the same document.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type {
  AppLocale,
  CanvasBlock,
  CanvasContextSelection,
  CanvasTemplateId,
} from './canvas-model'

export interface CanvasAgentModelInfo {
  provider: string
  modelId: string
  displayName: string
}

export interface CanvasAgentProgressItem {
  id: string
  toolName: string
  label: string
  done: boolean
  error: boolean
}

export interface CanvasAgentFinishResult {
  text: string
  model: CanvasAgentModelInfo | null
  skillsUsed: string[]
  blockCount: number
}

interface UseCanvasAgentOptions {
  businessSlug: string
  locale: AppLocale
  onBlocks: (blocks: Array<Omit<CanvasBlock, 'id'>>) => void
  onTitle: (title: string) => void
  onFinish: (result: CanvasAgentFinishResult) => void
  onError: (message: string) => void
}

interface AgentMessageMetadata {
  model?: CanvasAgentModelInfo
  skillsUsed?: string[]
}

const TOOL_LABELS: Record<string, { en: string; sv: string }> = {
  listAthletes: { en: 'Looking up athletes', sv: 'Hämtar atleter' },
  listTeams: { en: 'Looking up teams', sv: 'Hämtar lag' },
  getTestData: { en: 'Reading test results', sv: 'Läser testresultat' },
  getSessionData: { en: 'Reading training sessions', sv: 'Läser träningspass' },
  getReadinessData: { en: 'Reading readiness data', sv: 'Läser readiness-data' },
  getProgramData: { en: 'Reading programs', sv: 'Läser program' },
  getCoachNotes: { en: 'Reading coach notes', sv: 'Läser coachanteckningar' },
  addAnalyticsBlocks: { en: 'Computing analytics blocks', sv: 'Beräknar analysblock' },
  addCanvasBlocks: { en: 'Writing canvas blocks', sv: 'Skriver canvasblock' },
  setCanvasTitle: { en: 'Setting canvas title', sv: 'Sätter canvastitel' },
}

interface ToolPartLike {
  type: string
  toolCallId: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  output?: unknown
}

function isToolPart(part: { type: string }): part is ToolPartLike {
  return part.type.startsWith('tool-') && 'toolCallId' in part
}

export function useCanvasAgent({
  businessSlug,
  locale,
  onBlocks,
  onTitle,
  onFinish,
  onError,
}: UseCanvasAgentOptions) {
  // Callbacks live in refs so the message-scanning effect never re-runs
  // (and never re-applies blocks) because a parent re-render recreated them.
  const callbacksRef = useRef({ onBlocks, onTitle, onFinish, onError })
  useEffect(() => {
    callbacksRef.current = { onBlocks, onTitle, onFinish, onError }
  })

  const processedToolCallIds = useRef(new Set<string>())
  const blocksThisRun = useRef(0)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ai/canvas/agent' }),
    onError: (error) => {
      callbacksRef.current.onError(error.message)
    },
    onFinish: ({ message }) => {
      const text = (message.parts ?? [])
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('\n')
        .trim()
      const metadata = (message.metadata ?? {}) as AgentMessageMetadata
      callbacksRef.current.onFinish({
        text,
        model: metadata.model ?? null,
        skillsUsed: metadata.skillsUsed ?? [],
        blockCount: blocksThisRun.current,
      })
    },
  })

  // Apply emit-tool outputs exactly once each, as they stream in.
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== 'assistant') continue
      for (const part of message.parts ?? []) {
        if (!isToolPart(part)) continue
        if (part.state !== 'output-available') continue
        if (processedToolCallIds.current.has(part.toolCallId)) continue
        processedToolCallIds.current.add(part.toolCallId)

        const output = part.output as { blocks?: Array<Omit<CanvasBlock, 'id'>>; title?: string } | undefined
        if (
          (part.type === 'tool-addCanvasBlocks' || part.type === 'tool-addAnalyticsBlocks') &&
          Array.isArray(output?.blocks) &&
          output.blocks.length > 0
        ) {
          blocksThisRun.current += output.blocks.length
          callbacksRef.current.onBlocks(output.blocks)
        } else if (part.type === 'tool-setCanvasTitle' && typeof output?.title === 'string') {
          callbacksRef.current.onTitle(output.title)
        }
      }
    }
  }, [messages])

  // Live progress for the current (latest) agent run.
  const progress = useMemo<CanvasAgentProgressItem[]>(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
    if (!lastAssistant) return []
    const items: CanvasAgentProgressItem[] = []
    for (const part of lastAssistant.parts ?? []) {
      if (!isToolPart(part)) continue
      const toolName = part.type.slice('tool-'.length)
      const label = TOOL_LABELS[toolName]?.[locale] ?? toolName
      items.push({
        id: part.toolCallId,
        toolName,
        label,
        done: part.state === 'output-available',
        error: part.state === 'output-error',
      })
    }
    return items
  }, [messages, locale])

  const isGenerating = status === 'submitted' || status === 'streaming'

  const generate = (
    promptText: string,
    options: {
      templateId: CanvasTemplateId
      contextSelection: CanvasContextSelection
      selectedSkillIds: string[]
      canvasSummary?: string
    }
  ) => {
    blocksThisRun.current = 0
    void sendMessage(
      { text: promptText },
      {
        body: {
          businessSlug,
          templateId: options.templateId,
          contextSelection: options.contextSelection,
          selectedSkillIds: options.selectedSkillIds,
          canvasSummary: options.canvasSummary || undefined,
        },
      }
    )
  }

  const resetConversation = () => {
    setMessages([])
    processedToolCallIds.current.clear()
    blocksThisRun.current = 0
  }

  return { generate, isGenerating, progress, resetConversation }
}

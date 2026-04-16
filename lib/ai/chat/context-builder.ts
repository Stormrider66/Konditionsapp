import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { searchSimilarChunks, hasEmbeddingKeys, type EmbeddingKeys } from '@/lib/ai/embeddings'
import { buildSportSpecificContext, type AthleteData } from '@/lib/ai/sport-context-builder'
import { buildAthleteOwnContext } from '@/lib/ai/athlete-context-builder'
import { buildCalendarContext } from '@/lib/ai/calendar-context-builder'
import { matchKnowledgeSkills, fetchSkillContext } from '@/lib/ai/knowledge-skills'
import { webSearch, formatSearchResultsForContext } from '@/lib/ai/web-search'
import {
  buildAthleteSystemPrompt,
  type MemoryContext,
  type AthleteCapabilities,
} from '@/lib/ai/athlete-prompts'
import type { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import type { ChatRequestMessage } from './types'
import { getMessageContent } from './message-format'

type StaffPermissions = Awaited<ReturnType<typeof getStaffPermissions>>

export interface BuildChatContextInput {
  messages: ChatRequestMessage[]
  isAthleteChat: boolean
  athleteClientId?: string
  athleteId?: string
  hasAthleteConsent: boolean
  documentIds: string[]
  webSearchEnabled: boolean
  pageContext: string
  memoryContext?: MemoryContext
  athleteCapabilities?: AthleteCapabilities
  staffPermissions?: StaffPermissions
  /** Who owns the API key / whose documents to search. */
  apiKeyUserId: string
  /** Resolved API keys — embeddings only need google/openai. */
  embeddingKeys: EmbeddingKeys
  userId: string
  calendarProgramStartDate?: Date
  calendarProgramEndDate?: Date
}

export interface ChatContextResult {
  athleteContext: string
  sportSpecificContext: string
  calendarContext: string
  skillContext: string
  skillsUsed: string[]
  documentContext: string
  webSearchContext: string
  /** Ready-to-use athlete system prompt (athlete chat only). Empty otherwise. */
  athleteSystemPrompt: string
  /** For coach chat: whether a specific athlete was verified. */
  coachVerifiedAthleteId?: string
  calendarProgramStartDate?: Date
  calendarProgramEndDate?: Date
}

/**
 * Build every flavour of context string the chat handler injects into
 * the system prompt: athlete bio, sport-specific training info, calendar
 * constraints, knowledge skills, RAG over coach documents, and optional
 * web search. Returns one flat struct so the route doesn't have to
 * juggle six separate await/try blocks.
 */
export async function buildChatContext(
  input: BuildChatContextInput
): Promise<ChatContextResult> {
  const {
    messages,
    isAthleteChat,
    athleteClientId,
    athleteId,
    hasAthleteConsent,
    documentIds,
    webSearchEnabled,
    pageContext: _pageContext, // kept for API symmetry; consumer re-applies it
    memoryContext,
    athleteCapabilities,
    staffPermissions,
    apiKeyUserId,
    embeddingKeys,
  } = input

  let athleteContext = ''
  let sportSpecificContext = ''
  let athleteSystemPrompt = ''
  let coachVerifiedAthleteId: string | undefined
  let calendarProgramStartDate = input.calendarProgramStartDate
  let calendarProgramEndDate = input.calendarProgramEndDate

  // ── Athlete chat: build context + system prompt from athlete's own data ──
  if (isAthleteChat && athleteClientId) {
    try {
      athleteContext = await buildAthleteOwnContext(athleteClientId)
      // GDPR: real name must never be sent to AI providers.
      athleteSystemPrompt = buildAthleteSystemPrompt(
        athleteContext,
        undefined,
        memoryContext,
        athleteCapabilities
      )
    } catch (error) {
      logger.warn('Error building athlete context', { athleteClientId }, error)
    }
  } else if (athleteId && hasAthleteConsent) {
    // Coach chat: verify the athlete belongs to this coach (or assigned team)
    const teamScope =
      staffPermissions?.isTeamScoped && staffPermissions.assignedTeamIds.length > 0
        ? { teamId: { in: staffPermissions.assignedTeamIds } }
        : undefined

    const athleteCheck = await prisma.client.findFirst({
      where: {
        id: athleteId,
        OR: [{ userId: input.userId }, ...(teamScope ? [teamScope] : [])],
      },
      select: {
        id: true,
        trainingPrograms: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { startDate: true, endDate: true },
        },
        sportProfile: true,
      },
    })

    if (athleteCheck) {
      coachVerifiedAthleteId = athleteId
      if (athleteCheck.trainingPrograms[0]) {
        calendarProgramStartDate = athleteCheck.trainingPrograms[0].startDate
        calendarProgramEndDate = athleteCheck.trainingPrograms[0].endDate
      }

      try {
        athleteContext = await buildAthleteOwnContext(athleteId)
      } catch (error) {
        logger.warn('Error building full athlete context for coach', { athleteId }, error)
      }

      if (athleteCheck.sportProfile) {
        const [trainingLoad, strengthData, plannedCount, completedCount] = await Promise.all([
          prisma.trainingLoad.findFirst({
            where: { clientId: athleteId },
            orderBy: { date: 'desc' },
          }),
          prisma.strengthSessionAssignment.findMany({
            where: { athleteId },
            orderBy: { assignedDate: 'desc' },
            take: 5,
            include: { session: true },
          }),
          prisma.workout.count({
            where: {
              day: { week: { program: { clientId: athleteId, isActive: true } } },
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          }),
          prisma.workoutLog.count({
            where: {
              workout: { day: { week: { program: { clientId: athleteId } } } },
              completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          }),
        ])

        const athleteWithExtendedContext = {
          sportProfile: athleteCheck.sportProfile,
          trainingLoad,
          strengthSessions: strengthData.map((s) => ({
            name: s.session.name,
            phase: s.session.phase,
            assignedDate: s.assignedDate,
            exercises: s.session.exercises,
          })),
          complianceRate: plannedCount > 0 ? (completedCount / plannedCount) * 100 : undefined,
        }
        sportSpecificContext = buildSportSpecificContext(
          athleteWithExtendedContext as unknown as AthleteData
        )
      }
    }
  }

  // ── Calendar ──
  let calendarContext = ''
  const calendarAthleteId = isAthleteChat ? athleteClientId : coachVerifiedAthleteId
  if (calendarAthleteId) {
    try {
      const calendarData = await buildCalendarContext(
        calendarAthleteId,
        calendarProgramStartDate,
        calendarProgramEndDate
      )
      if (calendarData.hasCalendarData) {
        calendarContext = calendarData.contextText
      }
    } catch (error) {
      logger.warn('Error building calendar context', { athleteClientId: calendarAthleteId }, error)
    }
  }

  // ── Knowledge skills ──
  let skillContext = ''
  let skillsUsed: string[] = []
  if (hasEmbeddingKeys(embeddingKeys)) {
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()
    if (lastUserMsg) {
      try {
        const userContent = getMessageContent(lastUserMsg)
        const matched = await matchKnowledgeSkills(userContent, embeddingKeys, { maxSkills: 3 })
        if (matched.length > 0) {
          const result = await fetchSkillContext(userContent, matched, embeddingKeys)
          skillContext = result.context
          skillsUsed = result.skillsUsed
        }
      } catch (error) {
        logger.warn('Error fetching knowledge skills context', {}, error)
      }
    }
  }

  // ── RAG over coach documents ──
  let documentContext = ''
  if (documentIds.length > 0 && hasEmbeddingKeys(embeddingKeys)) {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
    if (lastUserMessage) {
      try {
        const lastUserContent = getMessageContent(lastUserMessage)
        const chunks = await searchSimilarChunks(
          lastUserContent,
          apiKeyUserId,
          embeddingKeys,
          { matchThreshold: 0.75, matchCount: 5, documentIds }
        )
        if (chunks.length > 0) {
          const docs = await prisma.coachDocument.findMany({
            where: { id: { in: chunks.map((c) => c.documentId) } },
            select: { id: true, name: true },
          })
          const docMap = new Map(docs.map((d) => [d.id, d.name]))
          documentContext = `
## RELEVANT INFORMATION FRÅN DINA DOKUMENT

${chunks
  .map(
    (c, i) => `### Källa ${i + 1}: ${docMap.get(c.documentId) || 'Dokument'}
${c.content}
`
  )
  .join('\n')}
---
`
        }
      } catch (error) {
        logger.warn(
          'Error fetching document context',
          { documentCount: documentIds.length },
          error
        )
      }
    }
  }

  // ── Web search ──
  let webSearchContext = ''
  if (webSearchEnabled) {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
    if (lastUserMessage) {
      try {
        const searchQuery = getMessageContent(lastUserMessage)
        const searchTerms = [
          'forskning', 'research', 'studie', 'senaste', 'aktuell',
          'hur', 'vad', 'varför', 'bästa', 'optimal', 'metod', 'protocol',
        ]
        const shouldSearch = searchTerms.some((term) => searchQuery.toLowerCase().includes(term))
        if (shouldSearch) {
          const searchResults = await webSearch(searchQuery, { maxResults: 3 })
          if (searchResults.success && searchResults.results.length > 0) {
            webSearchContext = formatSearchResultsForContext(searchResults.results)
          }
        }
      } catch (error) {
        logger.warn('Web search error', {}, error)
      }
    }
  }

  return {
    athleteContext,
    sportSpecificContext,
    calendarContext,
    skillContext,
    skillsUsed,
    documentContext,
    webSearchContext,
    athleteSystemPrompt,
    coachVerifiedAthleteId,
    calendarProgramStartDate,
    calendarProgramEndDate,
  }
}

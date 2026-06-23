import 'server-only'

/**
 * Session Summarizer
 *
 * After a live voice coaching session ends, generates:
 * 1. A text summary of key moments for coach review
 * 2. Extracted memories (injuries, goals, preferences)
 * 3. Coach alerts if pain/injury was mentioned
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'
import { createGoogleGenAIClient, generateContent } from '@/lib/ai/google-genai-client'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { parseLiveVoiceSummaryJson } from './summary-json'

export async function generateSessionSummary(
  sessionId: string,
  clientId: string
): Promise<void> {
  // Fetch session with transcripts, client info, and assignment (to find the coach)
  const session = await prisma.liveVoiceCoachingSession.findUnique({
    where: { id: sessionId },
    include: {
      transcripts: { orderBy: { timestamp: 'asc' } },
      client: {
        select: {
          name: true,
          userId: true,
          businessId: true,
        },
      },
      cardioAssignment: {
        select: { assignedBy: true },
      },
      strengthAssignment: {
        select: { assignedBy: true },
      },
      hybridAssignment: {
        select: { assignedBy: true },
      },
    },
  })

  if (!session || session.transcripts.length === 0) return

  // Resolve a Google key for summary generation (use the key owner from the session)
  const googleKey = await getResolvedGoogleKey(session.keyOwnerId, {
    businessId: session.client.businessId ?? undefined,
  })

  if (!googleKey) {
    logger.warn('No Google key available for session summary', { sessionId })
    return
  }

  // Build transcript text
  const transcriptText = session.transcripts
    .map((t) => `${t.role === 'athlete' ? 'Athlete' : 'AI Coach'}: ${t.content}`)
    .join('\n')

  // Generate summary with structured analysis
  const client = createGoogleGenAIClient(googleKey)

  const prompt = `Analyze this voice coaching session transcript and provide a structured summary in JSON format.

## Transcript
${transcriptText}

## Required JSON Output
{
  "summary": "2-3 sentence summary of the session for the coach to review",
  "athleteMood": "positive" | "neutral" | "struggling" | "frustrated",
  "keyMoments": ["array of notable moments (max 5)"],
  "intensityFeedback": "easier" | "appropriate" | "harder" | null,
  "painOrInjuryMentioned": boolean,
  "painDetails": "description of pain/injury if mentioned, null otherwise",
  "memorableInfo": [
    {
      "type": "INJURY_MENTION" | "GOAL_STATEMENT" | "PREFERENCE" | "LIMITATION" | "FEEDBACK",
      "content": "the memorable fact",
      "importance": 1-5
    }
  ]
}

Respond ONLY with valid JSON.`

  try {
    const result = await generateContent(
      client,
      GEMINI_MODELS.FLASH,
      [{ text: prompt }],
      undefined,
      {
        userId: session.keyOwnerId,
        clientId,
        category: 'live_voice_summary',
      },
    )

    let analysis: {
      summary?: string
      athleteMood?: string
      keyMoments?: string[]
      painOrInjuryMentioned?: boolean
      painDetails?: string
      memorableInfo?: Array<{ type: string; content: string; importance: number }>
    } = {}

    try {
      analysis = parseLiveVoiceSummaryJson(result.text) as typeof analysis
    } catch {
      logger.warn('Failed to parse session summary JSON', { sessionId })
      analysis = { summary: result.text }
    }

    // Update session with summary and memories
    await prisma.liveVoiceCoachingSession.update({
      where: { id: sessionId },
      data: {
        summary: analysis.summary ?? null,
        extractedMemories: analysis.memorableInfo ?? undefined,
        painOrInjuryFlagged: analysis.painOrInjuryMentioned ?? false,
      },
    })

    // Create coach alert if pain/injury was mentioned
    if (analysis.painOrInjuryMentioned) {
      const coachId = session.cardioAssignment?.assignedBy ?? session.strengthAssignment?.assignedBy ?? session.hybridAssignment?.assignedBy
      if (coachId) {
        await prisma.coachAlert.create({
          data: {
            coachId,
            clientId,
            alertType: 'PAIN_MENTION',
            severity: 'HIGH',
            title: `${session.client.name || 'Athlete'} mentioned pain during voice coaching`,
            message: analysis.painDetails || 'Pain or injury mentioned during live voice coaching session.',
            contextData: {
              sessionId,
              source: 'live_voice_coaching',
              painDetails: analysis.painDetails,
              sessionDuration: session.durationSeconds,
            },
            sourceId: sessionId,
          },
        })

        logger.info('Coach alert created for pain mention in voice coaching', {
          sessionId,
          clientId,
          coachId,
        })
      }
    }

    // Save extracted memories to ConversationMemory (if any)
    if (analysis.memorableInfo && analysis.memorableInfo.length > 0) {
      await prisma.conversationMemory.createMany({
        data: analysis.memorableInfo.map((m) => ({
          clientId,
          memoryType: m.type,
          content: m.content,
          context: `From live voice coaching session on ${new Date().toISOString().split('T')[0]}`,
          importance: m.importance,
        })),
      })
    }

    logger.info('Session summary generated', {
      sessionId,
      painFlagged: analysis.painOrInjuryMentioned,
      memoriesExtracted: analysis.memorableInfo?.length ?? 0,
    })
  } catch (error) {
    logger.error('Session summary generation failed', { sessionId, error })
  }
}

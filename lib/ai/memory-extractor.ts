/**
 * Memory Extractor Service
 *
 * Extracts memorable facts from AI conversations with athletes.
 * Used to build long-term memory that personalizes future interactions.
 */

import { generateText } from 'ai'
import { prisma } from '@/lib/prisma'
import { resolveModel, type AvailableKeys } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// Memory types that can be extracted
export const MEMORY_TYPES = {
  INJURY_MENTION: 'INJURY_MENTION',
  GOAL_STATEMENT: 'GOAL_STATEMENT',
  PREFERENCE: 'PREFERENCE',
  LIFE_EVENT: 'LIFE_EVENT',
  FEEDBACK: 'FEEDBACK',
  MILESTONE: 'MILESTONE',
  EQUIPMENT: 'EQUIPMENT',
  LIMITATION: 'LIMITATION',
  PERSONAL_FACT: 'PERSONAL_FACT',
} as const

export type MemoryType = (typeof MEMORY_TYPES)[keyof typeof MEMORY_TYPES]

interface ExtractedMemory {
  memoryType: MemoryType
  content: string
  context?: string
  importance: number // 1-5
  expiresInDays?: number // null = never expires
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Extract memorable facts from a conversation
 */
export async function extractMemoriesFromConversation(
  messages: ConversationMessage[],
  keys: AvailableKeys,
  locale: AppLocale = 'en'
): Promise<ExtractedMemory[]> {
  if (messages.length === 0) {
    return []
  }

  const resolved = resolveModel(keys, 'fast')
  if (!resolved) {
    return []
  }

  // Format conversation for analysis
  const conversationText = messages
    .map((m) => `${m.role === 'user' ? t(locale, 'Athlete', 'Atlet') : 'AI'}: ${m.content}`)
    .join('\n\n')

  const extractionPrompt = locale === 'sv'
    ? `Analysera följande konversation mellan en atlet och en AI-träningsassistent.
Extrahera viktiga fakta som AI:n bör komma ihåg för framtida konversationer.

KONVERSATION:
${conversationText}

INSTRUKTIONER:
Identifiera och extrahera ENDAST fakta som är:
1. Personliga för atleten (inte allmän kunskap)
2. Relevanta för framtida träningsråd
3. Värt att komma ihåg över tid

MINNESTYPER att leta efter:
- INJURY_MENTION: Skador, smärta, obehag ("ont i knäet", "axeln känns stel")
- GOAL_STATEMENT: Träningsmål ("vill springa under 40 min på milen")
- PREFERENCE: Preferenser ("föredrar morgonträning", "gillar inte löpband")
- LIFE_EVENT: Livshändelser ("byter jobb nästa månad", "ska på semester")
- FEEDBACK: Feedback på träning ("tempot var för hårt", "kändes bra")
- MILESTONE: Prestationer ("sprang mitt första maraton", "nytt PB")
- EQUIPMENT: Utrustning ("köpte ny löpklocka", "har tillgång till gym")
- LIMITATION: Begränsningar ("kan inte träna kvällar", "allergisk mot nötter")
- PERSONAL_FACT: Personliga fakta ("har två barn", "jobbar skift")

SVARA I JSON-FORMAT:
{
  "memories": [
    {
      "memoryType": "INJURY_MENTION",
      "content": "Upplever smärta i vänster knä efter längre löppass",
      "context": "Nämnde detta när vi diskuterade veckans långpass",
      "importance": 4,
      "expiresInDays": 30
    }
  ]
}

VIKTIGHETSGRADERING (1-5):
1 = Mindre viktigt, kan glömmas snart
2 = Något viktigt, bra att veta
3 = Medelvitkigt, påverkar träningsråd
4 = Viktigt, bör kommas ihåg länge
5 = Mycket viktigt, kritisk information

UTGÅNGSTID:
- Tillfälliga saker (ont, trött): 7-30 dagar
- Mål och preferenser: null (aldrig)
- Livshändelser: 90-180 dagar
- Skador: 30-90 dagar beroende på allvar

Om inga minnesvärda fakta finns, returnera: {"memories": []}
`
    : `Analyze the following conversation between an athlete and an AI training assistant.
Extract important facts the AI should remember for future conversations.

CONVERSATION:
${conversationText}

INSTRUCTIONS:
Identify and extract ONLY facts that are:
1. Personal to the athlete (not general knowledge)
2. Relevant to future training advice
3. Worth remembering over time

MEMORY TYPES to look for:
- INJURY_MENTION: Injuries, pain, discomfort ("left knee hurts", "shoulder feels stiff")
- GOAL_STATEMENT: Training goals ("wants to run a sub-40 10K")
- PREFERENCE: Preferences ("prefers morning training", "does not like treadmills")
- LIFE_EVENT: Life events ("changing jobs next month", "going on vacation")
- FEEDBACK: Training feedback ("the pace was too hard", "felt good")
- MILESTONE: Achievements ("ran first marathon", "new PR")
- EQUIPMENT: Equipment ("bought a new running watch", "has gym access")
- LIMITATION: Limitations ("cannot train evenings", "allergic to nuts")
- PERSONAL_FACT: Personal facts ("has two children", "works shifts")

RESPOND IN JSON FORMAT:
{
  "memories": [
    {
      "memoryType": "INJURY_MENTION",
      "content": "Experiences pain in the left knee after longer runs",
      "context": "Mentioned this while discussing this week's long run",
      "importance": 4,
      "expiresInDays": 30
    }
  ]
}

IMPORTANCE RATING (1-5):
1 = Minor, can be forgotten soon
2 = Somewhat important, useful to know
3 = Moderately important, affects training advice
4 = Important, should be remembered for a long time
5 = Very important, critical information

EXPIRATION:
- Temporary things (pain, fatigue): 7-30 days
- Goals and preferences: null (never)
- Life events: 90-180 days
- Injuries: 30-90 days depending on severity

Write memory content and context in English unless the athlete's original wording is a name, event title, or exact phrase that should be preserved.
If there are no memorable facts, return: {"memories": []}
`

  try {
    const response = await generateText({
      model: createModelInstance(resolved),
      prompt: extractionPrompt,
      maxOutputTokens: 1024,
    })

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return []
    }

    const parsed = JSON.parse(jsonMatch[0])
    return parsed.memories || []
  } catch (error) {
    console.error('Error extracting memories:', error)
    return []
  }
}

/**
 * Save extracted memories to the database
 */
export async function saveMemories(
  clientId: string,
  memories: ExtractedMemory[],
  sourceMessageId?: string
): Promise<number> {
  if (memories.length === 0) {
    return 0
  }

  const now = new Date()
  const memoriesToCreate = memories.map((memory) => ({
    clientId,
    memoryType: memory.memoryType,
    category: getCategoryFromType(memory.memoryType),
    content: memory.content,
    context: memory.context,
    importance: memory.importance,
    extractedAt: now,
    expiresAt: memory.expiresInDays
      ? new Date(now.getTime() + memory.expiresInDays * 24 * 60 * 60 * 1000)
      : null,
    sourceMessageId,
  }))

  // Check for duplicates - don't store memories with very similar content
  const existingMemories = await prisma.conversationMemory.findMany({
    where: { clientId },
    select: { content: true },
  })

  const existingContents = new Set(
    existingMemories.map((m) => normalizeForComparison(m.content))
  )

  const uniqueMemories = memoriesToCreate.filter(
    (m) => !existingContents.has(normalizeForComparison(m.content))
  )

  if (uniqueMemories.length === 0) {
    return 0
  }

  await prisma.conversationMemory.createMany({
    data: uniqueMemories,
  })

  return uniqueMemories.length
}

/**
 * Get relevant memories for an athlete
 */
export async function getRelevantMemories(
  clientId: string,
  limit = 10
): Promise<
  {
    id: string
    memoryType: string
    content: string
    context: string | null
    importance: number
    extractedAt: Date
  }[]
> {
  const now = new Date()

  const memories = await prisma.conversationMemory.findMany({
    where: {
      clientId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ importance: 'desc' }, { extractedAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      memoryType: true,
      content: true,
      context: true,
      importance: true,
      extractedAt: true,
    },
  })

  return memories
}

/**
 * Get conversation summary for the last week
 */
export async function getRecentSummary(clientId: string): Promise<{
  summary: string
  keyTopics: string[]
  sentiment: string | null
} | null> {
  const now = new Date()
  const weekStart = getWeekStart(now)

  const summary = await prisma.conversationSummary.findUnique({
    where: {
      clientId_weekStart: {
        clientId,
        weekStart,
      },
    },
    select: {
      summary: true,
      keyTopics: true,
      sentiment: true,
    },
  })

  return summary
}

/**
 * Delete expired memories
 */
export async function cleanupExpiredMemories(): Promise<number> {
  const now = new Date()

  const result = await prisma.conversationMemory.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  })

  return result.count
}

/**
 * Format memories for inclusion in AI system prompt
 */
export function formatMemoriesForPrompt(
  memories: { memoryType: string; content: string; extractedAt: Date }[]
): string {
  if (memories.length === 0) {
    return ''
  }

  const grouped: Record<string, string[]> = {}

  for (const memory of memories) {
    const category = getCategoryLabel(memory.memoryType)
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(memory.content)
  }

  let output = '## MINNEN OM DENNA ATLET\n\n'

  for (const [category, items] of Object.entries(grouped)) {
    output += `### ${category}\n`
    for (const item of items) {
      output += `- ${item}\n`
    }
    output += '\n'
  }

  output += '*Använd dessa minnen för att ge personliga och relevanta svar.*\n'

  return output
}

// Helper functions

function getCategoryFromType(type: MemoryType): string {
  const categoryMap: Record<MemoryType, string> = {
    INJURY_MENTION: 'injury',
    GOAL_STATEMENT: 'goal',
    PREFERENCE: 'preference',
    LIFE_EVENT: 'life_event',
    FEEDBACK: 'feedback',
    MILESTONE: 'milestone',
    EQUIPMENT: 'equipment',
    LIMITATION: 'limitation',
    PERSONAL_FACT: 'personal',
  }
  return categoryMap[type] || 'other'
}

function getCategoryLabel(type: string): string {
  const labels: Record<string, string> = {
    INJURY_MENTION: 'Skador & smärta',
    GOAL_STATEMENT: 'Mål',
    PREFERENCE: 'Preferenser',
    LIFE_EVENT: 'Livshändelser',
    FEEDBACK: 'Feedback',
    MILESTONE: 'Milstolpar',
    EQUIPMENT: 'Utrustning',
    LIMITATION: 'Begränsningar',
    PERSONAL_FACT: 'Personligt',
  }
  return labels[type] || 'Övrigt'
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-zåäö0-9]/g, '')
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

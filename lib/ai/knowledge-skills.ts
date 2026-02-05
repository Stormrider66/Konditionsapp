/**
 * Knowledge Skills Auto-Retrieval System
 *
 * Automatically matches user queries to curated knowledge skills using:
 * 1. Keyword matching (fast, free)
 * 2. Embedding similarity (accurate, costs 1 embedding call)
 *
 * Retrieved context is injected into the AI system prompt transparently.
 */

import { prisma } from '@/lib/prisma'
import { generateEmbedding, searchSystemChunks } from '@/lib/ai/embeddings'
import { logger } from '@/lib/logger'

export interface MatchedSkill {
  id: string
  name: string
  nameEn: string | null
  category: string
  documentIds: string[]
  maxChunks: number
  score: number
  matchType: 'keyword' | 'embedding'
}

interface KnowledgeSkillRow {
  id: string
  name: string
  nameEn: string | null
  description: string
  category: string
  keywords: string[]
  priority: number
  documentIds: string[]
  maxChunks: number
}

// Max total tokens of auto-retrieved content (~4 chars per token)
const MAX_SKILL_CONTEXT_CHARS = 12000 // ~3000 tokens

/**
 * Match knowledge skills to a user query using keyword and/or embedding similarity.
 */
export async function matchKnowledgeSkills(
  query: string,
  openaiKey: string,
  options: { maxSkills?: number; keywordOnly?: boolean } = {}
): Promise<MatchedSkill[]> {
  const { maxSkills = 3, keywordOnly = false } = options

  // Fetch all active skills
  const skills = await prisma.knowledgeSkill.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nameEn: true,
      description: true,
      category: true,
      keywords: true,
      priority: true,
      documentIds: true,
      maxChunks: true,
    },
  }) as KnowledgeSkillRow[]

  if (skills.length === 0) return []

  const queryLower = query.toLowerCase()

  // Tier 1: Keyword matching (fast, free)
  const keywordMatches: MatchedSkill[] = []

  for (const skill of skills) {
    let keywordScore = 0

    for (const keyword of skill.keywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        keywordScore += 1
      }
    }

    if (keywordScore > 0) {
      keywordMatches.push({
        id: skill.id,
        name: skill.name,
        nameEn: skill.nameEn,
        category: skill.category,
        documentIds: skill.documentIds,
        maxChunks: skill.maxChunks,
        score: keywordScore + skill.priority * 0.1,
        matchType: 'keyword',
      })
    }
  }

  // Sort keyword matches by score
  keywordMatches.sort((a, b) => b.score - a.score)

  // If we have enough keyword matches or keywordOnly mode, return early
  if (keywordMatches.length >= 2 || keywordOnly) {
    return keywordMatches.slice(0, maxSkills)
  }

  // Tier 2: Embedding similarity (only if keyword matching found < 2 results)
  try {
    const { embedding: queryEmbedding } = await generateEmbedding(query, openaiKey)
    const validatedEmbedding = queryEmbedding.map((val, idx) => {
      const num = Number(val)
      if (!Number.isFinite(num)) {
        throw new Error(`Invalid embedding value at index ${idx}`)
      }
      return num
    })
    const embeddingArray = `[${validatedEmbedding.join(',')}]`

    // Query skill embeddings using cosine similarity
    const EMBEDDING_THRESHOLD = 0.80

    let embeddingResults: { id: string; similarity: number }[]
    try {
      embeddingResults = await prisma.$queryRawUnsafe<{ id: string; similarity: number }[]>(
        `SELECT id, 1 - (embedding <=> $1::extensions.vector) as similarity
         FROM "KnowledgeSkill"
         WHERE "isActive" = true
           AND embedding IS NOT NULL
           AND 1 - (embedding <=> $1::extensions.vector) > $2
         ORDER BY embedding <=> $1::extensions.vector
         LIMIT $3`,
        embeddingArray,
        EMBEDDING_THRESHOLD,
        maxSkills
      )
    } catch {
      // Fallback to unqualified vector type
      embeddingResults = await prisma.$queryRawUnsafe<{ id: string; similarity: number }[]>(
        `SELECT id, 1 - (embedding <=> $1::vector) as similarity
         FROM "KnowledgeSkill"
         WHERE "isActive" = true
           AND embedding IS NOT NULL
           AND 1 - (embedding <=> $1::vector) > $2
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        embeddingArray,
        EMBEDDING_THRESHOLD,
        maxSkills
      )
    }

    // Merge embedding matches with keyword matches (deduplicating)
    const matchedIds = new Set(keywordMatches.map(m => m.id))

    for (const result of embeddingResults) {
      if (matchedIds.has(result.id)) continue

      const skill = skills.find(s => s.id === result.id)
      if (!skill) continue

      keywordMatches.push({
        id: skill.id,
        name: skill.name,
        nameEn: skill.nameEn,
        category: skill.category,
        documentIds: skill.documentIds,
        maxChunks: skill.maxChunks,
        score: result.similarity,
        matchType: 'embedding',
      })
    }
  } catch (error) {
    logger.warn('Embedding matching failed for knowledge skills, using keyword results only', {}, error)
  }

  // Re-sort by score and limit
  keywordMatches.sort((a, b) => b.score - a.score)
  return keywordMatches.slice(0, maxSkills)
}

/**
 * Fetch document chunks for matched skills and build context string.
 */
export async function fetchSkillContext(
  query: string,
  matchedSkills: MatchedSkill[],
  openaiKey: string,
): Promise<{ context: string; skillsUsed: string[]; chunksUsed: number }> {
  if (matchedSkills.length === 0) {
    return { context: '', skillsUsed: [], chunksUsed: 0 }
  }

  // Collect all document IDs from matched skills
  const allDocIds = matchedSkills.flatMap(s => s.documentIds)
  if (allDocIds.length === 0) {
    return { context: '', skillsUsed: matchedSkills.map(s => s.name), chunksUsed: 0 }
  }

  // Total max chunks across all matched skills
  const totalMaxChunks = matchedSkills.reduce((sum, s) => sum + s.maxChunks, 0)

  try {
    const chunks = await searchSystemChunks(query, openaiKey, {
      matchThreshold: 0.75,
      matchCount: Math.min(totalMaxChunks, 9),
      documentIds: allDocIds,
    })

    if (chunks.length === 0) {
      return { context: '', skillsUsed: [], chunksUsed: 0 }
    }

    // Trim to token budget
    let totalChars = 0
    const selectedChunks: typeof chunks = []

    for (const chunk of chunks) {
      if (totalChars + chunk.content.length > MAX_SKILL_CONTEXT_CHARS) break
      selectedChunks.push(chunk)
      totalChars += chunk.content.length
    }

    if (selectedChunks.length === 0) {
      return { context: '', skillsUsed: [], chunksUsed: 0 }
    }

    // Get document names for attribution
    const docIds = Array.from(new Set(selectedChunks.map(c => c.documentId)))
    const docs = await prisma.coachDocument.findMany({
      where: { id: { in: docIds } },
      select: { id: true, name: true },
    })
    const docMap = new Map(docs.map(d => [d.id, d.name]))

    // Determine which skills actually contributed
    const contributingDocIds = new Set(selectedChunks.map(c => c.documentId))
    const activeSkills = matchedSkills.filter(s =>
      s.documentIds.some(id => contributingDocIds.has(id))
    )

    const context = `
## EXPERTKUNSKAP (automatiskt hämtad)
Följande expertkunskap är relevant för frågan:

${selectedChunks.map((c) => `### ${docMap.get(c.documentId) || 'Kunskapskälla'} (${(c.similarity * 100).toFixed(0)}% relevans)
${c.content}
`).join('\n')}
---
`

    return {
      context,
      skillsUsed: activeSkills.map(s => s.name),
      chunksUsed: selectedChunks.length,
    }
  } catch (error) {
    logger.warn('Error fetching skill context chunks', {}, error)
    return { context: '', skillsUsed: [], chunksUsed: 0 }
  }
}
